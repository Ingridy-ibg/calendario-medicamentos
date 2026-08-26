## Purpose

Mantém a contagem de quantas unidades restam de cada medicamento e avisa o usuário quando está na hora de comprar mais, para que ele nunca fique sem a medicação em mãos.

## ADDED Requirements

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
O sistema SHALL sinalizar um medicamento com alerta de recompra quando sua quantidade em estoque cair abaixo da quantidade de uma embalagem, e SHALL remover essa sinalização assim que o estoque for reposto acima desse limite.

#### Scenario: Estoque abaixo de uma embalagem aciona o alerta
- **WHEN** o estoque de um medicamento com 30 unidades por embalagem cai para 29 unidades ou menos
- **THEN** o sistema sinaliza esse medicamento com o alerta de recompra

#### Scenario: Reposição remove o alerta
- **WHEN** o estoque de um medicamento sinalizado com alerta de recompra é reposto para um valor igual ou acima de uma embalagem
- **THEN** o sistema remove a sinalização de alerta de recompra desse medicamento
