## ADDED Requirements

### Requirement: Todo cíclico na agenda tem um início previsto de nova cartela
Para todo medicamento cíclico na agenda sem ciclo em andamento (aguardando nova cartela), o sistema SHALL manter uma data prevista para o início da nova cartela, no horário do ciclo:
- depois de um ciclo, o dia seguinte ao último dia de pausa (ou ao último dia ativo, quando o ciclo não tem pausa);
- num cíclico cadastrado sem "Já estava tomando" ou que volta à agenda, a data definida na confirmação (ver specs/medication-registration).

Editar o horário do ciclo SHALL mover o início previsto para o novo horário no mesmo dia. Editar dias ativos ou de pausa de um ciclo em andamento SHALL recalcular o início previsto a partir do dia 1 desse ciclo.

#### Scenario: Fim da pausa
- **WHEN** um cíclico 21/7 às 22:00 teve o dia 1 em 01/10
- **THEN** o início previsto da nova cartela é 29/10 às 22:00

#### Scenario: Horário editado durante a espera
- **WHEN** o início previsto é 29/10 às 22:00 e o usuário muda o horário do ciclo para 21:00 em 27/10
- **THEN** o início previsto passa a ser 29/10 às 21:00

### Requirement: Dose de início de nova cartela
No dia e horário do início previsto, o sistema SHALL ter uma dose pendente de início de cartela (dia 1 da nova cartela), com alarme como qualquer dose do medicamento. Enquanto ela não for confirmada, o sistema SHALL NOT agendar os dias 2 em diante da nova cartela, e ela SHALL continuar pendente nos dias seguintes até ser confirmada. Ela SHALL NOT ser marcada como perdida. Existe no máximo uma dose de início de cartela pendente por medicamento.

#### Scenario: Pausa termina
- **WHEN** um cíclico 21/7 às 22:00 termina a pausa em 28/10
- **THEN** em 29/10 às 22:00 existe uma dose pendente de início de cartela e nenhuma dose está agendada para 30/10 em diante

#### Scenario: Cartela não iniciada no dia
- **WHEN** a dose de início de cartela de 29/10 às 22:00 não foi confirmada até 31/10
- **THEN** ela continua pendente, nenhuma outra dose de início é criada e os dias 2 em diante continuam sem dose

## MODIFIED Requirements

### Requirement: Um novo ciclo só começa quando a primeira dose da nova cartela é confirmada
O sistema SHALL NOT avançar um medicamento cíclico para um novo ciclo até que o usuário confirme ter tomado a primeira dose da nova cartela; esse horário de confirmação se torna o dia 1 do novo ciclo, a partir do qual as janelas de ativo/pausa são recalculadas. A confirmação SHALL resolver a dose de início de cartela pendente:
- no dia previsto ou depois, ela fica como tomada (ou tomada com atraso, pelas regras de atraso), no dia em que estava prevista;
- antes do dia previsto, ela é descartada e o primeiro comprimido é registrado como tomado no dia da confirmação.

Em todos os casos, o dia 2 é o dia seguinte ao da confirmação.

#### Scenario: Pausa termina mas a nova cartela ainda não foi confirmada
- **WHEN** a janela configurada de dias de pausa de um medicamento cíclico termina e o usuário ainda não confirmou a primeira dose da nova cartela
- **THEN** o sistema mantém o medicamento em um estado de espera para início, sem dia 1 atribuído, com a dose de início de cartela pendente, até que a confirmação aconteça

#### Scenario: Confirmando a primeira dose de uma nova cartela
- **WHEN** o usuário confirma "tomei agora" para a primeira dose de uma nova cartela
- **THEN** o sistema define esse horário de confirmação como o dia 1 de um novo ciclo e recalcula as janelas de ativo/pausa a partir dessa data

#### Scenario: Confirmação dois dias depois do previsto
- **WHEN** a dose de início de cartela era em 29/10 às 22:00 e o usuário a confirma em 31/10 às 08:00
- **THEN** a dose de 29/10 fica como tomada com atraso, o dia 1 do ciclo é 31/10 às 08:00 e a dose do dia 2 é em 01/11 às 22:00

#### Scenario: Começando antes do previsto
- **WHEN** a dose de início de cartela é em 29/10 às 22:00 e o usuário toca em "Comecei a nova cartela" em 28/10 às 21:00
- **THEN** não há mais dose em 29/10 como início de cartela, o primeiro comprimido fica registrado como tomado em 28/10 e a dose do dia 2 é em 29/10 às 22:00

### Requirement: Ciclo já em andamento no cadastro
Para um cíclico cadastrado em uso, o sistema SHALL definir o dia 1 do ciclo atual a partir do dia informado — hoje menos (dia da cartela − 1) dias quando tomando, ou hoje menos (dias ativos + dia da pausa − 1) dias quando na pausa —, gerando a partir de hoje as doses dos dias ativos restantes e tratando os dias de pausa como no ciclo normal. Ao fim da pausa, a regra existente se mantém: o próximo ciclo só começa com a confirmação do primeiro comprimido da nova cartela, que tem sua dose de início de cartela no dia seguinte ao fim da pausa.

#### Scenario: Dia 12 de 21
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 12 da cartela, às 22:00
- **THEN** são agendadas doses de 12/10 a 21/10 às 22:00 (dias 12 a 21), 22/10 a 28/10 são dias de pausa, e a dose de início da nova cartela fica prevista para 29/10 às 22:00

#### Scenario: Dia 3 da pausa
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 3 da pausa
- **THEN** nenhuma dose dos dias ativos é agendada, 12/10 a 16/10 são dias de pausa, e a dose de início da nova cartela fica prevista para 17/10 no horário do ciclo

### Requirement: Voltar à agenda recomeça o esquema
Ao voltar para a agenda, o esquema SHALL recomeçar como num cadastro feito naquele momento: a duração fixa conta a partir do dia da volta; o cíclico recebe o início da nova cartela definido na confirmação da volta, como num cadastro novo (ver specs/medication-registration); horários de hoje já passados não geram dose. Horários de hoje que já têm uma dose resolvida (tomada, tomada com atraso ou pulada) SHALL NOT ganhar uma nova dose nem lembrete. Se a grade foi editada enquanto o medicamento estava fora da agenda, cada dose de hoje já resolvida SHALL contar como o horário da grade atual mais próximo do horário em que ela estava prevista (cada horário da grade só pode ser coberto por uma dose), e esse horário SHALL NOT ganhar dose nem lembrete. No intervalo em horas, a primeira dose SHALL ser a última dose tomada mais o intervalo, ou o momento da volta se esse horário já passou ou se não há dose tomada; se esse horário já tiver uma dose resolvida, a primeira dose SHALL avançar de intervalo em intervalo até um horário sem dose resolvida. A confirmação da volta SHALL mostrar esse mesmo horário.

#### Scenario: Tratamento de duração fixa
- **WHEN** um tratamento de 7 dias, iniciado há 20 dias e retirado da agenda, volta para a agenda em 12/10
- **THEN** as doses vão de 12/10 a 18/10

#### Scenario: Cíclico
- **WHEN** um cíclico das 22:00 volta para a agenda às 15:00
- **THEN** ele aparece aguardando a nova cartela, com a dose de início de cartela hoje às 22:00

#### Scenario: Dose de hoje já tomada antes de retirar
- **WHEN** um medicamento diário de 08:00 e 20:00 tem a dose das 20:00 de hoje tomada às 19:00, é retirado da agenda às 19:30 e volta às 19:45
- **THEN** hoje às 20:00 existe só a dose tomada, sem dose pendente nem lembrete, e a próxima dose é amanhã às 08:00

#### Scenario: Horário editado enquanto fora da agenda
- **WHEN** um medicamento diário de 08:00 e 20:00 tem a dose das 20:00 de hoje tomada às 19:00, é retirado da agenda, tem o horário da noite editado para 20:30 e volta às 19:45
- **THEN** a confirmação não mostra dose hoje às 20:30, nenhuma dose pendente nem lembrete é criado para hoje e a próxima dose é amanhã às 08:00

#### Scenario: Horário novo sem dose correspondente
- **WHEN** um medicamento diário de 08:00 tem a dose de hoje tomada, é retirado da agenda, passa a ser de 08:00 e 14:00 e volta às 10:00
- **THEN** a dose das 08:00 cobre o horário das 08:00 e a próxima dose é hoje às 14:00

#### Scenario: Intervalo com dose recente
- **WHEN** um medicamento de 8 em 8 horas tem dose tomada às 09:00, é retirado da agenda às 09:30 e volta às 10:00
- **THEN** a confirmação mostra e o app agenda a próxima dose para as 17:00

#### Scenario: Intervalo com a próxima já pulada
- **WHEN** um medicamento de 8 em 8 horas tem dose tomada às 09:00 e a das 17:00 pulada às 10:00, é retirado da agenda e volta às 11:00
- **THEN** a confirmação mostra e o app agenda a próxima dose para a 01:00 de amanhã, e às 17:00 de hoje existe só a dose pulada

#### Scenario: Intervalo com última dose antiga
- **WHEN** um medicamento de 8 em 8 horas tem a última dose tomada há dois dias e volta para a agenda às 10:00
- **THEN** a próxima dose é às 10:00
