## ADDED Requirements

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
