## Purpose

Calcula quando cada dose de um medicamento é devida, para os cinco tipos de esquema (diário, intervalo em horas, dias da semana, cíclico e se necessário), e define como confirmações, doses puladas e limites de duração afetam as próximas doses.

## ADDED Requirements

### Requirement: A próxima dose de intervalo em horas segue o horário real de confirmação
Para um esquema de intervalo em horas, quando uma dose é confirmada como tomada, o sistema SHALL calcular o horário da próxima dose como o horário real de confirmação mais o intervalo configurado, e não o horário originalmente previsto.

#### Scenario: Dose confirmada adiantada
- **WHEN** um medicamento de intervalo em horas com intervalo de 8 horas tem sua dose confirmada 2 horas antes do horário previsto
- **THEN** a próxima dose é agendada 8 horas após o horário real de confirmação, não 8 horas após o horário originalmente previsto

#### Scenario: Dose confirmada atrasada
- **WHEN** a dose de um medicamento de intervalo em horas é confirmada 4 horas após o horário previsto
- **THEN** a próxima dose é agendada 8 horas após o horário real de confirmação

### Requirement: Horários fixos de esquemas diário e dias da semana são independentes entre si
Para esquemas diário e dias da semana, cada horário configurado no dia SHALL permanecer no seu horário fixo original, independentemente de quando os outros horários daquele dia (ou de dias anteriores) forem confirmados.

#### Scenario: Confirmar um horário atrasado não desloca o próximo
- **WHEN** um medicamento diário com horários 8h e 20h tem sua dose das 8h confirmada às 9h
- **THEN** a dose das 20h permanece agendada para 20h, sem deslocamento

### Requirement: Pular uma dose preserva a grade original
Para qualquer esquema com horário previsto (diário, intervalo em horas, dias da semana), quando a dose de um medicamento comum é marcada como "não tomar" (pulada), o sistema SHALL NOT reiniciar o cálculo a partir do horário em que foi pulada; a próxima dose SHALL permanecer no horário fixo original ou originalmente previsto, conforme o tipo de esquema.

#### Scenario: Pular uma dose de intervalo em horas mantém a grade fixa
- **WHEN** a dose de um medicamento de intervalo em horas prevista para 14:00 (intervalo de 8 horas) é marcada como "não tomar"
- **THEN** a próxima dose permanece agendada para 22:00, independentemente de quando "não tomar" foi tocado

### Requirement: Esquemas de duração fixa param de agendar após o fim do curso
Para um esquema diário, intervalo em horas ou dias da semana com duração fixa, o sistema SHALL parar de gerar novas doses uma vez que o número configurado de dias tiver decorrido desde a primeira dose do medicamento, mantendo seu histórico de adesão acessível.

#### Scenario: Curso concluído
- **WHEN** um medicamento cadastrado com intervalo em horas de 8h e duração de 7 dias chega ao fim do 7º dia
- **THEN** o sistema não gera mais doses para esse medicamento, e suas doses passadas permanecem no histórico de adesão

### Requirement: Esquemas contínuos nunca param de agendar
Para um esquema diário, intervalo em horas ou dias da semana marcado como contínuo/indefinido, o sistema SHALL continuar gerando doses conforme o padrão configurado, sem data de término.

#### Scenario: Esquema contínuo continua gerando doses
- **WHEN** um medicamento é cadastrado como uso contínuo
- **THEN** o sistema continua agendando as próximas doses indefinidamente

### Requirement: Dias ativos do ciclo rastreiam uma posição dentro do ciclo
Enquanto um medicamento cíclico está dentro da sua janela de dias ativos, o sistema SHALL agendar uma dose por dia no horário diário configurado e SHALL rastrear a posição do dia atual dentro da janela ativa (ex: dia 5 de 21).

#### Scenario: Dia ativo no meio do ciclo
- **WHEN** um medicamento cíclico configurado com 21 dias ativos está no seu 5º dia ativo consecutivo confirmado
- **THEN** o sistema reporta a posição atual como dia 5 de 21 e agenda a próxima dose para o dia seguinte no horário configurado

### Requirement: Dias de pausa do ciclo não exigem confirmação de dose
Enquanto um medicamento cíclico está dentro da sua janela de dias de pausa, o sistema SHALL NOT exigir confirmação de dose e SHALL NOT calcular uma contagem de "próxima dose" para esses dias.

#### Scenario: Dia de pausa não tem dose para confirmar
- **WHEN** um medicamento cíclico com 21 dias ativos / 7 de pausa entra no dia 22
- **THEN** o sistema marca o dia 22 como dia de pausa, sem dose para confirmar

### Requirement: Um novo ciclo só começa quando a primeira dose da nova cartela é confirmada
O sistema SHALL NOT avançar um medicamento cíclico para um novo ciclo até que o usuário confirme ter tomado a primeira dose da nova cartela; esse horário de confirmação se torna o dia 1 do novo ciclo, a partir do qual as janelas de ativo/pausa são recalculadas.

#### Scenario: Pausa termina mas a nova cartela ainda não foi confirmada
- **WHEN** a janela configurada de dias de pausa de um medicamento cíclico termina e o usuário ainda não confirmou a primeira dose da nova cartela
- **THEN** o sistema mantém o medicamento em um estado de espera para início, sem dia 1 atribuído, até que a confirmação aconteça

#### Scenario: Confirmando a primeira dose de uma nova cartela
- **WHEN** o usuário confirma "tomei agora" para a primeira dose de uma nova cartela
- **THEN** o sistema define esse horário de confirmação como o dia 1 de um novo ciclo e recalcula as janelas de ativo/pausa a partir dessa data

### Requirement: Medicamentos se necessário não têm dose agendada
Para um esquema se necessário, o sistema SHALL NOT gerar um horário previsto de dose; a dose só existe quando o usuário a registra manualmente.

#### Scenario: Nenhuma dose pendente é criada automaticamente
- **WHEN** um medicamento é cadastrado com esquema se necessário
- **THEN** o sistema não cria nenhuma linha de dose pendente para ele, apenas rastreia o limite diário configurado

### Requirement: Limite diário de doses "se necessário"
O sistema SHALL comparar o número de doses já registradas hoje para um medicamento se necessário com o limite máximo configurado, e SHALL avisar o usuário ao tentar registrar uma dose que ultrapasse esse limite, sem impedir o registro.

#### Scenario: Aviso ao ultrapassar o limite diário
- **WHEN** o usuário registra uma dose de um medicamento se necessário cujo limite diário de 4 já foi atingido
- **THEN** o sistema exibe um aviso de que o limite diário foi ultrapassado, mas ainda assim registra a dose
