# agenda-views Specification

## Purpose
Apresenta os medicamentos do usuário para que ele veja rapidamente o que é devido hoje, e oferece uma visão mensal mais ampla combinando a adesão real passada com o horário futuro previsto.

## Requirements

### Requirement: A agenda diária é a tela principal
O sistema SHALL apresentar uma agenda diária como a tela principal do aplicativo, listando toda dose devida naquele dia junto com seu status atual (pendente, aguardando confirmação, tomada, tomada com atraso, pulada ou perdida).

#### Scenario: Visualizando as doses de hoje
- **WHEN** o usuário abre o aplicativo
- **THEN** a agenda diária é exibida, listando cada dose de hoje com seu status atual

### Requirement: A agenda diária mostra a posição do ciclo para medicamentos cíclicos
Para um medicamento cíclico com dose devida hoje, a agenda diária SHALL mostrar sua posição atual dentro do ciclo (ex: dia 5 de 21, ou dia de pausa).

#### Scenario: Posição do medicamento cíclico exibida
- **WHEN** a agenda de hoje inclui um medicamento cíclico que está no dia 5 dos seus 21 dias ativos
- **THEN** o item desse medicamento mostra "dia 5 de 21"

### Requirement: Agenda diária mostra medicamentos "se necessário" disponíveis para registrar
Para um medicamento se necessário, a agenda diária SHALL mostrar quantas doses já foram registradas hoje em relação ao limite diário configurado, e SHALL permitir registrar uma nova dose a qualquer momento a partir dessa tela.

#### Scenario: Progresso do limite diário exibido
- **WHEN** a agenda de hoje inclui um medicamento se necessário com limite de 4 doses e 2 já registradas
- **THEN** o item desse medicamento mostra "2 de 4" e oferece uma ação para registrar uma nova dose

### Requirement: Agenda diária sinaliza alerta de estoque baixo
Quando um medicamento estiver com o alerta de recompra ativo, a agenda diária SHALL exibir essa sinalização junto ao item desse medicamento.

#### Scenario: Alerta de estoque exibido na agenda
- **WHEN** um medicamento listado na agenda de hoje está com alerta de recompra ativo
- **THEN** o item desse medicamento exibe a sinalização de estoque baixo

### Requirement: Medicamentos com duração encerrada não aparecem na agenda diária
Um medicamento de esquema diário, intervalo em horas ou dias da semana cuja duração fixa tenha terminado SHALL NOT aparecer na agenda diária nem receber mais notificações, embora permaneça visível no histórico de adesão.

#### Scenario: Curso concluído excluído da agenda de hoje
- **WHEN** o curso de duração fixa de um medicamento termina
- **THEN** ele não aparece mais na agenda diária

### Requirement: O calendário mensal mostra o histórico real para dias passados
O sistema SHALL fornecer uma visão de calendário mensal onde dias passados exibem o resultado de adesão realmente registrado para cada dose que ocorreu.

#### Scenario: Visualizando um dia passado
- **WHEN** o usuário navega no calendário mensal até um dia no passado
- **THEN** as doses exibidas para aquele dia refletem seu histórico de adesão registrado, não uma grade reestimada

### Requirement: O calendário mensal mostra o horário previsto para dias futuros
O sistema SHALL fornecer uma visão de calendário mensal onde dias futuros exibem o horário previsto: dias ativos/pausa definitivos para medicamentos cíclicos, os horários fixos definitivos para esquemas diário e dias da semana, e uma grade estimada para medicamentos de intervalo em horas (já que seu horário futuro real depende de quando cada dose é de fato confirmada). Medicamentos se necessário SHALL NOT aparecer com doses previstas em dias futuros, já que não têm horário agendado.

#### Scenario: Visualizando um dia futuro de um medicamento cíclico
- **WHEN** o usuário navega no calendário mensal até um dia futuro que cai dentro da janela ativa ou de pausa configurada de um medicamento cíclico
- **THEN** o calendário mostra esse dia como ativo ou de pausa, conforme o padrão configurado do medicamento

#### Scenario: Visualizando um dia futuro de um medicamento de intervalo em horas
- **WHEN** o usuário navega no calendário mensal até um dia futuro de um medicamento de intervalo em horas
- **THEN** o calendário mostra as doses daquele dia como uma estimativa baseada no horário atual, não um horário garantido

### Requirement: A agenda diária mostra um resumo do dia
A agenda diária SHALL exibir, acima da lista, um resumo com quantas doses agendadas do dia já foram tomadas (tomada ou tomada com atraso) em relação ao total de doses agendadas do dia, uma marca visual por dose na cor do seu status, e a próxima dose pendente (nome e horário). Doses de medicamentos "se necessário" SHALL NOT entrar nessa contagem.

#### Scenario: Resumo com doses tomadas
- **WHEN** hoje há 5 doses agendadas, das quais 1 tomada e 1 tomada com atraso
- **THEN** o resumo mostra "2 / 5 doses"

#### Scenario: Próxima dose indicada
- **WHEN** a dose pendente de horário mais cedo hoje é Vitamina D às 14:00
- **THEN** o resumo mostra "Próxima: Vitamina D às 14:00"

#### Scenario: Todas as doses resolvidas
- **WHEN** não há mais nenhuma dose pendente ou aguardando hoje
- **THEN** o resumo não mostra próxima dose e informa que as doses do dia estão concluídas

#### Scenario: Dia sem doses agendadas
- **WHEN** hoje não há nenhuma dose agendada
- **THEN** o resumo não é exibido e a agenda mostra a mensagem de dia vazio

### Requirement: A agenda diária agrupa as doses por período
A agenda diária SHALL agrupar as doses agendadas em seções por período do horário previsto — Manhã (antes das 12:00), Tarde (12:00 até antes das 18:00) e Noite (a partir das 18:00) —, mantendo a ordem por horário dentro de cada seção, e SHALL exibir os medicamentos "se necessário" numa seção própria ao final. Seções vazias SHALL NOT ser exibidas.

#### Scenario: Doses em períodos diferentes
- **WHEN** hoje há doses às 08:00, 14:00 e 20:00
- **THEN** elas aparecem nas seções Manhã, Tarde e Noite, respectivamente

#### Scenario: Período sem doses
- **WHEN** hoje não há nenhuma dose depois das 18:00
- **THEN** a seção Noite não é exibida

### Requirement: A agenda diária destaca a próxima dose pendente
O item da próxima dose pendente SHALL ser destacado visualmente na lista (contorno na cor de destaque). Toda dose pendente ou aguardando, destacada ou não, SHALL continuar exibindo as ações "Tomei agora" e "Não tomar". Doses já resolvidas SHALL exibir um ícone do status no lugar das ações.

#### Scenario: Próxima dose com ações
- **WHEN** a dose de Vitamina D às 14:00 é a próxima pendente
- **THEN** seu item aparece destacado com os botões "Tomei agora" e "Não tomar"

#### Scenario: Dose resolvida sem ações
- **WHEN** a dose de Losartana às 08:00 já foi tomada
- **THEN** seu item mostra o ícone de tomada e o rótulo "Tomada", sem botões de ação

### Requirement: O calendário mensal tem legenda e marca hoje e o dia selecionado
O calendário mensal SHALL exibir uma legenda das cores de status usadas nos dias, SHALL diferenciar visualmente o dia de hoje (anel na cor de destaque) do dia selecionado (preenchido), e SHALL representar dias passados com histórico por um ponto preenchido na cor do pior status do dia e dias futuros com doses previstas por um ponto em contorno.

#### Scenario: Hoje selecionado por padrão
- **WHEN** o usuário abre o calendário
- **THEN** o dia de hoje aparece selecionado (preenchido) e o painel abaixo mostra as doses de hoje

#### Scenario: Selecionando outro dia
- **WHEN** o usuário toca num dia diferente de hoje
- **THEN** esse dia aparece preenchido, hoje continua marcado com um anel, e o painel mostra as doses do dia tocado

#### Scenario: Dia futuro com doses previstas
- **WHEN** um dia futuro tem doses previstas
- **THEN** o ponto desse dia aparece em contorno, e a legenda identifica o contorno como "Prevista"

### Requirement: Cíclico aguardando nova cartela aparece na agenda
A agenda diária SHALL listar todo medicamento cíclico que esteja aguardando o início de uma nova cartela (recém-cadastrado ou depois do fim da pausa), indicando "Aguardando nova cartela" e oferecendo a ação "Comecei a nova cartela". Essa ação SHALL registrar o primeiro comprimido como tomado agora (dia 1 do ciclo, descontando uma unidade do estoque), iniciar o ciclo e atualizar a agenda e os lembretes na hora.

#### Scenario: Cíclico recém-cadastrado
- **WHEN** o usuário cadastra um anticoncepcional 21/7 e abre a agenda
- **THEN** ele aparece como "Aguardando nova cartela" com a ação "Comecei a nova cartela"

#### Scenario: Iniciando a cartela
- **WHEN** o usuário toca em "Comecei a nova cartela" às 22:05
- **THEN** a agenda passa a mostrar a dose de hoje como tomada (dia 1 de 21), o estoque diminui uma unidade e a dose de amanhã fica prevista

#### Scenario: Depois da pausa
- **WHEN** os 7 dias de pausa terminam e a nova cartela ainda não foi iniciada
- **THEN** o medicamento volta a aparecer como "Aguardando nova cartela"

### Requirement: Atrasada na agenda e no calendário
A agenda diária SHALL exibir "Atrasada" (em âmbar, com ícone) nas doses não resolvidas que já passaram mais de 30 minutos do horário previsto, mantendo as ações da dose. O calendário mensal SHALL representar um dia com dose atrasada — e sem nenhuma perdida — com o ponto em contorno âmbar, e a legenda SHALL incluir "Atrasada".

#### Scenario: Agenda
- **WHEN** às 09:00 a dose das 08:00 ainda está pendente
- **THEN** o item mostra "Atrasada" em âmbar com os botões "Tomei agora" e "Não tomar"

#### Scenario: Calendário com especial atrasada de ontem
- **WHEN** a dose especial de ontem continua sem resposta
- **THEN** o dia de ontem aparece com o ponto em contorno âmbar e o painel do dia mostra a dose como "Atrasada"

### Requirement: O calendário mostra o dia de hoje com as doses reais
O calendário mensal SHALL montar o dia de hoje a partir das doses registradas, como os dias passados: doses resolvidas com seu status, não resolvidas como "Pendente" ou "Atrasada". O ponto do dia SHALL usar o pior status já registrado; sem nenhuma dose resolvida nem atrasada, SHALL aparecer em contorno.

#### Scenario: Dose de hoje tomada
- **WHEN** a dose de hoje das 08:00 foi tomada às 08:05
- **THEN** o calendário mostra hoje com o ponto cheio de tomada e o painel mostra "Tomada"

#### Scenario: Hoje ainda sem resposta no horário
- **WHEN** são 07:00 e a dose de hoje é às 08:00
- **THEN** hoje aparece com o ponto em contorno e o painel mostra a dose como "Pendente"

### Requirement: Estado do limite diário no item "se necessário"
O item de um medicamento "se necessário" na agenda diária SHALL indicar o estado do limite diário: abaixo do limite, sem destaque; com o limite atingido (registradas = limite), o contador em âmbar e a linha "Limite de hoje atingido"; acima do limite (registradas > limite), o contador em vermelho e a linha "Acima do limite recomendado". O estado SHALL ser comunicado também em texto, nunca só pela cor.

#### Scenario: Abaixo do limite
- **WHEN** um medicamento com limite de 4 tem 2 doses registradas hoje
- **THEN** o item mostra "2 de 4 hoje" sem aviso

#### Scenario: Limite atingido
- **WHEN** um medicamento com limite de 4 tem 4 doses registradas hoje
- **THEN** o item mostra "4 de 4 hoje" em âmbar e "Limite de hoje atingido"

#### Scenario: Acima do limite
- **WHEN** um medicamento com limite de 4 tem 5 doses registradas hoje
- **THEN** o item mostra "5 de 4 hoje" em vermelho e "Acima do limite recomendado"

### Requirement: Confirmação antes de registrar acima do limite
Ao registrar uma dose "se necessário" quando o limite diário já foi atingido, o sistema SHALL pedir confirmação com a mensagem "Você já tomou X de N hoje. Tomar mais que o recomendado não é aconselhado." e as opções "Cancelar" e "Registrar mesmo assim". Confirmando, a dose SHALL ser registrada normalmente; cancelando, nada SHALL ser registrado. Doses dentro do limite SHALL ser registradas sem confirmação.

#### Scenario: Dose dentro do limite
- **WHEN** o limite é 4, há 3 doses registradas hoje e o usuário toca em "Registrar dose"
- **THEN** a dose é registrada na hora, sem diálogo, e o item passa a mostrar "4 de 4 hoje · Limite de hoje atingido"

#### Scenario: Registrando acima do limite
- **WHEN** o limite é 4, há 4 doses registradas hoje, o usuário toca em "Registrar dose" e escolhe "Registrar mesmo assim"
- **THEN** a dose é registrada, o estoque diminui uma unidade e o item passa a mostrar "5 de 4 hoje · Acima do limite recomendado"

#### Scenario: Desistindo
- **WHEN** o diálogo de limite aparece e o usuário escolhe "Cancelar"
- **THEN** nenhuma dose é registrada e o estoque não muda

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
