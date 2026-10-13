## ADDED Requirements

### Requirement: Opção "Já estava tomando" no cadastro
O formulário de cadastro SHALL oferecer a opção "Já estava tomando", desligada por padrão, para todos os tipos de esquema exceto "se necessário". Ligada, SHALL exibir apenas as perguntas relevantes ao tipo escolhido:
- Diário ou dias da semana com duração fixa: data de início do tratamento.
- Diário ou dias da semana de uso contínuo: nenhuma pergunta de início.
- Intervalo em horas: data e hora da última dose; com duração fixa, também a data de início.
- Cíclico: se hoje é dia de tomar ou de pausa, e o número do dia atual na cartela (1 a dias ativos) ou na pausa (1 a dias de pausa). A opção "na pausa" SHALL NOT aparecer quando o ciclo não tem dias de pausa.

#### Scenario: Cíclico no meio da cartela
- **WHEN** o usuário cadastra um cíclico 21/7, liga "Já estava tomando", escolhe "Tomando" e informa o dia 12
- **THEN** o formulário aceita os dados e segue para a confirmação

#### Scenario: Se necessário
- **WHEN** o tipo de esquema escolhido é "se necessário"
- **THEN** a opção "Já estava tomando" não é exibida

#### Scenario: Opção desligada
- **WHEN** o usuário não liga "Já estava tomando"
- **THEN** o cadastro funciona como antes: o tratamento começa no momento do cadastro

### Requirement: Doses de hoje já passadas no cadastro em uso
Com "Já estava tomando" ligado, o formulário SHALL listar cada dose prevista para hoje cujo horário já passou e perguntar, para cada uma, se já foi tomada. As marcadas SHALL ser registradas como tomadas; as não marcadas SHALL NOT gerar dose (nem pendente nem perdida). Para intervalo em horas a pergunta SHALL NOT aparecer, já que a última dose informada cumpre esse papel.

#### Scenario: Diário com dose da manhã já tomada
- **WHEN** às 10:00 o usuário cadastra em uso um diário de 08:00 e 20:00 e marca que tomou a das 08:00
- **THEN** a dose das 08:00 de hoje fica registrada como tomada e a das 20:00 entra na agenda como pendente

#### Scenario: Dose de hoje não marcada
- **WHEN** o usuário deixa a dose das 08:00 desmarcada
- **THEN** não há dose das 08:00 de hoje na agenda nem no histórico

### Requirement: Validação dos dados de "em uso"
O sistema SHALL rejeitar, com mensagem no campo:
- data de início no futuro;
- tratamento de duração fixa cuja data de início faz o término cair antes de hoje ("Esse tratamento já terminou");
- última dose do intervalo no futuro;
- dia da cartela fora de 1 a dias ativos, ou dia da pausa fora de 1 a dias de pausa.

#### Scenario: Tratamento já encerrado
- **WHEN** o usuário informa um tratamento de 7 dias que começou há 10 dias
- **THEN** o campo de início mostra "Esse tratamento já terminou" e o cadastro não avança

#### Scenario: Dia da cartela inválido
- **WHEN** o usuário informa o dia 25 de um cíclico 21/7
- **THEN** o campo mostra um erro e o cadastro não avança

### Requirement: Confirmação obrigatória antes de salvar
Todo cadastro de medicamento, em uso ou não, SHALL passar por uma tela "Confira antes de salvar" que mostra o resumo calculado do que vai entrar na agenda, sem gravar nada até o usuário tocar em "Confirmar e agendar". "Ajustar" SHALL voltar ao formulário com todos os valores preenchidos. A tela SHALL mostrar, conforme o caso:
- nome, dose, esquema e criticidade;
- a próxima dose (com "hoje", "amanhã" ou a data) e, para esquemas com grade, as próximas doses seguintes;
- para duração fixa: dia atual do tratamento, doses restantes, data e hora da última dose;
- para cíclico em uso: dia da cartela, comprimidos restantes na cartela, último comprimido da cartela, período da pausa e a data prevista da nova cartela (indicada como prevista, já que ela só começa com a confirmação do primeiro comprimido);
- estoque e até quando ele dura;
- as doses de hoje marcadas como tomadas e as que entram na agenda;
- quando houver dias anteriores ao cadastro, o aviso de que eles ficam sem registro no histórico.

#### Scenario: Medicamento novo com horário de hoje já passado
- **WHEN** às 15:00 o usuário cadastra, sem "já estava tomando", um medicamento de seg/qua/sex às 14:00 numa segunda-feira
- **THEN** a confirmação mostra a próxima dose como "Qua às 14:00", e nenhuma dose de hoje é criada

#### Scenario: Ajustando antes de confirmar
- **WHEN** o usuário toca em "Ajustar" na confirmação
- **THEN** volta ao formulário com os valores que tinha preenchido e nada foi salvo

#### Scenario: Confirmando
- **WHEN** o usuário toca em "Confirmar e agendar"
- **THEN** o medicamento é salvo exatamente como mostrado na confirmação e o usuário volta para a agenda
