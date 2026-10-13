/**
 * Entrada do app. A tarefa que aplica as respostas das notificações precisa
 * estar definida em qualquer inicialização do JS — inclusive a sem interface,
 * quando o Android acorda o app fechado só para entregar a ação tocada. Nessa
 * hora o expo-router não avalia o layout, então ela é carregada aqui, antes
 * do router (fix-permissoes-e-respostas, design.md).
 *
 * `require` em vez de `import` para garantir a ordem (imports são içados) e
 * para não carregar `expo-notifications` no Expo Go, onde ele lança exceção
 * só de ser importado (ver `src/lib/expo-go.ts`).
 */
const { isExpoGo } = require('./src/lib/expo-go') as typeof import('./src/lib/expo-go');

if (!isExpoGo) {
  require('./src/notifications/tarefas');
}

require('expo-router/entry');
