## Purpose

Apresenta o aplicativo na primeira abertura e concentra, num momento explicado ao usuário, o pedido das permissões de notificação de que os lembretes dependem.

## ADDED Requirements

### Requirement: Boas-vindas na primeira abertura
Na primeira vez que o aplicativo é aberto num aparelho, o sistema SHALL exibir uma tela de boas-vindas antes da agenda diária, apresentando o propósito do app, seus principais recursos (lembretes que insistem até haver resposta, histórico de adesão no calendário, aviso de estoque baixo) e informando que os dados ficam salvos só no aparelho.

#### Scenario: Primeira abertura
- **WHEN** o usuário abre o app pela primeira vez após instalá-lo
- **THEN** a tela de boas-vindas é exibida no lugar da agenda diária

#### Scenario: Aberturas seguintes
- **WHEN** o usuário já concluiu a tela de boas-vindas e abre o app novamente
- **THEN** a agenda diária é exibida diretamente, sem passar pela boas-vindas

#### Scenario: App fechado durante a boas-vindas
- **WHEN** o usuário fecha o app na tela de boas-vindas sem escolher nenhuma opção
- **THEN** na próxima abertura a tela de boas-vindas é exibida de novo

### Requirement: Boas-vindas pede as permissões de notificação
A tela de boas-vindas SHALL oferecer duas opções: "Ativar lembretes e começar", que solicita as permissões essenciais de notificação (notificações, alarmes exatos e isenção de otimização de bateria) e depois abre a agenda diária; e "Agora não", que abre a agenda diária sem solicitar permissões. Em ambos os casos a boas-vindas SHALL ser considerada concluída.

#### Scenario: Ativar lembretes
- **WHEN** o usuário toca em "Ativar lembretes e começar"
- **THEN** os pedidos de permissão são exibidos e, ao final deles, a agenda diária é aberta

#### Scenario: Permissão negada
- **WHEN** o usuário toca em "Ativar lembretes e começar" e nega a permissão de notificações
- **THEN** a agenda diária é aberta normalmente e a boas-vindas não é exibida de novo

#### Scenario: Agora não
- **WHEN** o usuário toca em "Agora não"
- **THEN** a agenda diária é aberta sem nenhum pedido de permissão

### Requirement: Sem pedido de permissão antes da boas-vindas
Enquanto a boas-vindas não tiver sido concluída, o sistema SHALL NOT solicitar permissões de notificação automaticamente na abertura do app. Depois de concluída, o pedido das permissões essenciais na abertura do app SHALL continuar como antes desta mudança.

#### Scenario: Primeira abertura sem pedidos automáticos
- **WHEN** o usuário abre o app pela primeira vez
- **THEN** nenhum pedido de permissão aparece por cima da tela de boas-vindas

#### Scenario: Depois de "Agora não"
- **WHEN** o usuário escolheu "Agora não" e abre o app novamente em outro momento
- **THEN** as permissões essenciais ainda não concedidas são solicitadas na abertura, como antes desta mudança
