## ADDED Requirements

### Requirement: A resposta à notificação é registrada em qualquer estado do app
Uma ação tocada numa notificação de dose ("tomei agora", "adiar" ou "não tomar") SHALL ser aplicada à dose correspondente, seja qual for o estado do app no momento do toque: aberto em primeiro plano, em segundo plano ou completamente fechado (inclusive depois de ter sido removido da lista de recentes).

#### Scenario: App fechado
- **WHEN** o app está fechado e o usuário toca em "Tomei agora" na notificação de uma dose
- **THEN** a dose fica registrada como tomada, com o horário do toque, e aparece assim na próxima vez que a agenda for aberta

#### Scenario: App em segundo plano
- **WHEN** o app está em segundo plano e o usuário toca em "Não tomar" na notificação de uma dose comum
- **THEN** a dose fica registrada como pulada e nenhuma nova notificação é enviada para ela

#### Scenario: App aberto
- **WHEN** o app está aberto na agenda e o usuário toca em "Adiar" na notificação de uma dose comum
- **THEN** a próxima notificação dessa dose é agendada para 30 minutos depois, e a dose continua pendente

### Requirement: Telas abertas refletem a resposta na hora
Quando uma resposta a uma notificação é aplicada com o app aberto, a agenda diária e as demais telas visíveis SHALL mostrar o novo estado da dose sem que o usuário precise trocar de tela ou reabrir o app.

#### Scenario: Confirmando pela notificação com a agenda aberta
- **WHEN** a agenda diária está visível e o usuário toca em "Tomei agora" na notificação de uma dose que aparece nela
- **THEN** a dose aparece como tomada na agenda logo em seguida

### Requirement: A mesma resposta nunca é aplicada duas vezes
O sistema SHALL aplicar no máximo uma vez cada resposta a uma notificação. Uma resposta que chega para uma dose já resolvida (tomada, pulada ou perdida) SHALL ser ignorada, sem alterar o status, o horário de confirmação nem o estoque.

#### Scenario: Resposta repetida
- **WHEN** a mesma ação "tomei agora" de uma notificação é entregue ao app duas vezes
- **THEN** a dose é registrada como tomada uma única vez e o estoque é descontado uma única vez
