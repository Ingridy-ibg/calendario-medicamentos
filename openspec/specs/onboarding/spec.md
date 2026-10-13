# onboarding Specification

## Purpose
Apresenta o aplicativo na primeira abertura e concentra, num momento explicado ao usuário, o pedido das permissões de notificação de que os lembretes dependem.

## Requirements

### Requirement: Boas-vindas na primeira abertura
Na primeira vez que o aplicativo é aberto num aparelho, o sistema SHALL exibir uma tela de boas-vindas antes da agenda diária, apresentando o propósito do app e seus principais recursos (lembretes que insistem até haver resposta, histórico de adesão no calendário, aviso de estoque baixo).

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

### Requirement: Etapa de nome e aparência na boas-vindas
Depois de "Ativar lembretes e começar" (ao fim dos pedidos de permissão, concedidos ou não) e também depois de "Agora não", a boas-vindas SHALL mostrar uma etapa "Como podemos te chamar?" com um campo de nome opcional e a escolha de aparência entre "Sistema", "Claro" e "Escuro" ("Sistema" marcada por padrão). A aparência escolhida SHALL ser aplicada na hora à própria tela. O botão "Começar" SHALL salvar o nome (se informado) e a aparência e abrir a agenda diária; não há outro botão nessa etapa. Nome e aparência SHALL ser os mesmos usados pelo Perfil.

#### Scenario: Depois de ativar os lembretes
- **WHEN** o usuário toca em "Ativar lembretes e começar" e responde aos pedidos de permissão
- **THEN** a etapa "Como podemos te chamar?" é exibida

#### Scenario: Depois de "Agora não"
- **WHEN** o usuário toca em "Agora não"
- **THEN** a etapa "Como podemos te chamar?" é exibida, sem nenhum pedido de permissão

#### Scenario: Com nome e modo escuro
- **WHEN** o usuário digita "Ana", escolhe "Escuro" e toca em "Começar"
- **THEN** a agenda abre no modo escuro e a aba Perfil mostra o nome "Ana" e a aparência "Escuro"

#### Scenario: Sem nome
- **WHEN** o usuário toca em "Começar" sem digitar nome
- **THEN** a agenda abre e o campo de nome no Perfil fica vazio

#### Scenario: App fechado nessa etapa
- **WHEN** o usuário fecha o app na etapa de nome e aparência
- **THEN** na próxima abertura a agenda é exibida direto, sem boas-vindas, com a aparência que estava escolhida
