## ADDED Requirements

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
