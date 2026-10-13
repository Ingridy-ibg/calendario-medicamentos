## MODIFIED Requirements

### Requirement: Classificação do status final
O sistema SHALL classificar toda dose resolvida com horário previsto em exatamente um destes status: tomada (confirmada até 30 minutos depois do horário previsto — antes de quando a primeira notificação de reenvio dispararia — e sem nenhum reenvio entregue), tomada com atraso (confirmada mais de 30 minutos depois do horário previsto, ou depois de pelo menos uma notificação de reenvio entregue), pulada (marcada como "não tomar") ou perdida (dose de medicamento comum sem resposta 2 horas depois do horário previsto — o fim da cascata de 4 notificações). A classificação SHALL depender do horário, e não da entrega das notificações: vale igual com notificações desativadas, silenciadas ou não entregues. Medicamentos especiais SHALL NOT ter doses perdidas.

#### Scenario: Confirmação no horário
- **WHEN** o usuário confirma às 08:20 uma dose prevista para 08:00, sem reenvio entregue
- **THEN** a dose é registrada com status tomada

#### Scenario: Confirmação atrasada sem lembretes
- **WHEN** o usuário confirma às 14:00 uma dose prevista para 08:00 e nenhuma notificação foi entregue
- **THEN** a dose é registrada com status tomada com atraso

#### Scenario: Confirmação atrasada com reenvio
- **WHEN** o usuário confirma uma dose depois que pelo menos uma notificação de reenvio já disparou
- **THEN** a dose é registrada com status tomada com atraso

#### Scenario: Dose pulada
- **WHEN** o usuário marca uma dose como "não tomar"
- **THEN** a dose é registrada com status pulada

#### Scenario: Dose comum perdida por tempo
- **WHEN** uma dose comum prevista para 08:00 continua sem resposta às 10:01, com ou sem notificações entregues
- **THEN** a dose é registrada com status perdida

#### Scenario: Especial nunca é perdida
- **WHEN** uma dose especial prevista para 08:00 continua sem resposta no dia seguinte
- **THEN** a dose continua não resolvida, exibida como atrasada, e os lembretes continuam

## ADDED Requirements

### Requirement: Dose atrasada
Uma dose ainda não resolvida SHALL ser exibida como "Atrasada" quando já tiver passado mais de 30 minutos do horário previsto, para medicamentos comuns e especiais, inclusive silenciados. "Atrasada" é um estado de exibição: a dose continua podendo ser confirmada ("tomada com atraso") ou pulada, os lembretes seguem a cascata normal, e uma dose comum atrasada passa a perdida 2 horas depois do horário.

#### Scenario: Comum atrasada
- **WHEN** às 08:45 uma dose comum das 08:00 ainda não foi respondida
- **THEN** ela aparece como "Atrasada" e continua com as ações "Tomei agora" e "Não tomar"

#### Scenario: Silenciado
- **WHEN** um medicamento silenciado tem uma dose das 08:00 sem resposta às 10:01
- **THEN** a dose vira perdida, sem nenhuma notificação ter sido enviada
