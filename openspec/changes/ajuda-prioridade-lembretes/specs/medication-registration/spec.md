## ADDED Requirements

### Requirement: Explicação das prioridades de lembrete no formulário
O formulário de medicamento (cadastro e edição) SHALL ter, ao lado do título "Prioridade dos lembretes", um botão de informação com o rótulo de acessibilidade "O que é cada prioridade?". Ao tocá-lo, o sistema SHALL abrir sobre o formulário um modal que explica as duas prioridades, uma por vez, na ordem Comum e Especial. Cada explicação SHALL ter nome, descrição curta, exemplo e pontos-chave coerentes com as regras de notificação:
- **Comum**: notificação com vibração e três ações (tomei agora, adiar, não tomar); repete a cada 30 minutos até 4 notificações sem resposta; depois disso a dose é marcada como perdida.
- **Especial**: alarme em tela cheia com som; só a ação "tomei agora"; repete a cada 30 minutos até a confirmação; nunca é marcada como perdida; medicamentos cíclicos são sempre especiais; a observação do medicamento aparece no alarme.

O modal SHALL abrir na prioridade efetiva do formulário (Especial para cíclicos, mesmo com a opção travada). SHALL ter setas de anterior/próximo e uma bolinha por prioridade, com a da prioridade exibida destacada e cada bolinha levando à sua prioridade. SHALL fechar ao tocar fora dele ou no botão voltar do Android, sem alterar o formulário (inclusive sem mudar a prioridade escolhida).

#### Scenario: Abrindo na prioridade selecionada
- **WHEN** a prioridade "Especial" está selecionada e o usuário toca no botão de informação
- **THEN** o modal abre mostrando a explicação da prioridade especial, com a 2ª bolinha destacada

#### Scenario: Cíclico abre no Especial
- **WHEN** o tipo "Cíclico" está selecionado e o usuário toca no botão de informação da prioridade
- **THEN** o modal abre mostrando a explicação da prioridade especial

#### Scenario: Passando para a próxima
- **WHEN** o modal mostra "Comum" e o usuário toca na seta de próximo
- **THEN** o modal passa a mostrar "Especial" e a seta de próximo fica desativada

#### Scenario: Indo direto por uma bolinha
- **WHEN** o modal mostra "Especial" e o usuário toca na 1ª bolinha
- **THEN** o modal mostra "Comum" e a seta de anterior fica desativada

#### Scenario: Fechando sem mudar nada
- **WHEN** o modal mostra "Especial", a prioridade escolhida no formulário é "Comum" e o usuário toca fora do modal
- **THEN** o modal fecha e a prioridade do formulário continua "Comum"
