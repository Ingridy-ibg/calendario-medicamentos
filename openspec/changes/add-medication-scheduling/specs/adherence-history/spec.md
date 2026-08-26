## Purpose

Registra o resultado de cada dose para que o usuário possa consultar o que foi realmente tomado, pulado ou perdido ao longo do tempo, independentemente do horário atual do medicamento.

## ADDED Requirements

### Requirement: Toda dose resolvida é registrada
O sistema SHALL registrar, para toda dose que atingir um resultado final, o horário originalmente previsto (quando aplicável), o horário real de confirmação (se houver) e o status final.

#### Scenario: Registrando uma dose tomada
- **WHEN** uma dose é confirmada via "tomei agora"
- **THEN** o sistema registra o horário previsto, o horário real de confirmação e o status tomada (ou tomada com atraso, conforme a regra de atraso)

### Requirement: Classificação do status final
O sistema SHALL classificar toda dose resolvida com horário previsto em exatamente um destes status: tomada (confirmada dentro da janela originalmente prevista, antes de qualquer notificação de reenvio disparar), tomada com atraso (confirmada depois de pelo menos uma notificação de reenvio ter disparado), pulada (marcada como "não tomar") ou perdida (dose comum que atingiu 4 notificações consecutivas sem resposta).

#### Scenario: Confirmação no horário
- **WHEN** o usuário confirma uma dose antes que sua primeira notificação de reenvio dispararia
- **THEN** a dose é registrada com status tomada

#### Scenario: Confirmação atrasada
- **WHEN** o usuário confirma uma dose depois que pelo menos uma notificação de reenvio já disparou
- **THEN** a dose é registrada com status tomada com atraso

#### Scenario: Dose pulada
- **WHEN** o usuário marca uma dose como "não tomar"
- **THEN** a dose é registrada com status pulada

#### Scenario: Dose perdida
- **WHEN** uma dose comum atinge 4 notificações consecutivas sem resposta
- **THEN** a dose é registrada com status perdida

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
