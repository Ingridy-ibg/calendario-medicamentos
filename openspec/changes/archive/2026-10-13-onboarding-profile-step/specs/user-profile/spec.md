## REMOVED Requirements

### Requirement: Acesso ao perfil pela agenda
**Reason**: O botão de perfil no cabeçalho da agenda divide a linha com o título e corta o nome na saudação ("Bom dia, Ana Pa…").
**Migration**: O perfil passa a ser uma aba da barra inferior (requisito "Acesso ao perfil pela barra de abas"); o cabeçalho da agenda fica só com a saudação, a data e o botão "Novo".

## ADDED Requirements

### Requirement: Acesso ao perfil pela barra de abas
A barra de abas SHALL ter, como última aba, "Perfil", com o ícone clássico de pessoa (cabeça e ombros), que abre a tela "Meu perfil". O cabeçalho da agenda SHALL NOT ter botão de perfil. Como é uma aba, a tela de perfil SHALL NOT ter botão de voltar.

#### Scenario: Abrindo o perfil
- **WHEN** o usuário toca na aba "Perfil"
- **THEN** a tela "Meu perfil" é exibida e a aba "Perfil" aparece como ativa

#### Scenario: Saudação com nome inteiro
- **WHEN** o nome no perfil é "Ana Paula" e o usuário abre a agenda de manhã
- **THEN** o cabeçalho mostra "Bom dia, Ana!" sem botão de perfil ao lado disputando espaço
