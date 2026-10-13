## ADDED Requirements

### Requirement: O início de uma nova cartela é persistido
Ao confirmar o primeiro comprimido de uma nova cartela, o sistema SHALL gravar o horário da confirmação como dia 1 do ciclo do medicamento, de forma que a agenda, o calendário, os lembretes e as próximas aberturas do app passem a calcular dias ativos e de pausa a partir dessa data.

#### Scenario: Ciclo continua depois de reabrir o app
- **WHEN** o usuário confirma o primeiro comprimido de uma cartela 21/7 em 12/10 e fecha e reabre o app
- **THEN** a agenda de 13/10 mostra a dose do dia 2 de 21, e o calendário mostra 2/11 a 8/11 como pausa

### Requirement: A janela de doses futuras é renovada continuamente
Para todo esquema ativo com grade de horários (diário, dias da semana e cíclico com ciclo iniciado), o sistema SHALL manter as doses previstas materializadas para pelo menos as 2 semanas seguintes, renovando a janela (até 4 semanas à frente) sempre que o app é aberto ou volta ao primeiro plano e na tarefa periódica de segundo plano. A renovação SHALL NOT alterar nem duplicar doses já existentes, e SHALL respeitar a duração fixa e a remoção do medicamento.

#### Scenario: Uso contínuo depois de um mês
- **WHEN** um medicamento diário de uso contínuo foi cadastrado há 35 dias e o usuário abre o app
- **THEN** a agenda de hoje mostra a dose do dia e há doses previstas para pelo menos as 2 semanas seguintes

#### Scenario: Renovação sem duplicar
- **WHEN** a renovação roda duas vezes no mesmo dia
- **THEN** cada horário previsto continua com uma única dose, e doses já resolvidas não mudam

#### Scenario: Duração fixa encerrada
- **WHEN** a renovação roda para um tratamento de 10 dias já encerrado
- **THEN** nenhuma dose nova é criada
