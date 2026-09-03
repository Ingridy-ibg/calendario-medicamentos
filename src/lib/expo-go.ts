import Constants, { AppOwnership } from 'expo-constants';

/**
 * `expo-notifications` (e transitivamente `expo-task-manager`/`expo-background-task`)
 * lançam uma exceção só de serem IMPORTADOS dentro do Expo Go no Android a
 * partir do SDK 53 — o suporte a notificação remota foi removido do próprio
 * app do Expo Go, e o módulo já falha no carregamento, antes mesmo de
 * qualquer chamada. Não existe um jeito de "capturar" isso com try/catch,
 * porque o `import` estático é avaliado antes de qualquer código do módulo
 * rodar — por isso todo consumidor de `@/notifications` precisa checar isto
 * ANTES de fazer um `import()` dinâmico daquele módulo, nunca com um import
 * estático no topo do arquivo. Ver https://docs.expo.dev/develop/development-builds/introduction/.
 */
export const isExpoGo = Constants.appOwnership === AppOwnership.Expo;
