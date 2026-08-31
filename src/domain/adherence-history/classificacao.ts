export const STATUS_FINAIS = ['tomada', 'tomada_com_atraso', 'pulada', 'perdida'] as const;
export type StatusFinal = (typeof STATUS_FINAIS)[number];

export type ClassificacaoResposta = 'tomada' | 'tomada_com_atraso';

/**
 * Classifica uma confirmação positiva ("tomei agora") conforme
 * specs/adherence-history: tomada com atraso se pelo menos uma notificação
 * de reenvio (a 2ª notificação em diante) já tiver disparado antes da
 * resposta; senão, tomada. Vale tanto para uma confirmação vinda de uma ação
 * de notificação (src/domain/dose-notifications) quanto, no futuro, de uma
 * confirmação manual feita direto na agenda — o único dado que importa é
 * quantas notificações já foram entregues para aquela dose.
 */
export function classificarResposta(notificacoesSemResposta: number): ClassificacaoResposta {
  return notificacoesSemResposta >= 2 ? 'tomada_com_atraso' : 'tomada';
}
