## ADDED Requirements

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
