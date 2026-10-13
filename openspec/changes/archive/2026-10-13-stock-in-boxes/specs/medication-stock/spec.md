## MODIFIED Requirements

### Requirement: Alerta de recompra quando o estoque fica baixo
O sistema SHALL sinalizar com alerta de recompra um medicamento de uso contínuo — diário, dias da semana ou intervalo em horas sem duração fixa, e todo cíclico — quando sua quantidade em estoque cair abaixo da quantidade de uma embalagem (está na última caixa), e SHALL remover essa sinalização assim que o estoque for reposto para uma embalagem ou mais. Medicamentos com duração fixa e "se necessário" SHALL NOT receber esse alerta (eles seguem os requisitos de estoque insuficiente e de alerta leve).

#### Scenario: Estoque abaixo de uma embalagem aciona o alerta
- **WHEN** o estoque de um medicamento diário de uso contínuo com 30 unidades por embalagem cai para 29 unidades ou menos
- **THEN** o sistema sinaliza esse medicamento com o alerta de recompra

#### Scenario: Reposição remove o alerta
- **WHEN** o estoque de um medicamento sinalizado com alerta de recompra é reposto para um valor igual ou acima de uma embalagem
- **THEN** o sistema remove a sinalização de alerta de recompra desse medicamento

#### Scenario: Tratamento com fim não recebe alerta de recompra
- **WHEN** um tratamento de 10 dias tem 20 unidades, 30 por embalagem, e só precisa de mais 10 doses
- **THEN** nenhum alerta de recompra é exibido

## ADDED Requirements

### Requirement: Estoque informado em caixas
O cadastro e a edição SHALL pedir o estoque como "Caixas fechadas", "Na caixa em uso" (opcional, 0 quando vazio) e "Unidades por caixa", e SHALL guardar a quantidade em unidades: caixas fechadas × unidades por caixa + unidades na caixa em uso. A quantidade na caixa em uso SHALL ser menor que as unidades por caixa. Ao editar, os campos SHALL abrir preenchidos a partir das unidades guardadas.

#### Scenario: Cadastro com uma caixa aberta
- **WHEN** o usuário informa 1 caixa fechada, 12 na caixa em uso e 30 por caixa
- **THEN** o medicamento é salvo com 42 unidades em estoque

#### Scenario: Caixa em uso maior que uma caixa
- **WHEN** o usuário informa 35 na caixa em uso e 30 por caixa
- **THEN** o campo mostra um erro e o cadastro não avança

#### Scenario: Edição preenchida
- **WHEN** o usuário edita um medicamento com 42 unidades e 30 por caixa
- **THEN** o formulário abre com 1 caixa fechada e 12 na caixa em uso

### Requirement: Estoque exibido em caixas
Onde o estoque aparece (agenda, lista, detalhe, compra e confirmação do cadastro), o sistema SHALL exibi-lo em caixas — "cartela"/"cartelas" para cíclicos —: com uma caixa, "1 caixa · restam N"; com mais de uma e uma delas em uso, "C caixas · uma em uso com N"; com todas cheias, "C caixas"; com zero unidades, "Acabou".

#### Scenario: Uma caixa
- **WHEN** um medicamento tem 12 unidades e 30 por caixa
- **THEN** o estoque aparece como "1 caixa · restam 12"

#### Scenario: Várias caixas com uma em uso
- **WHEN** um medicamento tem 72 unidades e 30 por caixa
- **THEN** o estoque aparece como "3 caixas · uma em uso com 12"

#### Scenario: Cíclico
- **WHEN** um cíclico tem 30 unidades e 21 por cartela
- **THEN** o estoque aparece como "2 cartelas · uma em uso com 9"

### Requirement: Estoque insuficiente para terminar o tratamento
Para um medicamento com duração fixa, quando o estoque for menor que o número de doses que ainda faltam até o fim do tratamento, o sistema SHALL exibir o alerta "Estoque insuficiente" com quantas unidades faltam para terminar, na agenda, na lista, no detalhe e na confirmação do cadastro, recalculado sempre que o estoque ou as doses mudarem.

#### Scenario: Faltam 3 para terminar
- **WHEN** um tratamento ainda tem 11 doses e o estoque é de 8 unidades
- **THEN** o medicamento aparece com "Estoque insuficiente · faltam 3 para terminar"

#### Scenario: Compra resolve
- **WHEN** o usuário registra a compra de uma caixa desse medicamento
- **THEN** o alerta de estoque insuficiente deixa de aparecer

### Requirement: Alerta leve de estoque do "se necessário"
Para um medicamento "se necessário", o sistema SHALL exibir um alerta leve (visualmente discreto, sem a cor de erro) "Estoque baixo" quando restarem menos de 5 unidades.

#### Scenario: Restam 4 unidades
- **WHEN** um "se necessário" fica com 4 unidades
- **THEN** o item mostra o alerta leve de estoque baixo

#### Scenario: Restam 5 unidades
- **WHEN** um "se necessário" tem 5 unidades
- **THEN** nenhum alerta de estoque aparece

### Requirement: Aviso de sobra ao fim do tratamento
Para um medicamento com duração fixa cujo estoque basta para terminar o tratamento, o detalhe do medicamento SHALL mostrar um aviso discreto com quantas unidades vão sobrar quando o tratamento acabar. Nenhum alerta SHALL aparecer na agenda ou na lista nesse caso.

#### Scenario: Vão sobrar 6
- **WHEN** um tratamento ainda tem 14 doses e o estoque é de 20 unidades
- **THEN** o detalhe mostra "Vão sobrar 6 quando o tratamento acabar" e a agenda não mostra alerta
