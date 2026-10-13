## MODIFIED Requirements

### Requirement: Voltar à agenda recomeça o esquema
Ao voltar para a agenda, o esquema SHALL recomeçar como num cadastro feito naquele momento: a duração fixa conta a partir do dia da volta; o cíclico fica aguardando a nova cartela; horários de hoje já passados não geram dose. Horários de hoje que já têm uma dose resolvida (tomada, tomada com atraso ou pulada) SHALL NOT ganhar uma nova dose nem lembrete. No intervalo em horas, a primeira dose SHALL ser a última dose tomada mais o intervalo, ou o momento da volta se esse horário já passou ou se não há dose tomada; a confirmação da volta SHALL mostrar esse mesmo horário.

#### Scenario: Tratamento de duração fixa
- **WHEN** um tratamento de 7 dias, iniciado há 20 dias e retirado da agenda, volta para a agenda em 12/10
- **THEN** as doses vão de 12/10 a 18/10

#### Scenario: Cíclico
- **WHEN** um cíclico volta para a agenda
- **THEN** ele aparece como "Aguardando nova cartela"

#### Scenario: Dose de hoje já tomada antes de retirar
- **WHEN** um medicamento diário de 08:00 e 20:00 tem a dose das 20:00 de hoje tomada às 19:00, é retirado da agenda às 19:30 e volta às 19:45
- **THEN** hoje às 20:00 existe só a dose tomada, sem dose pendente nem lembrete, e a próxima dose é amanhã às 08:00

#### Scenario: Intervalo com dose recente
- **WHEN** um medicamento de 8 em 8 horas tem dose tomada às 09:00, é retirado da agenda às 09:30 e volta às 10:00
- **THEN** a confirmação mostra e o app agenda a próxima dose para as 17:00

#### Scenario: Intervalo com última dose antiga
- **WHEN** um medicamento de 8 em 8 horas tem a última dose tomada há dois dias e volta para a agenda às 10:00
- **THEN** a próxima dose é às 10:00
