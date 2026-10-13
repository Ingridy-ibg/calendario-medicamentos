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
 * Um canal por estilo de apresentação (specs/dose-notifications). O canal de
 * um Android não muda depois de criado, por isso a vibração longa da dose
 * comum veio num id novo, `dose_comum_v2` (alarme-tela-cheia, design.md,
 * decisão 8). A dose especial não usa canal do `expo-notifications`: quem a
 * apresenta é o alarme nativo, no canal `alarme_especial`, criado pelo
 * módulo. O lembrete de pausa de ciclo é sempre leve, mesmo de um cíclico
 * especial.
 */
export const CANAIS_NOTIFICACAO = {
  doseComum: 'dose_comum_v2',
  alarmeEspecial: 'alarme_especial',
  pausaCiclo: 'pausa-ciclo',
  estoqueBaixo: 'estoque-baixo',
} as const;
export type CanalNotificacao = (typeof CANAIS_NOTIFICACAO)[keyof typeof CANAIS_NOTIFICACAO];

/** Canais de versões anteriores, apagados na inicialização (alarme-tela-cheia). */
export const CANAIS_REMOVIDOS = ['dose-comum', 'dose-especial-critico'] as const;

/** Padrão de vibração da dose comum: quatro pulsos longos (specs/dose-notifications). */
export const VIBRACAO_DOSE_COMUM = [0, 500, 250, 500, 250, 500, 250, 500];

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
