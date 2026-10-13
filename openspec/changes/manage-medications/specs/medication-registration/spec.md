## ADDED Requirements

### Requirement: Edição pelo formulário preenchido
A edição de um medicamento SHALL usar o mesmo formulário do cadastro, preenchido com os valores atuais do medicamento e do seu esquema, com as mesmas validações. Os campos editáveis SHALL ser nome, dose, criticidade (exceto para cíclicos, sempre especiais), quantidade por embalagem, quantidade em estoque e todos os campos específicos do tipo de esquema. Salvar SHALL aplicar as alterações somente a doses futuras, mantendo intactas as doses já resolvidas.

#### Scenario: Formulário abre preenchido
- **WHEN** o usuário toca em "Editar" no detalhe de um medicamento diário com horários 08:00 e 20:00
- **THEN** o formulário abre com nome, dose, estoque, criticidade e os horários 08:00 e 20:00 já preenchidos

#### Scenario: Alterando os horários de um diário
- **WHEN** o usuário troca o horário 20:00 por 21:00 e salva
- **THEN** as doses de hoje em diante passam a ser às 21:00, e as doses já tomadas às 20:00 continuam no histórico com o horário original

#### Scenario: Edição inválida
- **WHEN** o usuário apaga o nome do medicamento e tenta salvar
- **THEN** o sistema mostra o erro de validação no campo e não altera o medicamento

#### Scenario: Cancelando a edição
- **WHEN** o usuário altera campos e fecha o formulário sem salvar
- **THEN** o medicamento permanece como estava

### Requirement: O tipo de esquema não muda na edição
Na edição, o sistema SHALL exibir o tipo de esquema atual sem permitir trocá-lo, e SHALL informar que, para usar outro tipo, é preciso remover o medicamento e cadastrá-lo de novo.

#### Scenario: Tipo exibido como fixo
- **WHEN** o usuário edita um medicamento de intervalo em horas
- **THEN** o tipo "A cada X horas" aparece selecionado e os outros tipos não podem ser escolhidos

### Requirement: Remoção pede confirmação
A remoção de um medicamento SHALL ser iniciada pela tela de detalhe e SHALL exigir uma confirmação explícita que informe que lembretes e doses futuras serão cancelados e que o histórico será mantido. Ao confirmar, o usuário SHALL voltar para a tela de onde abriu o detalhe.

#### Scenario: Confirmando a remoção
- **WHEN** o usuário toca em "Remover" e confirma
- **THEN** o medicamento é removido, suas notificações pendentes são canceladas, ele some da agenda e da lista, e suas doses já resolvidas continuam aparecendo no calendário

#### Scenario: Desistindo da remoção
- **WHEN** o usuário toca em "Remover" e cancela a confirmação
- **THEN** nada muda
