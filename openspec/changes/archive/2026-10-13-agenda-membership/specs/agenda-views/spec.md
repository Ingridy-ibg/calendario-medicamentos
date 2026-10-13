## ADDED Requirements

### Requirement: Agenda e calendário ignoram medicamentos fora da agenda
A agenda diária SHALL NOT listar medicamentos fora da agenda (nem doses, nem "se necessário", nem "aguardando nova cartela"), e o calendário mensal SHALL NOT projetar doses futuras para eles; o histórico já registrado continua aparecendo nos dias passados.

#### Scenario: Agenda de hoje
- **WHEN** um "se necessário" está fora da agenda
- **THEN** ele não aparece na agenda de hoje

#### Scenario: Calendário
- **WHEN** um medicamento diário que tinha doses tomadas na semana passada é retirado da agenda
- **THEN** o calendário continua mostrando as doses tomadas da semana passada e não mostra doses previstas nos dias futuros
