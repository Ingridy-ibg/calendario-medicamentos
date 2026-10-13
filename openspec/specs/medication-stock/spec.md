# medication-stock Specification

## Purpose
Mantém a contagem de quantas unidades restam de cada medicamento e avisa o usuário quando está na hora de comprar mais, para que ele nunca fique sem a medicação em mãos.

## Requirements

### Requirement: Estoque inicial capturado no cadastro
O sistema SHALL capturar, no cadastro de todo medicamento, a quantidade atual em estoque e a quantidade de unidades por embalagem.

#### Scenario: Cadastrando o estoque inicial
- **WHEN** o usuário cadastra um medicamento informando 30 unidades em estoque e 30 unidades por embalagem
- **THEN** o sistema registra esses valores como o estoque inicial do medicamento

### Requirement: Decremento automático do estoque ao confirmar uma dose
Quando uma dose de um medicamento é confirmada como tomada, o sistema SHALL decrementar em uma unidade a quantidade em estoque desse medicamento.

#### Scenario: Confirmar uma dose reduz o estoque
- **WHEN** o usuário confirma "tomei agora" para uma dose de um medicamento com 10 unidades em estoque
- **THEN** o estoque desse medicamento passa a ser 9 unidades

### Requirement: Reposição manual do estoque
O sistema SHALL permitir que o usuário registre manualmente uma reposição de estoque (por exemplo, ao comprar uma nova embalagem), somando a quantidade informada ao estoque atual do medicamento.

#### Scenario: Registrando a compra de uma nova caixa
- **WHEN** o usuário registra a reposição de uma embalagem de 30 unidades para um medicamento com 2 unidades em estoque
- **THEN** o estoque desse medicamento passa a ser 32 unidades

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

### Requirement: Registro de compra pelo detalhe do medicamento
A tela de detalhe de um medicamento SHALL oferecer a ação "Registrar compra", que sugere como quantidade padrão uma embalagem (a quantidade por embalagem do medicamento), permite escolher outra quantidade inteira positiva, e soma a quantidade escolhida ao estoque atual.

#### Scenario: Registrando uma caixa com o valor sugerido
- **WHEN** um medicamento tem 2 unidades em estoque e 30 por embalagem, e o usuário registra uma compra sem alterar a quantidade sugerida
- **THEN** o estoque passa a ser 32 unidades e o detalhe mostra o novo valor

#### Scenario: Registrando duas caixas
- **WHEN** o usuário escolhe 60 unidades na compra de um medicamento com 5 unidades em estoque
- **THEN** o estoque passa a ser 65 unidades

#### Scenario: Quantidade inválida
- **WHEN** o usuário informa 0, um número negativo ou um valor não numérico como quantidade comprada
- **THEN** o sistema mostra um erro e não altera o estoque

### Requirement: Previsão de quando o estoque acaba
O detalhe de um medicamento com doses agendadas SHALL mostrar até quando o estoque atual dura, considerando que cada dose futura prevista consome uma unidade a partir de hoje: a data exibida é a da dose prevista que consome a última unidade, seguindo a mesma projeção de doses futuras do calendário mensal (dias de pausa não consomem). Para intervalo em horas, cuja grade futura é estimada, a data SHALL ser indicada como aproximada. Com estoque zero, SHALL mostrar que o estoque acabou. Para medicamentos "se necessário" a previsão SHALL NOT ser exibida.

#### Scenario: Diário com uma dose por dia
- **WHEN** hoje é 12 de outubro, a dose de hoje já foi tomada, o medicamento é diário às 08:00 e há 12 unidades em estoque
- **THEN** o detalhe mostra "Dura até 24 de outubro"

#### Scenario: Cíclico atravessando a pausa
- **WHEN** um cíclico 21/7 tem estoque para mais doses do que os dias ativos restantes do ciclo atual
- **THEN** os dias de pausa não consomem estoque e a data cai num dia ativo do ciclo seguinte

#### Scenario: Intervalo em horas
- **WHEN** o medicamento é de intervalo em horas
- **THEN** a previsão é exibida como aproximada (ex.: "Dura até ~20 de outubro")

### Requirement: Correção manual do estoque
O usuário SHALL poder corrigir a quantidade em estoque pela edição do medicamento, substituindo o valor atual por um inteiro maior ou igual a zero, sem que isso conte como dose tomada nem altere o histórico.

#### Scenario: Corrigindo uma contagem errada
- **WHEN** o estoque registrado é 12 e o usuário edita o medicamento informando 10 unidades em estoque
- **THEN** o estoque passa a ser 10 e nenhuma dose é registrada

### Requirement: Estoque informado no cadastro em uso já desconta as doses de hoje
No cadastro em uso, a quantidade em estoque informada SHALL ser entendida como o que o usuário tem agora, depois das doses de hoje já tomadas; registrar essas doses como tomadas no cadastro SHALL NOT decrementar o estoque.

#### Scenario: Dose de hoje informada como tomada
- **WHEN** o usuário informa 8 unidades em estoque e marca a dose das 08:00 de hoje como tomada
- **THEN** o medicamento é salvo com 8 unidades em estoque

### Requirement: Aviso de estoque insuficiente para concluir o tratamento
Para um tratamento de duração fixa, quando o estoque for menor que o número de doses restantes, a confirmação do cadastro SHALL exibir um aviso com as doses restantes, o estoque, a data e hora da dose em que o estoque acaba e quantas unidades faltam. O aviso SHALL NOT impedir o cadastro.

#### Scenario: Faltam 11 doses e há 8 unidades
- **WHEN** um diário de 08:00 e 20:00 tem 11 doses restantes a partir das 20:00 de 12/10 e 8 unidades em estoque
- **THEN** a confirmação avisa "Faltam 11 doses e você tem 8", que o estoque acaba na dose de 16/10 às 08:00 e que faltam 3 unidades, e ainda permite confirmar

#### Scenario: Estoque suficiente
- **WHEN** o estoque é maior ou igual às doses restantes
- **THEN** nenhum aviso de estoque insuficiente é exibido

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
