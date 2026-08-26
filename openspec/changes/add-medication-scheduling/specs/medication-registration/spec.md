## Purpose

Permite ao usuário cadastrar, editar e remover medicamentos, capturando os campos necessários para orientar o cálculo de doses, as notificações e o controle de estoque: nome, dose, estoque, criticidade e a configuração do esquema de horário, escolhido entre cinco tipos.

## ADDED Requirements

### Requirement: Campos comuns do medicamento
O sistema SHALL exigir nome do medicamento, descrição da dose, criticidade (comum ou especial), quantidade em estoque e quantidade por embalagem para todo medicamento, independentemente do tipo de esquema.

#### Scenario: Cadastrando um medicamento com os campos comuns
- **WHEN** o usuário envia o formulário de cadastro com nome, dose, criticidade, quantidade em estoque e quantidade por embalagem preenchidos
- **THEN** o sistema aceita esses valores como parte do registro do medicamento

### Requirement: Seleção do tipo de esquema
O sistema SHALL exigir que o usuário escolha um tipo de esquema — diário, intervalo em horas, dias da semana, cíclico ou se necessário — antes de exibir os campos específicos daquele tipo, e SHALL exibir apenas os campos relevantes ao tipo escolhido.

#### Scenario: Escolhendo diário
- **WHEN** o usuário seleciona "diário" como tipo de esquema
- **THEN** o sistema exibe os campos de lista de horários fixos e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo intervalo em horas
- **WHEN** o usuário seleciona "intervalo em horas" como tipo de esquema
- **THEN** o sistema exibe os campos de intervalo entre doses e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo dias da semana
- **WHEN** o usuário seleciona "dias da semana" como tipo de esquema
- **THEN** o sistema exibe os campos de dias da semana, horários fixos e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo cíclico
- **WHEN** o usuário seleciona "cíclico" como tipo de esquema
- **THEN** o sistema exibe os campos de dias ativos, dias de pausa e horário diário, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo se necessário
- **WHEN** o usuário seleciona "se necessário" como tipo de esquema
- **THEN** o sistema exibe apenas o campo de limite máximo de doses por dia, sem campos de horário fixo nem duração

### Requirement: Campos do esquema diário
Para um esquema diário, o sistema SHALL exigir uma lista de um ou mais horários fixos no dia, e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Registrando múltiplos horários fixos
- **WHEN** o usuário cadastra um medicamento com tipo de esquema diário e horários 8h e 20h
- **THEN** o sistema agenda uma dose em cada um desses horários todos os dias, pelo período configurado de duração

### Requirement: Campos do esquema de intervalo em horas
Para um esquema de intervalo em horas, o sistema SHALL exigir o intervalo entre doses (em horas) e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Curso de duração fixa
- **WHEN** o usuário cadastra um medicamento com tipo de esquema intervalo em horas, intervalo de 8h e duração "7 dias"
- **THEN** o sistema agenda doses a cada 8 horas e marca o medicamento para parar de gerar doses após 7 dias de uso

#### Scenario: Uso contínuo
- **WHEN** o usuário cadastra um medicamento com tipo de esquema intervalo em horas e duração "uso contínuo"
- **THEN** o sistema agenda doses no intervalo configurado indefinidamente, sem data de término

### Requirement: Campos do esquema de dias da semana
Para um esquema de dias da semana, o sistema SHALL exigir uma lista de dias da semana, uma lista de horários fixos aplicados nesses dias, e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Registrando dias e horários específicos
- **WHEN** o usuário cadastra um medicamento com tipo de esquema dias da semana, dias segunda/quarta/sexta e horário 9h
- **THEN** o sistema agenda uma dose às 9h apenas nos dias segunda, quarta e sexta, pelo período configurado de duração

### Requirement: Campos do esquema cíclico
Para um esquema cíclico, o sistema SHALL exigir o número de dias ativos, o número de dias de pausa e o horário do dia para a dose diária.

#### Scenario: Cadastrando um ciclo 21/7
- **WHEN** o usuário cadastra um medicamento com tipo de esquema cíclico, 21 dias ativos, 7 dias de pausa e um horário diário de dose
- **THEN** o sistema registra o padrão ativo/pausa e o horário diário da dose para uso pelo cálculo de doses

### Requirement: Campos do esquema se necessário
Para um esquema se necessário, o sistema SHALL exigir apenas o limite máximo de doses por dia, sem horário fixo nem duração.

#### Scenario: Cadastrando um medicamento sem horário fixo
- **WHEN** o usuário cadastra um medicamento com tipo de esquema se necessário e limite de 4 doses por dia
- **THEN** o sistema registra o limite diário e não agenda nenhum horário fixo para esse medicamento

### Requirement: Medicamentos cíclicos são sempre especiais
O sistema SHALL tratar todo medicamento com esquema cíclico como criticidade especial, independentemente do valor de criticidade que o usuário selecionar.

#### Scenario: Medicamento cíclico força criticidade especial
- **WHEN** o usuário cadastra um medicamento com tipo de esquema cíclico e seleciona criticidade comum
- **THEN** o sistema armazena o medicamento como especial

### Requirement: Edição de um medicamento
O sistema SHALL permitir a edição dos campos de um medicamento e do seu esquema, e as alterações SHALL se aplicar apenas ao cálculo de doses futuras.

#### Scenario: Editando o intervalo da dose
- **WHEN** o usuário altera o intervalo de um medicamento de esquema intervalo em horas existente
- **THEN** as próximas doses são agendadas usando o novo intervalo, e o histórico de adesão já registrado não é alterado

### Requirement: Remoção de um medicamento
O sistema SHALL permitir a remoção de um medicamento, o que interrompe todo agendamento e notificação futuros, preservando seu histórico de adesão já existente.

#### Scenario: Removendo um medicamento ativo
- **WHEN** o usuário remove um medicamento que tem doses pendentes ou futuras
- **THEN** o sistema cancela suas notificações pendentes e para de gerar novas doses, e seus registros de adesão passados permanecem acessíveis
