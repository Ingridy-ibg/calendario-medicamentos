import { setNotificationCategoryAsync } from 'expo-notifications';

import { ACOES_NOTIFICACAO, CATEGORIAS_NOTIFICACAO } from '@/domain/dose-notifications/types';

const TITULOS: Record<(typeof ACOES_NOTIFICACAO)[number], string> = {
  tomei_agora: 'Tomei agora',
  adiar: 'Adiar 30 min',
  nao_tomar: 'Não tomar',
};

/**
 * Uma categoria por conjunto de ações (specs/dose-notifications): comum tem
 * as três ações, especial só "tomei agora" — sem pular, sem adiar.
 * `opensAppToForeground: false` mantém a resposta em segundo plano (tratada
 * pela tarefa registrada em `tarefas.ts`), sem forçar a abertura do app.
 */
export async function configurarCategoriasAcao(): Promise<void> {
  await setNotificationCategoryAsync(CATEGORIAS_NOTIFICACAO.comum, [
    { identifier: 'tomei_agora', buttonTitle: TITULOS.tomei_agora, options: { opensAppToForeground: false } },
    { identifier: 'adiar', buttonTitle: TITULOS.adiar, options: { opensAppToForeground: false } },
    {
      identifier: 'nao_tomar',
      buttonTitle: TITULOS.nao_tomar,
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);

  await setNotificationCategoryAsync(CATEGORIAS_NOTIFICACAO.especial, [
    { identifier: 'tomei_agora', buttonTitle: TITULOS.tomei_agora, options: { opensAppToForeground: false } },
  ]);
}
