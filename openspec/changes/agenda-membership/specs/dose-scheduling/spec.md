## ADDED Requirements

### Requirement: Medicamento fora da agenda não gera doses
O sistema SHALL NOT gerar, materializar nem renovar doses de um medicamento fora da agenda, em nenhum ponto (cadastro, edição, renovação da janela, tarefa de segundo plano).

#### Scenario: Renovação ignora
- **WHEN** a renovação da janela roda com um medicamento diário fora da agenda
- **THEN** nenhuma dose é criada para ele

#### Scenario: Edição fora da agenda
- **WHEN** o usuário edita os horários de um medicamento fora da agenda
- **THEN** a edição é salva e nenhuma dose é criada

### Requirement: Voltar à agenda recomeça o esquema
Ao voltar para a agenda, o esquema SHALL recomeçar como num cadastro feito naquele momento: a duração fixa conta a partir do dia da volta; o intervalo em horas tem a primeira dose no momento da volta; o cíclico fica aguardando a nova cartela; horários de hoje já passados não geram dose.

#### Scenario: Tratamento de duração fixa
- **WHEN** um tratamento de 7 dias, iniciado há 20 dias e retirado da agenda, volta para a agenda em 12/10
- **THEN** as doses vão de 12/10 a 18/10

#### Scenario: Cíclico
- **WHEN** um cíclico volta para a agenda
- **THEN** ele aparece como "Aguardando nova cartela"
