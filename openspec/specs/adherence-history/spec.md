# adherence-history Specification

## Purpose
Registra o resultado de cada dose para que o usuário possa consultar o que foi realmente tomado, pulado ou perdido ao longo do tempo, independentemente do horário atual do medicamento.

## Requirements

### Requirement: Toda dose resolvida é registrada
O sistema SHALL registrar, para toda dose que atingir um resultado final, o horário originalmente previsto (quando aplicável), o horário real de confirmação (se houver) e o status final.

#### Scenario: Registrando uma dose tomada
- **WHEN** uma dose é confirmada via "tomei agora"
- **THEN** o sistema registra o horário previsto, o horário real de confirmação e o status tomada (ou tomada com atraso, conforme a regra de atraso)

### Requirement: Classificação do status final
O sistema SHALL classificar toda dose resolvida com horário previsto em exatamente um destes status: tomada (confirmada até 30 minutos depois do horário previsto — antes de quando a primeira notificação de reenvio dispararia — e sem nenhum reenvio entregue), tomada com atraso (confirmada mais de 30 minutos depois do horário previsto, ou depois de pelo menos uma notificação de reenvio entregue), pulada (marcada como "não tomar") ou perdida (dose de medicamento comum sem resposta 2 horas depois do horário previsto — o fim da cascata de 4 notificações). A classificação SHALL depender do horário, e não da entrega das notificações: vale igual com notificações desativadas, silenciadas ou não entregues. Medicamentos especiais SHALL NOT ter doses perdidas.

#### Scenario: Confirmação no horário
- **WHEN** o usuário confirma às 08:20 uma dose prevista para 08:00, sem reenvio entregue
- **THEN** a dose é registrada com status tomada

#### Scenario: Confirmação atrasada sem lembretes
- **WHEN** o usuário confirma às 14:00 uma dose prevista para 08:00 e nenhuma notificação foi entregue
- **THEN** a dose é registrada com status tomada com atraso

#### Scenario: Confirmação atrasada
- **WHEN** o usuário confirma uma dose depois que pelo menos uma notificação de reenvio já disparou
- **THEN** a dose é registrada com status tomada com atraso

#### Scenario: Dose pulada
- **WHEN** o usuário marca uma dose como "não tomar"
- **THEN** a dose é registrada com status pulada

#### Scenario: Dose perdida
- **WHEN** uma dose comum prevista para 08:00 continua sem resposta às 10:01, com ou sem notificações entregues
- **THEN** a dose é registrada com status perdida

#### Scenario: Especial nunca é perdida
- **WHEN** uma dose especial prevista para 08:00 continua sem resposta no dia seguinte
- **THEN** a dose continua não resolvida, exibida como atrasada, e os lembretes continuam

### Requirement: Doses "se necessário" são registradas sem horário previsto
Para medicamentos do tipo se necessário, o sistema SHALL registrar apenas o horário real em que a dose foi tomada, sem comparação a um horário previsto, e SHALL NOT aplicar os status atrasada ou perdida, que não fazem sentido para esse tipo.

#### Scenario: Registrando uma dose se necessário
- **WHEN** o usuário registra manualmente uma dose de um medicamento se necessário
- **THEN** o sistema grava o horário real da dose com status tomada, sem horário previsto associado

### Requirement: O histórico persiste independentemente do horário atual ou da existência do medicamento
O sistema SHALL manter o registro de adesão de uma dose mesmo depois que o medicamento for editado ou removido, e SHALL NOT recalcular ou alterar registros de adesão passados quando o esquema do medicamento mudar.

#### Scenario: Histórico sobrevive à remoção do medicamento
- **WHEN** um medicamento com histórico de adesão prévio é removido
- **THEN** seus registros de adesão passados continuam recuperáveis

#### Scenario: Histórico sobrevive a uma edição de esquema
- **WHEN** o intervalo, os horários ou a configuração de ciclo de um medicamento são editados
- **THEN** os registros de adesão criados antes da edição permanecem inalterados

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

### Requirement: Dose atrasada
Uma dose ainda não resolvida SHALL ser exibida como "Atrasada" quando já tiver passado mais de 30 minutos do horário previsto, para medicamentos comuns e especiais, inclusive silenciados. "Atrasada" é um estado de exibição: a dose continua podendo ser confirmada ("tomada com atraso") ou pulada, os lembretes seguem a cascata normal, e uma dose comum atrasada passa a perdida 2 horas depois do horário.

#### Scenario: Comum atrasada
- **WHEN** às 08:45 uma dose comum das 08:00 ainda não foi respondida
- **THEN** ela aparece como "Atrasada" e continua com as ações "Tomei agora" e "Não tomar"

#### Scenario: Silenciado
- **WHEN** um medicamento silenciado tem uma dose das 08:00 sem resposta às 10:01
- **THEN** a dose vira perdida, sem nenhuma notificação ter sido enviada
