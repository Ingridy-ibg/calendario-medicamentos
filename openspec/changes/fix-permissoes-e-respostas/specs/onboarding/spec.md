## MODIFIED Requirements

### Requirement: Boas-vindas pede as permissões de notificação
A tela de boas-vindas SHALL oferecer duas opções: "Ativar lembretes e começar", que solicita as permissões essenciais de notificação (notificações e alarmes exatos) e depois abre a agenda diária; e "Agora não", que abre a agenda diária sem solicitar permissões. Em ambos os casos a boas-vindas SHALL ser considerada concluída. O sistema SHALL NOT solicitar a isenção de otimização de bateria em nenhum momento.

#### Scenario: Ativar lembretes
- **WHEN** o usuário toca em "Ativar lembretes e começar"
- **THEN** os pedidos de permissão de notificações e de alarmes exatos são exibidos e, ao final deles, a agenda diária é aberta

#### Scenario: Sem pedido de bateria
- **WHEN** o usuário toca em "Ativar lembretes e começar" e responde aos pedidos
- **THEN** nenhuma tela de otimização de bateria do Android é aberta

#### Scenario: Permissão negada
- **WHEN** o usuário toca em "Ativar lembretes e começar" e nega a permissão de notificações
- **THEN** a agenda diária é aberta normalmente e a boas-vindas não é exibida de novo

#### Scenario: Agora não
- **WHEN** o usuário toca em "Agora não"
- **THEN** a agenda diária é aberta sem nenhum pedido de permissão

### Requirement: Sem pedido de permissão antes da boas-vindas
O sistema SHALL solicitar as permissões essenciais automaticamente apenas uma vez, na boas-vindas, quando o usuário escolhe "Ativar lembretes e começar". Em nenhuma abertura do app, antes ou depois da boas-vindas, o sistema SHALL abrir pedidos de permissão ou telas de Configurações do Android sem uma ação explícita do usuário. Depois da boas-vindas, as permissões não concedidas só SHALL ser pedidas pelas ações "Permitir" do Perfil.

#### Scenario: Primeira abertura sem pedidos automáticos
- **WHEN** o usuário abre o app pela primeira vez
- **THEN** nenhum pedido de permissão aparece por cima da tela de boas-vindas

#### Scenario: Aberturas seguintes
- **WHEN** o usuário já concluiu a boas-vindas e abre o app de novo, a frio ou voltando do segundo plano
- **THEN** o app abre direto na agenda, sem nenhuma tela de Configurações nem diálogo de permissão

#### Scenario: Depois de "Agora não"
- **WHEN** o usuário escolheu "Agora não" e abre o app novamente em outro momento
- **THEN** nenhum pedido de permissão aparece, e as permissões continuam disponíveis em "Permitir" no Perfil
