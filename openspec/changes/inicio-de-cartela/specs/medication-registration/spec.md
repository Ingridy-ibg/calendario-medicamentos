## ADDED Requirements

### Requirement: Primeiro início de um cíclico novo
Para um cíclico cadastrado sem "Já estava tomando", ou que volta à agenda, a tela "Confira antes de salvar" SHALL definir o início da primeira cartela pelo horário do ciclo:
- se o horário de hoje ainda não passou, o início SHALL ser hoje nesse horário, sem pergunta;
- se já passou, a tela SHALL perguntar "Você já tomou o 1º comprimido hoje?", com as opções "Já tomei hoje" e "Começo amanhã", e SHALL NOT permitir confirmar sem uma escolha.
  - "Já tomei hoje" SHALL iniciar o ciclo hoje: dia 1 no horário do ciclo de hoje, com a dose registrada como tomada nesse horário. Como no cadastro em uso, o estoque informado SHALL ser entendido como o que o usuário tem agora, e esse registro SHALL NOT decrementar o estoque.
  - "Começo amanhã" SHALL definir o início da nova cartela para amanhã no horário do ciclo.

A tela SHALL mostrar o início resultante ("Nova cartela: hoje às 22:00", "amanhã às 22:00", ou "Dia 1 de 21: hoje"). Se, ao tocar em "Confirmar e agendar", o horário de hoje tiver passado depois que a tela foi aberta sem a pergunta, a tela SHALL passar a mostrar a pergunta e SHALL NOT salvar até a escolha.

#### Scenario: Horário ainda por vir
- **WHEN** às 15:00 o usuário cadastra um cíclico 21/7 das 22:00 sem "Já estava tomando"
- **THEN** a confirmação mostra "Nova cartela: hoje às 22:00", sem pergunta, e ao confirmar a dose de início de cartela fica agendada para hoje às 22:00

#### Scenario: Horário já passou e já tomou
- **WHEN** às 23:00 o usuário cadastra um cíclico 21/7 das 22:00 e escolhe "Já tomei hoje"
- **THEN** ao confirmar, o ciclo começa hoje com o dia 1 tomado às 22:00, o estoque continua o informado e a dose do dia 2 fica agendada para amanhã às 22:00

#### Scenario: Horário já passou e começa amanhã
- **WHEN** às 23:00 o usuário cadastra um cíclico 21/7 das 22:00 e escolhe "Começo amanhã"
- **THEN** ao confirmar, a dose de início de cartela fica agendada para amanhã às 22:00 e nenhuma dose é criada hoje

#### Scenario: Sem escolha
- **WHEN** a pergunta do 1º comprimido está visível e nenhuma opção foi escolhida
- **THEN** "Confirmar e agendar" não salva e a pergunta é destacada

#### Scenario: Horário passa com a tela aberta
- **WHEN** o usuário abre a confirmação às 21:55 para um cíclico das 22:00 e toca em "Confirmar e agendar" às 22:01
- **THEN** nada é salvo e a tela passa a mostrar a pergunta "Você já tomou o 1º comprimido hoje?"
