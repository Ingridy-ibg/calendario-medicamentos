## ADDED Requirements

### Requirement: Observações do medicamento
O cadastro e a edição de um medicamento SHALL ter um campo opcional "Observações", de texto livre, com até 200 caracteres. Espaços no início e no fim SHALL ser descartados, e um texto vazio ou só com espaços SHALL ser tratado como "sem observações". Abaixo do campo, uma dica SHALL indicar onde a observação aparece: para prioridade comum, "Aparece só aqui no app, na tela deste medicamento."; para prioridade especial (incluindo cíclicos), que ela aparece também na tela do alarme. A dica SHALL acompanhar a prioridade escolhida no formulário.

#### Scenario: Cadastrando com observação
- **WHEN** o usuário cadastra um medicamento com a observação "Tomar em jejum"
- **THEN** o medicamento fica salvo com essa observação

#### Scenario: Observação só com espaços
- **WHEN** o usuário digita apenas espaços no campo e salva
- **THEN** o medicamento fica salvo sem observação

#### Scenario: Limite de tamanho
- **WHEN** o usuário tenta digitar mais de 200 caracteres
- **THEN** o campo não aceita além do 200º caractere

#### Scenario: Dica muda com a prioridade
- **WHEN** o usuário troca a prioridade de comum para especial no formulário
- **THEN** a dica do campo passa a dizer que a observação aparece na tela do alarme

#### Scenario: Editando a observação
- **WHEN** o usuário apaga a observação de um medicamento na edição e salva
- **THEN** o medicamento passa a não ter observação
