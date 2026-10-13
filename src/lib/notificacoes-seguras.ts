import type { AppDb } from '@/db/repositories/types';

import { isExpoGo } from './expo-go';

/**
 * Roda o reconciliador de notificações (src/notifications) só fora do Expo
 * Go — importa `@/notifications` dinamicamente, nunca no topo do arquivo,
 * porque o próprio import de `expo-notifications` já lança uma exceção
 * dentro do Expo Go (ver `expo-go.ts`). Sem efeito nenhum dentro do Expo Go.
 */
export async function reconciliarNotificacoesSeDisponivel(db: AppDb): Promise<void> {
  if (isExpoGo) return;
  const { reconciliarNotificacoes } = await import('@/notifications');
  await reconciliarNotificacoes(db);
}

/**
 * Diz se a abertura atual veio de um toque numa notificação e "consome" essa
 * resposta, para que a próxima abertura comum não seja confundida com ela
 * (add-daily-greeting: a saudação não aparece quando o app abre por
 * notificação). Sempre `false` no Expo Go.
 */
export async function consumirAberturaPorNotificacao(): Promise<boolean> {
  if (isExpoGo) return false;
  const { getLastNotificationResponse, clearLastNotificationResponseAsync } = await import('expo-notifications');
  if (!getLastNotificationResponse()) return false;
  await clearLastNotificationResponseAsync();
  return true;
}
