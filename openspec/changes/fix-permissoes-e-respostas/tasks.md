## 1. Diagnóstico

- [ ] 1.1 Reproduzir no aparelho: com o app fechado, tocar "Tomei agora" numa notificação com `adb logcat | grep -i -E "ReactNativeJS|expo|TaskManager"` rodando. Registrar no PR se aparece erro de tarefa não definida. Verificar: log anexado e hipótese confirmada ou descartada

## 2. Permissões só na boas-vindas

- [x] 2.1 Remover o parâmetro `pedirPermissoes` e a chamada a `solicitarPermissoesEssenciais` de `inicializarNotificacoes`, e ajustar a chamada em `src/app/_layout.tsx`. Verificar: `npx tsc --noEmit` passa e abrir o app duas vezes seguidas não abre nenhuma tela de Configurações
- [x] 2.2 Remover `solicitarIsencaoOtimizacaoBateria` de `permissoes.ts` e do pedido essencial, e tirar `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` do `app.json`. Verificar: `grep -r BATTERY src app.json` não encontra nada
- [x] 2.3 Atualizar os comentários de `permissoes.ts`, `inicializar.ts` e `boas-vindas.tsx` que citam o pedido na abertura e a bateria. Verificar: revisão do diff

## 3. Respostas em qualquer estado do app

- [x] 3.1 Criar `index.ts` na raiz que, fora do Expo Go, carrega `src/notifications/tarefas` e depois importa `expo-router/entry`, e apontar o `main` do `package.json` para ele. Verificar: `npx expo start` sobe o app normalmente, inclusive no Expo Go
- [x] 3.2 Tornar `processarResposta` idempotente (só agir com a dose `pendente` ou `aguardando`) e exportá-la. Verificar: novo teste em `src/notifications` ou no domínio mostrando que uma segunda chamada não muda status nem estoque
- [x] 3.3 Registrar `addNotificationResponseReceivedListener` na inicialização das notificações, chamando `processarResposta`, e processar a resposta de abertura a frio antes de `consumirAberturaPorNotificacao` limpá-la. Verificar: com o app aberto, "Adiar" agenda a próxima notificação para +30 min
- [x] 3.4 Criar o contador `versaoDados` (Zustand), incrementá-lo depois de processar uma resposta e incluí-lo nas dependências de `recarregar` da agenda, calendário, lista e detalhe. Verificar: com a agenda aberta, "Tomei agora" na notificação muda a dose na tela sem navegar

## 4. Validação no aparelho

- [ ] 4.1 Gerar um APK novo (`eas build --profile preview`) e testar os três estados (aberto, segundo plano, fechado pela lista de recentes) com "Tomei agora", "Adiar" e "Não tomar". Verificar: as três ações refletem na agenda em todos os estados, e nenhuma tela de permissão aparece ao reabrir
- [x] 4.2 Rodar `npx vitest run` e `npx tsc --noEmit`. Verificar: ambos passam
