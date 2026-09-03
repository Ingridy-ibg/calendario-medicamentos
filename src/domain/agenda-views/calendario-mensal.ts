import { addDays, addHours, addMonths, startOfDay, startOfMonth } from 'date-fns';

import { buscarProximaDoseAtiva, listarDosesDoIntervalo } from '@/db/repositories/doses';
import { type EsquemaRow, listarEsquemasAtivos, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { StatusDose } from '@/db/schema';
import { calcularStatusDoDia } from '@/domain/dose-scheduling/ciclico';
import { gerarDosesDiario } from '@/domain/dose-scheduling/diario';
import { gerarDosesDiasSemana } from '@/domain/dose-scheduling/dias-semana';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';

export interface ItemDiaHistorico {
  tipo: 'historico';
  medicamentoId: string;
  nome: string;
  horario: Date | null;
  status: StatusDose;
}

/** `estimado` só é verdadeiro para intervalo em horas — os demais tipos futuros são definitivos (specs/agenda-views). */
export interface ItemDiaPrevisto {
  tipo: 'previsto';
  medicamentoId: string;
  nome: string;
  horario: Date;
  estimado: boolean;
}

export interface ItemDiaPausaCiclo {
  tipo: 'pausa-ciclo';
  medicamentoId: string;
  nome: string;
}

export type ItemDiaCalendario = ItemDiaHistorico | ItemDiaPrevisto | ItemDiaPausaCiclo;

export interface DiaCalendario {
  dia: Date;
  itens: ItemDiaCalendario[];
}

type Medicamento = NonNullable<ReturnType<typeof buscarMedicamentoPorId>>;

function adicionarItem(dias: Map<number, DiaCalendario>, data: Date, item: ItemDiaCalendario) {
  dias.get(startOfDay(data).getTime())?.itens.push(item);
}

function preencherFuturoDoEsquema(
  db: AppDb,
  dias: Map<number, DiaCalendario>,
  esquemaRow: EsquemaRow,
  medicamento: Medicamento,
  de: Date,
  ate: Date,
) {
  const esquema = paraEsquemaDominio(esquemaRow);

  switch (esquema.tipo) {
    case 'SE_NECESSARIO':
      // specs/agenda-views: nunca aparece com doses previstas em dias futuros.
      return;

    case 'DIARIO':
      for (const gerada of gerarDosesDiario(esquema, de, ate)) {
        adicionarItem(dias, gerada.dataHoraPrevista, {
          tipo: 'previsto',
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          horario: gerada.dataHoraPrevista,
          estimado: false,
        });
      }
      return;

    case 'DIAS_SEMANA':
      for (const gerada of gerarDosesDiasSemana(esquema, de, ate)) {
        adicionarItem(dias, gerada.dataHoraPrevista, {
          tipo: 'previsto',
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          horario: gerada.dataHoraPrevista,
          estimado: false,
        });
      }
      return;

    case 'CICLICO': {
      let dia = startOfDay(de);
      const fim = startOfDay(ate);
      const [horario] = esquema.horarios;
      while (dia < fim) {
        const status = calcularStatusDoDia(esquema, dia);
        if (status.fase === 'ativo') {
          adicionarItem(dias, dia, {
            tipo: 'previsto',
            medicamentoId: medicamento.id,
            nome: medicamento.nome,
            horario: combinarDataEHorario(dia, horario),
            estimado: false,
          });
        } else if (status.fase === 'pausa') {
          adicionarItem(dias, dia, { tipo: 'pausa-ciclo', medicamentoId: medicamento.id, nome: medicamento.nome });
        }
        dia = addDays(dia, 1);
      }
      return;
    }

    case 'INTERVALO_HORAS': {
      // Âncora: a única dose ainda não resolvida deste esquema (real, não
      // estimada). A partir dela, cada próxima é só uma projeção baseada no
      // intervalo configurado — o horário real só é conhecido quando cada
      // dose anterior é de fato confirmada (ver design.md).
      const ancora = buscarProximaDoseAtiva(db, esquema.id)?.dataHoraPrevista;
      if (!ancora) return; // esquema estagnado: duração terminou, ou cadeia parada por uma dose nunca confirmada.

      let horario = ancora;
      while (horario < ate && estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, horario)) {
        if (horario >= de) {
          adicionarItem(dias, horario, {
            tipo: 'previsto',
            medicamentoId: medicamento.id,
            nome: medicamento.nome,
            horario,
            estimado: true,
          });
        }
        horario = addHours(horario, esquema.intervaloHoras);
      }
      return;
    }
  }
}

/**
 * Monta o calendário mensal (specs/agenda-views): dias passados mostram o
 * histórico real de adesão já registrado (lido de `doses`); dias futuros —
 * hoje incluso, já que seu resultado do dia ainda está em aberto — mostram o
 * horário previsto, recalculado direto do esquema (não do que porventura já
 * foi materializado pela janela rolante), para que o mês inteiro possa ser
 * exibido mesmo além dessa janela.
 */
export function montarCalendarioMensal(db: AppDb, mesReferencia: Date, hoje: Date): DiaCalendario[] {
  const inicioMes = startOfMonth(mesReferencia);
  const fimMes = startOfMonth(addMonths(mesReferencia, 1));
  const inicioHoje = startOfDay(hoje);

  const dias = new Map<number, DiaCalendario>();
  for (let dia = inicioMes; dia < fimMes; dia = addDays(dia, 1)) {
    dias.set(dia.getTime(), { dia, itens: [] });
  }

  const esquemas = listarEsquemasAtivos(db);
  const esquemasPorId = new Map(esquemas.map((esquema) => [esquema.id, esquema]));
  const medicamentosPorId = new Map<string, Medicamento | null>();
  function medicamentoDoEsquema(esquemaRow: EsquemaRow): Medicamento | null {
    let medicamento = medicamentosPorId.get(esquemaRow.medicamentoId);
    if (medicamento === undefined) {
      medicamento = buscarMedicamentoPorId(db, esquemaRow.medicamentoId) ?? null;
      medicamentosPorId.set(esquemaRow.medicamentoId, medicamento);
    }
    return medicamento;
  }

  const fimHistorico = inicioHoje < fimMes ? inicioHoje : fimMes;
  if (inicioMes < fimHistorico) {
    for (const dose of listarDosesDoIntervalo(db, inicioMes, fimHistorico)) {
      const esquemaRow = esquemasPorId.get(dose.esquemaId);
      if (!esquemaRow) continue;
      const medicamento = medicamentoDoEsquema(esquemaRow);
      if (!medicamento) continue;

      adicionarItem(dias, dose.dataHoraPrevista!, {
        tipo: 'historico',
        medicamentoId: medicamento.id,
        nome: medicamento.nome,
        horario: dose.dataHoraPrevista,
        status: dose.status,
      });
    }
  }

  const inicioFuturo = inicioHoje > inicioMes ? inicioHoje : inicioMes;
  if (inicioFuturo < fimMes) {
    for (const esquemaRow of esquemas) {
      const medicamento = medicamentoDoEsquema(esquemaRow);
      if (!medicamento) continue;
      preencherFuturoDoEsquema(db, dias, esquemaRow, medicamento, inicioFuturo, fimMes);
    }
  }

  return [...dias.values()].sort((a, b) => a.dia.getTime() - b.dia.getTime());
}
