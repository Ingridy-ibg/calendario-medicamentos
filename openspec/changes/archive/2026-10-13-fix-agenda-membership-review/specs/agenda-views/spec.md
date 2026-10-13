## MODIFIED Requirements

### Requirement: Agenda e calendário ignoram medicamentos fora da agenda
A agenda diária SHALL NOT listar doses pendentes, "se necessário" nem "aguardando nova cartela" de medicamentos fora da agenda, e o calendário mensal SHALL NOT projetar doses futuras para eles. O histórico já registrado SHALL continuar aparecendo: nos dias passados do calendário e, no dia de hoje, tanto no calendário quanto na agenda diária, onde as doses já resolvidas de um medicamento fora da agenda aparecem com seu status e sem alerta de estoque.

#### Scenario: Agenda de hoje
- **WHEN** um "se necessário" está fora da agenda
- **THEN** ele não aparece na agenda de hoje

#### Scenario: Calendário
- **WHEN** um medicamento diário que tinha doses tomadas na semana passada é retirado da agenda
- **THEN** o calendário continua mostrando as doses tomadas da semana passada e não mostra doses previstas nos dias futuros

#### Scenario: Dose de hoje tomada antes de retirar
- **WHEN** o usuário toma a dose das 08:00 e às 09:00 retira o medicamento da agenda
- **THEN** a agenda de hoje continua mostrando a dose das 08:00 como tomada, sem as doses ainda não resolvidas e sem alerta de estoque, igual ao calendário de hoje
