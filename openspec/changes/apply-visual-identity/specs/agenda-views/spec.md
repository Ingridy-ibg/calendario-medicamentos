## ADDED Requirements

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
