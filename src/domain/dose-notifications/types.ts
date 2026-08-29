import type { Criticidade } from '@/db/schema';

export const INTERVALO_REENVIO_MINUTOS = 30;
export const LIMITE_NOTIFICACOES_COMUM = 4;

/** Ação escolhida pelo usuário a partir de uma notificação de dose comum ou especial. */
export const ACOES_NOTIFICACAO = ['tomei_agora', 'adiar', 'nao_tomar'] as const;
export type AcaoNotificacao = (typeof ACOES_NOTIFICACAO)[number];

/** Ações oferecidas por criticidade (specs/dose-notifications). Especial nunca tem "não tomar" nem "adiar". */
export function acoesDisponiveis(criticidade: Criticidade): AcaoNotificacao[] {
  return criticidade === 'especial' ? ['tomei_agora'] : ['tomei_agora', 'adiar', 'nao_tomar'];
}

export interface DoseParaNotificar {
  id: string;
  esquemaId: string;
  dataHoraPrevista: Date | null;
  status: 'pendente' | 'aguardando';
  notificacoesSemResposta: number;
  proximaNotificacaoEm: Date;
}

/**
 * Um canal por estilo de apresentação (specs/dose-notifications): "comum" é
 * padrão, "especial" é crítico/estilo alarme, e o lembrete de pausa de ciclo
 * é sempre leve — mesmo para um cíclico especial (nunca usa o canal crítico).
 * `estoque-baixo` é o quarto canal citado em design.md (fase de estoque).
 */
export const CANAIS_NOTIFICACAO = {
  doseComum: 'dose-comum',
  doseEspecialCritico: 'dose-especial-critico',
  pausaCiclo: 'pausa-ciclo',
  estoqueBaixo: 'estoque-baixo',
} as const;
export type CanalNotificacao = (typeof CANAIS_NOTIFICACAO)[keyof typeof CANAIS_NOTIFICACAO];

/** Canal de uma notificação de dose (nunca do lembrete de pausa, que é sempre leve). */
export function canalParaDose(criticidade: Criticidade): CanalNotificacao {
  return criticidade === 'especial' ? CANAIS_NOTIFICACAO.doseEspecialCritico : CANAIS_NOTIFICACAO.doseComum;
}

/**
 * Categorias de ação (`setNotificationCategoryAsync`), uma por conjunto de
 * ações disponível (ver `acoesDisponiveis`). O lembrete de pausa não usa
 * categoria — é sem ação.
 */
export const CATEGORIAS_NOTIFICACAO = {
  comum: 'dose-comum-acoes',
  especial: 'dose-especial-acoes',
} as const;

export function categoriaParaDose(criticidade: Criticidade): string {
  return criticidade === 'especial' ? CATEGORIAS_NOTIFICACAO.especial : CATEGORIAS_NOTIFICACAO.comum;
}
