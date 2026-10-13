## Context

**Permissões.** `src/app/_layout.tsx` chama `inicializarNotificacoes({ pedirPermissoes })` em toda abertura, com `pedirPermissoes = boasVindasConcluida`. Depois do primeiro uso isso é sempre `true`, então `solicitarPermissoesEssenciais()` roda a cada abertura. O pedido de alarme exato não tem como saber se já foi concedido (o `expo-notifications` não expõe `canScheduleExactAlarms`), por isso abre a tela de Configurações sempre. Logo depois vem a tela de bateria.

**Respostas.** A tarefa que trata as respostas (`TaskManager.defineTask(TAREFA_NOTIFICACAO, …)`) fica no escopo de módulo de `src/notifications/tarefas.ts`. Esse módulo só é carregado por um `import('@/notifications')` dentro de um `useEffect` do layout raiz, depois das migrações.

Quando o Android entrega uma resposta com o app fechado, ele sobe o JS sem renderizar nenhuma tela. O expo-router não avalia `_layout.tsx`, a tarefa nunca é definida e a resposta é descartada. Também não existe `addNotificationResponseReceivedListener` em lugar nenhum, então o caminho com o app aberto depende só da tarefa de fundo.

Por fim, `confirmarDose`/`pularDose` não são idempotentes: uma segunda chamada resolveria de novo a dose e descontaria o estoque outra vez.

As telas recarregam só em `useFocusEffect` e na volta ao primeiro plano. Uma resposta aplicada com a agenda visível não aparece até a pessoa trocar de tela.

## Goals / Non-Goals

**Goals:**
- Zero pedidos automáticos de permissão fora da boas-vindas.
- Respostas registradas nos três estados do app, sem efeito duplicado.
- Agenda atualizada na hora quando a resposta chega com o app aberto.

**Non-Goals:**
- Consultar o estado real do alarme exato ou da tela cheia. Isso exige código nativo e vem com `alarme-tela-cheia`.
- Mudar a cascata de reenvio ou o registro de entrega (`processarEntrega`).

## Decisions

### 1. A inicialização nunca pede permissão

`inicializarNotificacoes` perde o parâmetro `pedirPermissoes`. O único chamador de `solicitarPermissoesEssenciais` passa a ser a boas-vindas, e quem chega por "Agora não" usa o Perfil.

*Alternativa considerada:* gravar uma flag "já pedi" e manter o pedido no layout. Foi descartada porque duplica a responsabilidade da boas-vindas e não resolve o caso "Agora não", em que o usuário pediu explicitamente para não ser incomodado.

### 2. Bateria removida por completo

Saem `solicitarIsencaoOtimizacaoBateria` e a permissão do manifest. Os alarmes do `expo-notifications` usam `setExactAndAllowWhileIdle`, que já dispara no Doze. A isenção só ajudaria a tarefa periódica, que é rede de segurança e não precisa ser pontual.

### 3. Arquivo de entrada próprio que define a tarefa antes do router

Um `index.ts` na raiz vira o `main` do `package.json`. Ele carrega o módulo das tarefas e em seguida importa `expo-router/entry`. Assim, `defineTask` roda em qualquer inicialização do JS, inclusive a sem interface.

O módulo das tarefas importa `expo-notifications`, que lança exceção no Expo Go. Por isso o carregamento é condicional: `if (!isExpoGo) require('./src/notifications/tarefas')`.

*Alternativa considerada:* importar `tarefas.ts` estaticamente no topo de `_layout.tsx`. Foi descartada porque o layout não é avaliado numa inicialização sem interface, que é exatamente o caso quebrado.

### 4. Ouvinte de resposta em primeiro plano, mesma função de processamento

O layout registra `addNotificationResponseReceivedListener` (via `@/notifications`, import dinâmico como hoje) chamando o mesmo `processarResposta` exportado de `tarefas.ts`. A resposta que abriu o app a frio é lida com `getLastNotificationResponse` e processada uma vez. Hoje `consumirAberturaPorNotificacao` limpa essa resposta antes de alguém processá-la; o processamento passa a acontecer antes da limpeza.

### 5. Idempotência pelo status da dose

`processarResposta` só age se a dose estiver `pendente` ou `aguardando`; caso contrário, retorna sem efeito. Isso cobre o caso em que tarefa e ouvinte recebem a mesma resposta, e respostas atrasadas para doses que já foram resolvidas no app.

O status não basta para o "adiar": a dose continua aberta depois dele, então a mesma resposta lida de novo (por exemplo, como "última resposta" ao reabrir o app) reagendaria outra vez. Por isso há também uma lista curta (50) das últimas respostas processadas no kv-store, com chave identificador + ação + horário de entrega. Ela é consultada antes de aplicar. Isso dispensa uma tabela nova: a lista é só um filtro de duplicatas, e o status da dose continua sendo a fonte de verdade.

### 6. Sinal de "dados mudaram" para as telas

Um contador num store Zustand (`versaoDados`), incrementado depois de processar uma resposta. A agenda, o calendário, a lista e o detalhe incluem esse valor nas dependências do `recarregar`. Hoje não há nenhum mecanismo reativo entre camadas, e esse é o menor que resolve.

## Risks / Trade-offs

- **[Risco] A causa das respostas perdidas ser outra (por exemplo, o Android não entregar a ação à tarefa).** → Mitigação: a tarefa 1.1 confirma o diagnóstico com `adb logcat` antes de qualquer mudança. As decisões 3 a 5 cobrem também o caminho com o app aberto, então ajudam mesmo que a hipótese principal falhe só em parte.
- **[Risco] O banco não estar migrado numa inicialização sem interface.** As migrações rodam no `useMigrations` do layout, mas um app já instalado sempre teve migrações aplicadas numa abertura anterior. → Mitigação: a resposta só existe se o app agendou a notificação antes, o que implica migrações aplicadas.
- **[Trade-off] Sem a isenção de bateria, alguns fabricantes (Xiaomi, Samsung com economia agressiva) podem atrasar a tarefa periódica.** Aceito, porque os alarmes de dose não dependem dela.
- **[Trade-off] Quem escolheu "Agora não" nunca mais é lembrado automaticamente das permissões.** Aceito por decisão de produto: o Perfil mostra o estado e oferece "Permitir".

## Migration Plan

Mudar o `main` e as permissões do `app.json` muda o fingerprint, então é preciso gerar um novo APK com `eas build --profile preview`. Não há migração de dados.
