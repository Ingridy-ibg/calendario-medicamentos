import { db } from '@/db/client';
import type { Criticidade } from '@/db/schema';

import { isExpoGo } from './expo-go';
import { consumirPedidoTelaCheia } from './preferencias';

/** Depois de gravar: lembretes e, no primeiro especial, as permissões do alarme. */
export function aposSalvarMedicamento(criticidade: Criticidade) {
  if (isExpoGo) return;
  // Import dinâmico, nunca estático: só de importar `expo-notifications` já
  // lança uma exceção dentro do Expo Go (ver `lib/expo-go.ts`).
  const pedirPermissoes = consumirPedidoTelaCheia(criticidade);
  void import('@/notifications').then(({ reconciliarNotificacoes, solicitarPermissoesDoAlarme }) => {
    if (pedirPermissoes) {
      // Só no primeiro cadastro de um especial do aparelho, quando passam a
      // ser relevantes: tela cheia e, ao voltar dela, aparecer sobre outros apps.
      void solicitarPermissoesDoAlarme();
    }
    void reconciliarNotificacoes(db);
  });
}
