import { addDays, startOfDay } from 'date-fns';

import { contarDosesRegistradasNoIntervalo, listarDosesDoIntervalo } from '@/db/repositories/doses';
import { listarEsquemasAtivos, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { StatusDose } from '@/db/schema';
import { calcularStatusDoDia } from '@/domain/dose-scheduling/ciclico';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';
import { temAlertaDeRecompra } from '@/domain/medication-stock/alerta';

export interface ItemAgendaDose {
  tipo: 'dose';
  doseId: string;
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  horario: Date | null;
  status: StatusDose;
  /** Quando a dose foi resolvida (ex.: horário real de uma tomada com atraso). */
  horarioRegistro: Date | null;
  /** Só para CICLICO com dose hoje — dia de pausa não tem dose para confirmar (ver `dose-scheduling/ciclico.ts`). */
  posicaoCiclo: { dia: number; totalDiasAtivos: number } | null;
  alertaEstoque: boolean;
}

export interface ItemAgendaSeNecessario {
  tipo: 'se_necessario';
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  registradasHoje: number;
  limiteDiario: number;
  alertaEstoque: boolean;
}

/**
 * Cíclico sem ciclo em andamento (recém-cadastrado ou depois do fim da
 * pausa): não tem linha em `doses`, mas precisa aparecer para o usuário
 * iniciar a nova cartela (change fix-cyclic-and-rolling-window).
 */
export interface ItemAgendaAguardandoCartela {
  tipo: 'aguardando_cartela';
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  /** Hoje no horário do ciclo — define a seção (manhã/tarde/noite) e a ordem. */
  horario: Date | null;
  alertaEstoque: boolean;
}

export type ItemAgenda = ItemAgendaDose | ItemAgendaSeNecessario | ItemAgendaAguardandoCartela;

/**
 * Monta a agenda diária (specs/agenda-views): toda dose com horário previsto
 * hoje, na ordem do horário, seguida dos medicamentos "se necessário" (sem
 * horário, sempre disponíveis para registrar). Um medicamento de duração
 * fixa já encerrada simplesmente não tem linha de dose hoje — o motor de
 * agendamento nunca a materializa (ver `dose-scheduling/duracao.ts`), então
 * ele já sai da agenda sem nenhum filtro extra aqui.
 */
export function montarAgendaDoDia(db: AppDb, hoje: Date): ItemAgenda[] {
  const inicioDoDia = startOfDay(hoje);
  const fimDoDia = addDays(inicioDoDia, 1);

  const esquemas = listarEsquemasAtivos(db);
  const esquemasPorId = new Map(esquemas.map((esquema) => [esquema.id, esquema]));

  const itensDose: ItemAgendaDose[] = listarDosesDoIntervalo(db, inicioDoDia, fimDoDia).flatMap((dose) => {
    const esquema = esquemasPorId.get(dose.esquemaId);
    if (!esquema) return [];
    const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
    if (!medicamento || medicamento.deletedAt) return [];

    return [
      {
        tipo: 'dose' as const,
        doseId: dose.id,
        esquemaId: esquema.id,
        medicamentoId: medicamento.id,
        nome: medicamento.nome,
        dosagem: medicamento.dosagem,
        horario: dose.dataHoraPrevista,
        status: dose.status,
        horarioRegistro: dose.dataHoraRegistro,
        posicaoCiclo:
          esquema.tipo === 'CICLICO' && dose.numeroNoCiclo !== null
            ? { dia: dose.numeroNoCiclo, totalDiasAtivos: esquema.diasAtivos ?? 0 }
            : null,
        alertaEstoque: temAlertaDeRecompra(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem),
      },
    ];
  });

  const itensSeNecessario: ItemAgendaSeNecessario[] = esquemas
    .filter((esquema) => esquema.tipo === 'SE_NECESSARIO')
    .flatMap((esquema) => {
      const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
      if (!medicamento || medicamento.deletedAt) return [];

      return [
        {
          tipo: 'se_necessario' as const,
          esquemaId: esquema.id,
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          dosagem: medicamento.dosagem,
          registradasHoje: contarDosesRegistradasNoIntervalo(db, esquema.id, inicioDoDia, fimDoDia),
          limiteDiario: esquema.limiteDiario ?? 0,
          alertaEstoque: temAlertaDeRecompra(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem),
        },
      ];
    });

  const itensAguardandoCartela: ItemAgendaAguardandoCartela[] = esquemas
    .filter((esquema) => esquema.tipo === 'CICLICO')
    .flatMap((linha) => {
      const esquema = paraEsquemaDominio(linha);
      if (esquema.tipo !== 'CICLICO' || calcularStatusDoDia(esquema, hoje).fase !== 'em_espera') return [];
      const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
      if (!medicamento || medicamento.deletedAt) return [];
      const [horario] = esquema.horarios;

      return [
        {
          tipo: 'aguardando_cartela' as const,
          esquemaId: esquema.id,
          medicamentoId: medicamento.id,
          nome: medicamento.nome,
          dosagem: medicamento.dosagem,
          horario: horario ? combinarDataEHorario(inicioDoDia, horario) : null,
          alertaEstoque: temAlertaDeRecompra(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem),
        },
      ];
    });

  itensDose.sort((a, b) => (a.horario?.getTime() ?? 0) - (b.horario?.getTime() ?? 0));
  itensSeNecessario.sort((a, b) => a.nome.localeCompare(b.nome));

  return [...itensDose, ...itensAguardandoCartela, ...itensSeNecessario];
}
