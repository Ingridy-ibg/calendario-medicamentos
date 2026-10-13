# medication-registration Specification

## Purpose
Permite ao usuário cadastrar, editar e remover medicamentos, capturando os campos necessários para orientar o cálculo de doses, as notificações e o controle de estoque: nome, dose, estoque, criticidade e a configuração do esquema de horário, escolhido entre cinco tipos.

## Requirements

### Requirement: Campos comuns do medicamento
O sistema SHALL exigir nome do medicamento, descrição da dose, criticidade (comum ou especial), quantidade em estoque e quantidade por embalagem para todo medicamento, independentemente do tipo de esquema.

#### Scenario: Cadastrando um medicamento com os campos comuns
- **WHEN** o usuário envia o formulário de cadastro com nome, dose, criticidade, quantidade em estoque e quantidade por embalagem preenchidos
- **THEN** o sistema aceita esses valores como parte do registro do medicamento

### Requirement: Seleção do tipo de esquema
O sistema SHALL exigir que o usuário escolha um tipo de esquema — diário, intervalo em horas, dias da semana, cíclico ou se necessário — antes de exibir os campos específicos daquele tipo, e SHALL exibir apenas os campos relevantes ao tipo escolhido.

#### Scenario: Escolhendo diário
- **WHEN** o usuário seleciona "diário" como tipo de esquema
- **THEN** o sistema exibe os campos de lista de horários fixos e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo intervalo em horas
- **WHEN** o usuário seleciona "intervalo em horas" como tipo de esquema
- **THEN** o sistema exibe os campos de intervalo entre doses e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo dias da semana
- **WHEN** o usuário seleciona "dias da semana" como tipo de esquema
- **THEN** o sistema exibe os campos de dias da semana, horários fixos e duração, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo cíclico
- **WHEN** o usuário seleciona "cíclico" como tipo de esquema
- **THEN** o sistema exibe os campos de dias ativos, dias de pausa e horário diário, e não exibe os campos dos outros tipos

#### Scenario: Escolhendo se necessário
- **WHEN** o usuário seleciona "se necessário" como tipo de esquema
- **THEN** o sistema exibe apenas o campo de limite máximo de doses por dia, sem campos de horário fixo nem duração

### Requirement: Campos do esquema diário
Para um esquema diário, o sistema SHALL exigir uma lista de um ou mais horários fixos no dia, e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Registrando múltiplos horários fixos
- **WHEN** o usuário cadastra um medicamento com tipo de esquema diário e horários 8h e 20h
- **THEN** o sistema agenda uma dose em cada um desses horários todos os dias, pelo período configurado de duração

### Requirement: Campos do esquema de intervalo em horas
Para um esquema de intervalo em horas, o sistema SHALL exigir o intervalo entre doses (em horas) e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Curso de duração fixa
- **WHEN** o usuário cadastra um medicamento com tipo de esquema intervalo em horas, intervalo de 8h e duração "7 dias"
- **THEN** o sistema agenda doses a cada 8 horas e marca o medicamento para parar de gerar doses após 7 dias de uso

#### Scenario: Uso contínuo
- **WHEN** o usuário cadastra um medicamento com tipo de esquema intervalo em horas e duração "uso contínuo"
- **THEN** o sistema agenda doses no intervalo configurado indefinidamente, sem data de término

### Requirement: Campos do esquema de dias da semana
Para um esquema de dias da semana, o sistema SHALL exigir uma lista de dias da semana, uma lista de horários fixos aplicados nesses dias, e uma duração que seja um número fixo de dias ou uso contínuo/indefinido.

#### Scenario: Registrando dias e horários específicos
- **WHEN** o usuário cadastra um medicamento com tipo de esquema dias da semana, dias segunda/quarta/sexta e horário 9h
- **THEN** o sistema agenda uma dose às 9h apenas nos dias segunda, quarta e sexta, pelo período configurado de duração

### Requirement: Campos do esquema cíclico
Para um esquema cíclico, o sistema SHALL exigir o número de dias ativos, o número de dias de pausa e o horário do dia para a dose diária.

#### Scenario: Cadastrando um ciclo 21/7
- **WHEN** o usuário cadastra um medicamento com tipo de esquema cíclico, 21 dias ativos, 7 dias de pausa e um horário diário de dose
- **THEN** o sistema registra o padrão ativo/pausa e o horário diário da dose para uso pelo cálculo de doses

### Requirement: Campos do esquema se necessário
Para um esquema se necessário, o sistema SHALL exigir apenas o limite máximo de doses por dia, sem horário fixo nem duração.

#### Scenario: Cadastrando um medicamento sem horário fixo
- **WHEN** o usuário cadastra um medicamento com tipo de esquema se necessário e limite de 4 doses por dia
- **THEN** o sistema registra o limite diário e não agenda nenhum horário fixo para esse medicamento

### Requirement: Medicamentos cíclicos são sempre especiais
O sistema SHALL tratar todo medicamento com esquema cíclico como criticidade especial, independentemente do valor de criticidade que o usuário selecionar.

#### Scenario: Medicamento cíclico força criticidade especial
- **WHEN** o usuário cadastra um medicamento com tipo de esquema cíclico e seleciona criticidade comum
- **THEN** o sistema armazena o medicamento como especial

### Requirement: Edição de um medicamento
O sistema SHALL permitir a edição dos campos de um medicamento e do seu esquema, e as alterações SHALL se aplicar apenas ao cálculo de doses futuras.

#### Scenario: Editando o intervalo da dose
- **WHEN** o usuário altera o intervalo de um medicamento de esquema intervalo em horas existente
- **THEN** as próximas doses são agendadas usando o novo intervalo, e o histórico de adesão já registrado não é alterado

### Requirement: Remoção de um medicamento
O sistema SHALL permitir a remoção de um medicamento, o que interrompe todo agendamento e notificação futuros, preservando seu histórico de adesão já existente.

#### Scenario: Removendo um medicamento ativo
- **WHEN** o usuário remove um medicamento que tem doses pendentes ou futuras
- **THEN** o sistema cancela suas notificações pendentes e para de gerar novas doses, e seus registros de adesão passados permanecem acessíveis

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

Se, no momento do toque em "Confirmar e agendar", os dados deixarem de passar na validação (por exemplo, porque a data mudou desde que a tela foi aberta), a tela SHALL mostrar a mensagem da validação, SHALL NOT salvar nada e SHALL continuar utilizável, para o usuário tocar em "Ajustar".

#### Scenario: Medicamento novo com horário de hoje já passado
- **WHEN** às 15:00 o usuário cadastra, sem "já estava tomando", um medicamento de seg/qua/sex às 14:00 numa segunda-feira
- **THEN** a confirmação mostra a próxima dose como "Qua às 14:00", e nenhuma dose de hoje é criada

#### Scenario: Ajustando antes de confirmar
- **WHEN** o usuário toca em "Ajustar" na confirmação
- **THEN** volta ao formulário com os valores que tinha preenchido e nada foi salvo

#### Scenario: Confirmando
- **WHEN** o usuário toca em "Confirmar e agendar"
- **THEN** o medicamento é salvo exatamente como mostrado na confirmação e o usuário volta para a agenda

#### Scenario: Dados que deixaram de valer ao confirmar
- **WHEN** o usuário informa em "Já estava tomando" um tratamento de 7 dias iniciado há 6 dias, abre a confirmação antes da meia-noite com "Adicionar à agenda" ligado e confirma depois da meia-noite
- **THEN** a confirmação mostra "Esse tratamento já terminou", nada é salvo e "Ajustar" leva de volta ao formulário preenchido

### Requirement: Explicação dos tipos de esquema no formulário
O formulário de medicamento (cadastro e edição) SHALL ter, ao lado do título "Como tomar", um botão de informação com o rótulo de acessibilidade "O que é cada tipo de esquema?". Ao tocá-lo, o sistema SHALL abrir sobre o formulário um modal que explica os cinco tipos de esquema, um por vez, na ordem Diário, A cada X horas, Dias da semana, Cíclico e Se necessário, cada um com nome, descrição curta, exemplo e pontos-chave coerentes com as regras de agendamento. O modal SHALL abrir no tipo selecionado no formulário e SHALL ter setas de anterior/próximo e uma bolinha por tipo, com a do tipo exibido destacada e cada bolinha levando ao seu tipo. O modal SHALL fechar ao tocar fora dele ou no botão voltar do Android, sem alterar o formulário.

#### Scenario: Abrindo no tipo selecionado
- **WHEN** o tipo "Cíclico" está selecionado e o usuário toca no botão de informação
- **THEN** o modal abre mostrando a explicação do tipo cíclico, com a 4ª bolinha destacada

#### Scenario: Passando pelos tipos
- **WHEN** o modal mostra "Diário" e o usuário toca na seta de próximo
- **THEN** o modal passa a mostrar "A cada X horas" e a 2ª bolinha fica destacada

#### Scenario: Indo direto por uma bolinha
- **WHEN** o usuário toca na 5ª bolinha
- **THEN** o modal mostra "Se necessário"

#### Scenario: Fechando
- **WHEN** o usuário toca fora do modal
- **THEN** o modal fecha e o formulário continua exatamente como estava

#### Scenario: Primeiro e último
- **WHEN** o modal mostra o primeiro tipo
- **THEN** a seta de anterior aparece desativada (o mesmo vale para a de próximo no último tipo)

### Requirement: Cadastrar sem adicionar à agenda
A tela de confirmação do cadastro SHALL ter o interruptor "Adicionar à agenda", ligado por padrão. Desligado, a confirmação SHALL mostrar que o medicamento será cadastrado sem entrar na agenda, SHALL esconder os blocos de próximas doses, cartela, tratamento e doses de hoje, e o cadastro SHALL salvar o medicamento fora da agenda, sem doses nem lembretes, ignorando as respostas de "Já estava tomando". Com o interruptor desligado, essas respostas SHALL NOT ser validadas nem impedir o cadastro.

#### Scenario: Cadastro padrão
- **WHEN** o usuário confirma o cadastro sem mexer no interruptor
- **THEN** o medicamento é cadastrado na agenda, como antes

#### Scenario: Só cadastrar
- **WHEN** o usuário desliga "Adicionar à agenda" e confirma
- **THEN** o medicamento aparece na aba Medicamentos com o selo "Fora da agenda" e não aparece na agenda nem gera lembretes

#### Scenario: Respostas de "Já estava tomando" que deixaram de valer
- **WHEN** o usuário informa em "Já estava tomando" um tratamento de 7 dias iniciado há 6 dias, abre a confirmação antes da meia-noite, desliga "Adicionar à agenda" e confirma depois da meia-noite
- **THEN** o medicamento é cadastrado fora da agenda, sem mensagem de erro e sem a tela travar
