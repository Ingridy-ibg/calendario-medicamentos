## Purpose

Cumprimenta o usuário pelo nome conforme o período do dia — numa tela de saudação na primeira abertura do dia e no cabeçalho da agenda — e aproveita o momento para mostrar um resumo das doses de hoje.

## ADDED Requirements

### Requirement: Saudação conforme o período do dia
O sistema SHALL escolher a saudação pelo horário local do aparelho: "Bom dia" das 05:00 às 11:59, "Boa tarde" das 12:00 às 17:59 e "Boa noite" das 18:00 às 04:59. Quando o usuário tiver nome no perfil, a saudação SHALL usar o primeiro nome dele ("Bom dia, Ana!"); sem nome, SHALL ser só a saudação ("Bom dia!").

#### Scenario: Tarde com nome
- **WHEN** são 13:40 e o nome no perfil é "Ana Paula Souza"
- **THEN** a saudação é "Boa tarde, Ana!"

#### Scenario: Madrugada
- **WHEN** são 02:15
- **THEN** a saudação é "Boa noite"

#### Scenario: Sem nome
- **WHEN** o usuário não informou nome no perfil
- **THEN** a saudação é "Bom dia!" (ou a do período correspondente), sem vírgula nem nome

### Requirement: Tela de saudação na primeira abertura do dia
O sistema SHALL exibir a tela de saudação na primeira vez em que o app é aberto ou trazido para o primeiro plano em cada dia do calendário local, antes da agenda. Nas demais aberturas do mesmo dia, o app SHALL ir direto para a agenda. A saudação SHALL NOT ser exibida quando o app for aberto a partir de uma notificação, nem enquanto a boas-vindas não tiver sido concluída; nesses casos, o dia SHALL continuar sem saudação exibida, de forma que a próxima abertura comum daquele dia a mostre.

#### Scenario: Primeira abertura do dia
- **WHEN** o usuário abre o app pela primeira vez hoje às 07:12
- **THEN** a tela de saudação "Bom dia" é exibida antes da agenda

#### Scenario: Segunda abertura do dia
- **WHEN** o usuário já viu a saudação hoje e abre o app de novo às 13:40
- **THEN** a agenda é exibida direto, sem saudação

#### Scenario: Aberto por notificação
- **WHEN** a primeira abertura do dia acontece tocando numa notificação de dose
- **THEN** o app vai direto para a ação da notificação, sem saudação, e a próxima abertura comum desse dia exibe a saudação

#### Scenario: Primeiro uso do app
- **WHEN** o app é aberto pela primeira vez após a instalação
- **THEN** a boas-vindas é exibida e a saudação não aparece

#### Scenario: Virada do dia
- **WHEN** o usuário viu a saudação às 22:00 e abre o app à 00:30
- **THEN** é um novo dia e a saudação "Boa noite" é exibida de novo

### Requirement: Conteúdo da tela de saudação
A tela de saudação SHALL mostrar a saudação, a data e a hora atuais, uma frase de resumo das doses agendadas de hoje e, quando houver dose pendente hoje, um cartão com essa dose rotulado como "Primeira dose" (nenhuma dose de hoje resolvida ainda), "Última dose de hoje" (é a única pendente restante) ou "Próxima dose" (demais casos). A frase de resumo SHALL seguir a situação do dia:
- nenhuma dose resolvida: "Você tem N doses hoje.";
- algumas resolvidas: "X de N doses tomadas até agora.";
- uma única pendente restante: "Falta só 1 dose para fechar o dia.";
- todas resolvidas: "Tudo certo com as doses de hoje." e sem cartão;
- nenhuma dose agendada hoje: "Nenhuma dose agendada para hoje." e sem cartão.
Medicamentos "se necessário" SHALL NOT entrar nessas contagens.

#### Scenario: Manhã sem doses resolvidas
- **WHEN** hoje há 5 doses, nenhuma resolvida, e a primeira é Losartana às 08:00
- **THEN** a tela mostra "Você tem 5 doses hoje." e o cartão "Primeira dose · Losartana às 08:00"

#### Scenario: Todas as doses resolvidas
- **WHEN** todas as doses de hoje já foram resolvidas
- **THEN** a tela mostra "Tudo certo com as doses de hoje." e nenhum cartão de dose

### Requirement: Visual por período
A tela de saudação SHALL ter uma ilustração e cores próprias de cada período — manhã (tons claros e quentes, sol), tarde (tons claros verdes, sol) e noite (fundo escuro, meia-lua e estrelas) —, mantendo o contraste mínimo de texto da identidade visual. No período da noite (18:00 às 04:59) a ilustração SHALL ser uma meia-lua e SHALL NOT ser um sol, em qualquer tema. Quando o app estiver no tema escuro, manhã e tarde SHALL usar fundo escuro, mantendo apenas a ilustração do período.

#### Scenario: Noite
- **WHEN** a saudação é exibida às 19:30
- **THEN** a tela usa fundo escuro com a meia-lua e estrelas, sem sol

#### Scenario: Madrugada mostra a meia-lua
- **WHEN** a saudação é exibida às 02:15
- **THEN** a ilustração é a meia-lua, não o sol

#### Scenario: Manhã no tema escuro
- **WHEN** o app está no tema escuro e a saudação é exibida às 07:12
- **THEN** a tela usa fundo escuro com a ilustração do sol

### Requirement: Passagem automática para a agenda
A tela de saudação SHALL seguir sozinha para a agenda cerca de 2,5 segundos depois de exibida, com um indicador de progresso, e SHALL ir para a agenda imediatamente ao toque em qualquer ponto da tela ou no botão "Ver agenda". Com leitor de tela ativo, a passagem automática SHALL ser desativada e a tela SHALL aguardar o toque em "Ver agenda". Voltar da agenda SHALL NOT reabrir a saudação.

#### Scenario: Sem interação
- **WHEN** o usuário não toca em nada na saudação
- **THEN** a agenda é exibida depois de cerca de 2,5 segundos

#### Scenario: Toque para pular
- **WHEN** o usuário toca na tela de saudação
- **THEN** a agenda é exibida na hora

#### Scenario: Leitor de tela ativo
- **WHEN** o TalkBack está ativo
- **THEN** a saudação não avança sozinha e a agenda só abre ao ativar "Ver agenda"

### Requirement: Saudação no cabeçalho da agenda
O título do cabeçalho da agenda diária SHALL ser a saudação do período atual (mesmas regras de período e nome), com a data do dia acima dela, e SHALL ser atualizado sempre que a agenda volta a ser exibida.

#### Scenario: Cabeçalho à tarde
- **WHEN** o usuário abre a agenda às 15:00 com o nome "Ana" no perfil
- **THEN** o cabeçalho mostra a data e o título "Boa tarde, Ana!"

#### Scenario: Mudança de período com o app aberto
- **WHEN** a agenda estava aberta às 11:58 e o usuário volta a ela às 12:05
- **THEN** o título passa a ser "Boa tarde"
