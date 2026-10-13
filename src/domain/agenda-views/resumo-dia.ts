import type { StatusDose } from '@/db/schema';

import type { ItemAgenda, ItemAgendaAguardandoCartela, ItemAgendaDose, ItemAgendaSeNecessario } from './agenda-diaria';

export interface ResumoDoDia {
  /** Doses agendadas resolvidas como tomada ou tomada com atraso. */
  tomadas: number;
  /** Doses agendadas do dia — "se necessário" nunca entra na conta. */
  total: number;
  /** Status de cada dose agendada, na ordem do horário (uma marca por dose). */
  marcas: StatusDose[];
  /** Dose pendente/aguardando de menor horário, mesmo que já tenha passado. */
  proxima: ItemAgendaDose | null;
  /** Há doses agendadas e nenhuma ainda pendente ou aguardando. */
  concluido: boolean;
}

const NAO_RESOLVIDOS: StatusDose[] = ['pendente', 'aguardando'];

function doses(itens: ItemAgenda[]): ItemAgendaDose[] {
  return itens.filter((item): item is ItemAgendaDose => item.tipo === 'dose');
}

type ItemComHorario = ItemAgendaDose | ItemAgendaAguardandoCartela;

function horarioOuInicio(item: ItemComHorario): number {
  return item.horario?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/** Resumo da agenda de hoje (specs/agenda-views: "A agenda diária mostra um resumo do dia"). */
export function resumirDia(itens: ItemAgenda[]): ResumoDoDia {
  // `sort` estável: em empate de horário, vale a ordem da lista.
  const agendadas = [...doses(itens)].sort((a, b) => horarioOuInicio(a) - horarioOuInicio(b));
  const pendentes = agendadas.filter((item) => NAO_RESOLVIDOS.includes(item.status));

  return {
    tomadas: agendadas.filter((item) => item.status === 'tomada' || item.status === 'tomada_com_atraso').length,
    total: agendadas.length,
    marcas: agendadas.map((item) => item.status),
    proxima: pendentes[0] ?? null,
    concluido: agendadas.length > 0 && pendentes.length === 0,
  };
}

export type ChaveSecaoAgenda = 'manha' | 'tarde' | 'noite' | 'se_necessario';

export type SecaoAgenda =
  | { chave: 'manha' | 'tarde' | 'noite'; titulo: string; itens: ItemComHorario[] }
  | { chave: 'se_necessario'; titulo: string; itens: ItemAgendaSeNecessario[] };

const TITULOS: Record<ChaveSecaoAgenda, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  se_necessario: 'Se necessário',
};

function periodoDoHorario(horario: Date | null): 'manha' | 'tarde' | 'noite' {
  // Dose agendada sem horário não deveria existir; cai em "Manhã" para não sumir.
  if (!horario) return 'manha';
  const hora = horario.getHours();
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
}

/**
 * Agrupa a agenda (doses e cíclicos aguardando cartela) em Manhã (< 12:00), Tarde (< 18:00), Noite e "Se
 * necessário", nessa ordem, mantendo a ordem de horário dentro de cada uma e
 * omitindo seções vazias (specs/agenda-views).
 */
export function agruparPorPeriodo(itens: ItemAgenda[]): SecaoAgenda[] {
  // Cíclicos aguardando nova cartela entram na seção do horário do ciclo.
  const agendadas = itens
    .filter((item): item is ItemComHorario => item.tipo === 'dose' || item.tipo === 'aguardando_cartela')
    .sort((a, b) => horarioOuInicio(a) - horarioOuInicio(b));
  const secoes: SecaoAgenda[] = (['manha', 'tarde', 'noite'] as const).map((chave) => ({
    chave,
    titulo: TITULOS[chave],
    itens: agendadas.filter((item) => periodoDoHorario(item.horario) === chave),
  }));
  secoes.push({
    chave: 'se_necessario',
    titulo: TITULOS.se_necessario,
    itens: itens.filter((item): item is ItemAgendaSeNecessario => item.tipo === 'se_necessario'),
  });
  return secoes.filter((secao) => secao.itens.length > 0);
}
