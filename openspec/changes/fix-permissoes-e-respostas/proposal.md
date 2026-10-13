## Why

Testando o app num aparelho real, dois problemas tornam os lembretes inutilizáveis no dia a dia: toda abertura do app joga o usuário em duas telas de Configurações do Android (alarme exato e otimização de bateria), e tocar nas ações das notificações ("Tomei agora", "Adiar", "Não tomar") não registra nada no app. A primeira é irritante, e a segunda quebra a promessa central do produto.

## What Changes

- As permissões de lembrete passam a ser pedidas **uma única vez**: na boas-vindas, ao tocar "Ativar lembretes e começar". Nenhuma abertura posterior do app pede permissão automaticamente, nem mesmo depois de "Agora não". Quem quiser conceder depois usa o Perfil, que já tem os atalhos. **BREAKING** (comportamento): deixa de valer o pedido automático na abertura depois de "Agora não".
- A isenção de otimização de bateria deixa de ser pedida e sai do app, inclusive a permissão `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` declarada no `app.json`.
- As respostas às notificações de dose passam a ser registradas em qualquer situação do app: aberto, em segundo plano ou fechado. Hoje elas se perdem.
- Responder a uma notificação com o app aberto atualiza na hora a agenda e as demais telas visíveis.
- A mesma resposta processada duas vezes (por caminhos diferentes) não altera a dose de novo.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `onboarding`: o pedido das permissões essenciais deixa de incluir a otimização de bateria, e deixa de ser repetido nas aberturas seguintes.
- `dose-notifications`: nova exigência de que a resposta a uma notificação seja registrada com o app aberto, em segundo plano ou fechado, e que o processamento seja idempotente.

## Impact

- `src/app/_layout.tsx`: a inicialização das notificações não pede mais permissões, e passa a registrar o ouvinte de respostas com o app aberto.
- `src/notifications/inicializar.ts`, `permissoes.ts`, `tarefas.ts`, `index.ts`.
- Novo arquivo de entrada do app (`package.json` → `main`) que define a tarefa de resposta antes do expo-router.
- `src/app/boas-vindas.tsx`: pedido sem bateria.
- `app.json`: remove `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
- Mudar o `app.json` e o arquivo de entrada altera o fingerprint do runtime, então exige um novo build (APK), não só um EAS Update.
