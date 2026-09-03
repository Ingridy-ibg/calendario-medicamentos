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
