import { addDays, startOfDay } from 'date-fns';

import { contarDosesRegistradasNoIntervalo, listarDosesDoIntervalo } from '@/db/repositories/doses';
import { listarEsquemasAtivos, listarEsquemasNaoRemovidos, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { StatusDose } from '@/db/schema';
import { estaAtrasada } from '@/domain/adherence-history/classificacao';
import { calcularStatusDoDia } from '@/domain/dose-scheduling/ciclico';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';
import { type AlertaEstoque, alertaVisivelNaLista } from '@/domain/medication-stock/alerta';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';

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
  /** Não resolvida e mais de 30 min depois do horário (fix-late-and-calendar-status). */
  atrasada: boolean;
  /** Só para CICLICO com dose hoje — dia de pausa não tem dose para confirmar (ver `dose-scheduling/ciclico.ts`). */
  posicaoCiclo: { dia: number; totalDiasAtivos: number } | null;
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
}

export interface ItemAgendaSeNecessario {
  tipo: 'se_necessario';
  esquemaId: string;
  medicamentoId: string;
  nome: string;
  dosagem: string;
  registradasHoje: number;
  limiteDiario: number;
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
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
  /** Estoque insuficiente, baixo ou baixo leve (a sobra só aparece no detalhe). */
  alertaEstoque: AlertaEstoque;
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

  // "Se necessário" e "aguardando nova cartela" só na agenda; as doses de hoje
  // vêm de todo esquema não removido, para que as já resolvidas de um
  // medicamento retirado da agenda continuem aparecendo, como no calendário
  // (fix-agenda-membership-review). Retirar apaga as não resolvidas, então
  // de um fora da agenda só sobram resolvidas.
  const esquemas = listarEsquemasAtivos(db);
  const esquemasPorId = new Map(listarEsquemasNaoRemovidos(db).map((esquema) => [esquema.id, esquema]));

  // Um alerta por esquema (um esquema pode ter várias doses hoje); `hoje` é o "agora" de quem abre a agenda.
  const alertas = new Map<string, AlertaEstoque>();
  const alertaDe = (linha: (typeof esquemas)[number], medicamento: { quantidadeEmEstoque: number; quantidadePorEmbalagem: number; naAgenda: boolean }) => {
    if (!alertas.has(linha.id)) {
      alertas.set(linha.id, alertaVisivelNaLista(alertaEstoqueDoMedicamento(db, paraEsquemaDominio(linha), medicamento, hoje)));
    }
    return alertas.get(linha.id) ?? null;
  };

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
        atrasada: estaAtrasada(dose, hoje),
        posicaoCiclo:
          esquema.tipo === 'CICLICO' && dose.numeroNoCiclo !== null
            ? { dia: dose.numeroNoCiclo, totalDiasAtivos: esquema.diasAtivos ?? 0 }
            : null,
        alertaEstoque: alertaDe(esquema, medicamento),
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
          alertaEstoque: alertaDe(esquema, medicamento),
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
          alertaEstoque: alertaDe(linha, medicamento),
        },
      ];
    });

  itensDose.sort((a, b) => (a.horario?.getTime() ?? 0) - (b.horario?.getTime() ?? 0));
  itensSeNecessario.sort((a, b) => a.nome.localeCompare(b.nome));

  return [...itensDose, ...itensAguardandoCartela, ...itensSeNecessario];
}
