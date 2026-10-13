## ADDED Requirements

### Requirement: Duração fixa conta a partir do início informado
Para esquemas diário, intervalo em horas e dias da semana com duração fixa, a contagem da duração SHALL partir da data de início do tratamento informada no cadastro em uso; sem essa informação, a data de início é o dia do cadastro.

#### Scenario: Tratamento iniciado antes do cadastro
- **WHEN** em 12/10 o usuário cadastra em uso um diário de 10 dias que começou em 08/10
- **THEN** a última dose agendada é em 17/10, e nenhuma dose é agendada a partir de 18/10

### Requirement: Primeira dose do intervalo a partir da última dose informada
Para um intervalo em horas cadastrado em uso, a primeira dose agendada SHALL ser a última dose informada mais o intervalo. Se esse horário já tiver passado no momento do cadastro, a primeira dose SHALL ser agendada para o momento do cadastro, e a confirmação SHALL indicar o horário em que ela estava prevista.

#### Scenario: Próxima dose no futuro
- **WHEN** às 10:00 o usuário cadastra em uso um "a cada 8 horas" com última dose às 06:00 de hoje
- **THEN** a primeira dose agendada é às 14:00 de hoje

#### Scenario: Próxima dose já atrasada
- **WHEN** às 16:00 o usuário cadastra em uso um "a cada 8 horas" com última dose às 06:00 de hoje
- **THEN** a primeira dose é agendada para as 16:00, e a confirmação informa que ela estava prevista para as 14:00

### Requirement: Ciclo já em andamento no cadastro
Para um cíclico cadastrado em uso, o sistema SHALL definir o dia 1 do ciclo atual a partir do dia informado — hoje menos (dia da cartela − 1) dias quando tomando, ou hoje menos (dias ativos + dia da pausa − 1) dias quando na pausa —, gerando a partir de hoje as doses dos dias ativos restantes e tratando os dias de pausa como no ciclo normal. Ao fim da pausa, a regra existente se mantém: o próximo ciclo só começa com a confirmação do primeiro comprimido da nova cartela.

#### Scenario: Dia 12 de 21
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 12 da cartela, às 22:00
- **THEN** são agendadas doses de 12/10 a 21/10 às 22:00 (dias 12 a 21), 22/10 a 28/10 são dias de pausa, e o medicamento fica aguardando a nova cartela a partir de 29/10

#### Scenario: Dia 3 da pausa
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 3 da pausa
- **THEN** nenhuma dose é agendada, 12/10 a 16/10 são dias de pausa, e o medicamento fica aguardando a nova cartela a partir de 17/10
