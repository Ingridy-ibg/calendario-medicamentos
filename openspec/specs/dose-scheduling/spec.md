# dose-scheduling Specification

## Purpose
Calcula quando cada dose de um medicamento é devida, para os cinco tipos de esquema (diário, intervalo em horas, dias da semana, cíclico e se necessário), e define como confirmações, doses puladas e limites de duração afetam as próximas doses.

## Requirements

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

### Requirement: Duração fixa conta a partir do início informado
Para esquemas diário, intervalo em horas e dias da semana com duração fixa, a contagem da duração SHALL partir da data de início do tratamento informada no cadastro em uso; sem essa informação, a data de início é o dia do cadastro.

#### Scenario: Tratamento iniciado antes do cadastro
- **WHEN** em 12/10 o usuário cadastra em uso um diário de 10 dias que começou em 08/10
- **THEN** a última dose agendada é em 17/10, e nenhuma dose é agendada a partir de 18/10

### Requirement: Primeira dose do intervalo a partir da última dose informada
Para um intervalo em horas cadastrado em uso, a primeira dose agendada SHALL ser a última dose informada mais o intervalo. Se esse horário já tiver passado no momento do cadastro, a primeira dose SHALL ser agendada para o momento do cadastro, e a confirmação SHALL indicar o horário em que ela estava prevista.

#### Scenario: Próxima dose no futuro
- **WHEN** às 10:00 o usuário cadastra em uso um "a cada 8 horas" com última dose às 06:00 de hoje
- **THEN** a primeira dose agendada é às 14:00 de hoje

#### Scenario: Próxima dose já atrasada
- **WHEN** às 16:00 o usuário cadastra em uso um "a cada 8 horas" com última dose às 06:00 de hoje
- **THEN** a primeira dose é agendada para as 16:00, e a confirmação informa que ela estava prevista para as 14:00

### Requirement: Ciclo já em andamento no cadastro
Para um cíclico cadastrado em uso, o sistema SHALL definir o dia 1 do ciclo atual a partir do dia informado — hoje menos (dia da cartela − 1) dias quando tomando, ou hoje menos (dias ativos + dia da pausa − 1) dias quando na pausa —, gerando a partir de hoje as doses dos dias ativos restantes e tratando os dias de pausa como no ciclo normal. Ao fim da pausa, a regra existente se mantém: o próximo ciclo só começa com a confirmação do primeiro comprimido da nova cartela.

#### Scenario: Dia 12 de 21
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 12 da cartela, às 22:00
- **THEN** são agendadas doses de 12/10 a 21/10 às 22:00 (dias 12 a 21), 22/10 a 28/10 são dias de pausa, e o medicamento fica aguardando a nova cartela a partir de 29/10

#### Scenario: Dia 3 da pausa
- **WHEN** em 12/10 o usuário cadastra em uso um cíclico 21/7 no dia 3 da pausa
- **THEN** nenhuma dose é agendada, 12/10 a 16/10 são dias de pausa, e o medicamento fica aguardando a nova cartela a partir de 17/10

### Requirement: O início de uma nova cartela é persistido
Ao confirmar o primeiro comprimido de uma nova cartela, o sistema SHALL gravar o horário da confirmação como dia 1 do ciclo do medicamento, de forma que a agenda, o calendário, os lembretes e as próximas aberturas do app passem a calcular dias ativos e de pausa a partir dessa data.

#### Scenario: Ciclo continua depois de reabrir o app
- **WHEN** o usuário confirma o primeiro comprimido de uma cartela 21/7 em 12/10 e fecha e reabre o app
- **THEN** a agenda de 13/10 mostra a dose do dia 2 de 21, e o calendário mostra 2/11 a 8/11 como pausa

### Requirement: A janela de doses futuras é renovada continuamente
Para todo esquema ativo com grade de horários (diário, dias da semana e cíclico com ciclo iniciado), o sistema SHALL manter as doses previstas materializadas para pelo menos as 2 semanas seguintes, renovando a janela (até 4 semanas à frente) sempre que o app é aberto ou volta ao primeiro plano e na tarefa periódica de segundo plano. A renovação SHALL NOT alterar nem duplicar doses já existentes, e SHALL respeitar a duração fixa e a remoção do medicamento.

#### Scenario: Uso contínuo depois de um mês
- **WHEN** um medicamento diário de uso contínuo foi cadastrado há 35 dias e o usuário abre o app
- **THEN** a agenda de hoje mostra a dose do dia e há doses previstas para pelo menos as 2 semanas seguintes

#### Scenario: Renovação sem duplicar
- **WHEN** a renovação roda duas vezes no mesmo dia
- **THEN** cada horário previsto continua com uma única dose, e doses já resolvidas não mudam

#### Scenario: Duração fixa encerrada
- **WHEN** a renovação roda para um tratamento de 10 dias já encerrado
- **THEN** nenhuma dose nova é criada

### Requirement: Medicamento fora da agenda não gera doses
O sistema SHALL NOT gerar, materializar nem renovar doses de um medicamento fora da agenda, em nenhum ponto (cadastro, edição, renovação da janela, tarefa de segundo plano).

#### Scenario: Renovação ignora
- **WHEN** a renovação da janela roda com um medicamento diário fora da agenda
- **THEN** nenhuma dose é criada para ele

#### Scenario: Edição fora da agenda
- **WHEN** o usuário edita os horários de um medicamento fora da agenda
- **THEN** a edição é salva e nenhuma dose é criada

### Requirement: Voltar à agenda recomeça o esquema
Ao voltar para a agenda, o esquema SHALL recomeçar como num cadastro feito naquele momento: a duração fixa conta a partir do dia da volta; o cíclico fica aguardando a nova cartela; horários de hoje já passados não geram dose. Horários de hoje que já têm uma dose resolvida (tomada, tomada com atraso ou pulada) SHALL NOT ganhar uma nova dose nem lembrete. Se a grade foi editada enquanto o medicamento estava fora da agenda, cada dose de hoje já resolvida SHALL contar como o horário da grade atual mais próximo do horário em que ela estava prevista (cada horário da grade só pode ser coberto por uma dose), e esse horário SHALL NOT ganhar dose nem lembrete. No intervalo em horas, a primeira dose SHALL ser a última dose tomada mais o intervalo, ou o momento da volta se esse horário já passou ou se não há dose tomada; se esse horário já tiver uma dose resolvida, a primeira dose SHALL avançar de intervalo em intervalo até um horário sem dose resolvida. A confirmação da volta SHALL mostrar esse mesmo horário.

#### Scenario: Tratamento de duração fixa
- **WHEN** um tratamento de 7 dias, iniciado há 20 dias e retirado da agenda, volta para a agenda em 12/10
- **THEN** as doses vão de 12/10 a 18/10

#### Scenario: Cíclico
- **WHEN** um cíclico volta para a agenda
- **THEN** ele aparece como "Aguardando nova cartela"

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
