import { db } from '@/db/client';
import type { Criticidade } from '@/db/schema';

import { isExpoGo } from './expo-go';
import { consumirPedidoTelaCheia } from './preferencias';

/** Depois de gravar: lembretes e, no primeiro especial, a permissão de tela cheia. */
export function aposSalvarMedicamento(criticidade: Criticidade) {
  if (isExpoGo) return;
  // Import dinâmico, nunca estático: só de importar `expo-notifications` já
  // lança uma exceção dentro do Expo Go (ver `lib/expo-go.ts`).
  const pedirTelaCheia = consumirPedidoTelaCheia(criticidade);
  void import('@/notifications').then(({ reconciliarNotificacoes, solicitarPermissaoFullScreenIntent }) => {
    if (pedirTelaCheia) {
      // 5.2: pedida só no primeiro cadastro de um medicamento especial do
      // aparelho — é o ponto em que ela passa a ser relevante.
      void solicitarPermissaoFullScreenIntent();
    }
    void reconciliarNotificacoes(db);
  });
}
