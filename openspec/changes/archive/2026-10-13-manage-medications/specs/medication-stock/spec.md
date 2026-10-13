## ADDED Requirements

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
