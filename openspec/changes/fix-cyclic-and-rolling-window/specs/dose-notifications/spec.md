## ADDED Requirements

### Requirement: Permissão de tela cheia pedida uma única vez
O sistema SHALL abrir o pedido da permissão de notificação em tela cheia apenas no primeiro cadastro de um medicamento especial (incluindo cíclicos) no aparelho, e SHALL NOT repeti-lo em cadastros seguintes de especiais.

#### Scenario: Segundo medicamento especial
- **WHEN** o usuário já cadastrou um medicamento especial antes e cadastra outro
- **THEN** a tela de configuração de tela cheia do Android não é aberta de novo
