## ADDED Requirements

### Requirement: Dias anteriores ao cadastro ficam sem registro
O sistema SHALL NOT criar registro de adesão (tomada, pulada ou perdida) para dias anteriores ao dia do cadastro, mesmo quando o tratamento informado começou antes. No calendário e nos resumos de adesão, esses dias SHALL aparecer como sem dose.

#### Scenario: Tratamento iniciado há 4 dias
- **WHEN** em 12/10 o usuário cadastra em uso um tratamento que começou em 08/10
- **THEN** o calendário não mostra nenhuma dose desse medicamento de 08/10 a 11/10

### Requirement: Doses de hoje informadas no cadastro entram no histórico
Cada dose de hoje marcada como já tomada no cadastro em uso SHALL ser registrada com status tomada e com o horário previsto como horário de registro, e SHALL aparecer na agenda de hoje e no calendário como tomada.

#### Scenario: Dose das 08:00 informada como tomada
- **WHEN** o usuário cadastra em uso às 10:00 e marca a dose das 08:00 como tomada
- **THEN** a agenda de hoje mostra a dose das 08:00 como tomada
