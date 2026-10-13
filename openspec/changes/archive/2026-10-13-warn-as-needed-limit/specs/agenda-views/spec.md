## ADDED Requirements

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
