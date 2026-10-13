## ADDED Requirements

### Requirement: "Só cadastrar" ignora a resposta do 1º comprimido
Quando o usuário desliga "Adicionar à agenda" na confirmação de um cíclico, o sistema SHALL ignorar a resposta à pergunta "Você já tomou o 1º comprimido hoje?", assim como já ignora "Já estava tomando". O medicamento SHALL ficar fora da agenda sem ciclo iniciado, sem início previsto de nova cartela e sem nenhuma dose. O início SHALL ser definido só quando ele voltar à agenda.

#### Scenario: Respondeu e depois escolheu só cadastrar
- **WHEN** às 23:00 o usuário cadastra um cíclico das 22:00, escolhe "Já tomei hoje", desliga "Adicionar à agenda" e toca em "Cadastrar"
- **THEN** o medicamento fica fora da agenda, sem ciclo iniciado, sem início previsto de nova cartela e sem nenhuma dose registrada

#### Scenario: Volta à agenda depois
- **WHEN** esse medicamento volta à agenda às 15:00 de outro dia
- **THEN** a confirmação mostra "Nova cartela: hoje às 22:00", como num cíclico cadastrado agora
