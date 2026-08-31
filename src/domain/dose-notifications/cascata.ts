import { addMinutes } from 'date-fns';

import type { Criticidade } from '@/db/schema';

import { INTERVALO_REENVIO_MINUTOS, LIMITE_NOTIFICACOES_COMUM } from './types';

export interface DecisaoEntrega {
  /** Total de notificações já entregues para esta dose, incluindo a que acabou de disparar. */
  notificacoesSemResposta: number;
  /**
   * Quando a próxima notificação desta dose deveria disparar. Para comum no
   * limite, não existe uma próxima notificação de fato — este valor vira
   * apenas o prazo a partir do qual a dose deve ser considerada perdida caso
   * ninguém responda (ver `fecharDosesVencidas`), sem que nada seja mostrado.
   */
  proximaNotificacaoEm: Date;
  /** Falso somente quando um comum acabou de atingir o limite de 4. */
  agendarProximoAlarme: boolean;
}

/**
 * Chamada exatamente uma vez a cada notificação de dose efetivamente
 * ENTREGUE (evento de recebimento do expo-notifications — ver design.md:
 * "reagenda a partir dos listeners de resposta/recebimento"), com `agora`
 * igual ao horário real dessa entrega. Não há nada a esperar: a decisão
 * sobre a próxima notificação depende só da criticidade e de quantas já
 * foram entregues, então é tomada de imediato, na própria entrega — nenhuma
 * informação nova chega durante os 30 minutos de silêncio em si.
 *
 * Importante: isto NUNCA decide "perdida" diretamente. Um comum que acabou
 * de atingir a 4ª notificação ainda tem os seus próprios 30 minutos de
 * janela de aceite — só depois de esse prazo se esgotar (verificado, mais
 * tarde, por `fecharDosesVencidas`) é que a dose vira perdida. Decidir aqui,
 * na hora da 4ª entrega, fecharia a janela cedo demais.
 */
export function decidirAposEntrega(
  criticidade: Criticidade,
  notificacoesSemRespostaAntes: number,
  agora: Date,
): DecisaoEntrega {
  const notificacoesSemResposta = notificacoesSemRespostaAntes + 1;

  return {
    notificacoesSemResposta,
    proximaNotificacaoEm: addMinutes(agora, INTERVALO_REENVIO_MINUTOS),
    agendarProximoAlarme: precisaDeProximoAlarme(criticidade, notificacoesSemResposta),
  };
}

/**
 * Falso apenas para um comum que já atingiu as 4 notificações — usado tanto
 * por `decidirAposEntrega` (decidir se agenda a próxima) quanto pelo
 * reconciliador (decidir se uma dose "aguardando" ainda merece um alarme
 * real do SO, ou só o prazo de silêncio da varredura preguiçosa — ver
 * `prazoDeSilencioExpirou`/`fecharDosesVencidas`).
 */
export function precisaDeProximoAlarme(criticidade: Criticidade, notificacoesSemResposta: number): boolean {
  return criticidade !== 'comum' || notificacoesSemResposta < LIMITE_NOTIFICACOES_COMUM;
}

/**
 * O "adiar" explícito NUNCA conta no limite de reenvio (specs/dose-notifications)
 * — por isso não incrementa `notificacoesSemResposta`, ao contrário de uma
 * entrega. Disponível apenas para medicamentos comuns (ver `acoesDisponiveis`),
 * e nunca tem limite — reagenda sempre.
 */
export function adiarNotificacao(notificacoesSemResposta: number, agora: Date): { proximaNotificacaoEm: Date; notificacoesSemResposta: number } {
  return {
    proximaNotificacaoEm: addMinutes(agora, INTERVALO_REENVIO_MINUTOS),
    notificacoesSemResposta,
  };
}

/**
 * Verdadeiro quando uma dose comum "aguardando" já passou do prazo da sua
 * última notificação sem ter sido resolvida, e essa notificação já era a 4ª
 * — ou seja, o silêncio da última janela de aceite se confirmou. Usado pela
 * varredura preguiçosa (`fecharDosesVencidas`) que de fato aplica a
 * transição para perdida, já que nada no app roda exatamente no instante em
 * que o prazo se esgota (ver `decidirAposEntrega`).
 */
export function prazoDeSilencioExpirou(
  criticidade: Criticidade,
  notificacoesSemResposta: number,
  proximaNotificacaoEm: Date,
  agora: Date,
): boolean {
  return criticidade === 'comum' && notificacoesSemResposta >= LIMITE_NOTIFICACOES_COMUM && proximaNotificacaoEm <= agora;
}
