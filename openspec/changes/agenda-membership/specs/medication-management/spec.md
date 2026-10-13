## ADDED Requirements

### Requirement: Medicamento na agenda ou fora da agenda
Todo medicamento cadastrado SHALL estar na agenda (padrão) ou fora da agenda. Um medicamento fora da agenda SHALL continuar cadastrado, editável e com seu histórico, mas SHALL NOT ter doses futuras, lembretes nem alertas de estoque, e SHALL NOT aparecer na agenda diária nem nos dias futuros do calendário.

#### Scenario: Fora da agenda continua consultável
- **WHEN** um medicamento está fora da agenda
- **THEN** ele aparece na aba Medicamentos com o selo "Fora da agenda", seu detalhe abre normalmente e suas doses já registradas continuam no calendário

### Requirement: Retirar da agenda pelo detalhe
O detalhe de um medicamento na agenda SHALL ter, no rodapé, os botões "Retirar da agenda" (à esquerda) e "Excluir" (à direita). "Retirar da agenda" SHALL pedir confirmação e, confirmando, SHALL apagar as doses ainda não resolvidas, cancelar os lembretes e manter o histórico.

#### Scenario: Retirando da agenda
- **WHEN** o usuário toca em "Retirar da agenda" e confirma
- **THEN** o medicamento some da agenda, seus lembretes são cancelados, o detalhe passa a mostrar "Adicionar à agenda" e o histórico continua no calendário

#### Scenario: Desistindo
- **WHEN** o usuário toca em "Retirar da agenda" e cancela
- **THEN** nada muda

### Requirement: Adicionar à agenda pelo detalhe
O detalhe de um medicamento fora da agenda SHALL ter, no rodapé, os botões "Adicionar à agenda" (à esquerda) e "Excluir" (à direita), e SHALL continuar permitindo "Editar". "Adicionar à agenda" SHALL abrir a tela de confirmação com o resumo do medicamento como se ele estivesse sendo cadastrado naquele momento, com as ações "Editar" (abre a edição) e "Adicionar à agenda" (confirma). O interruptor de notificações SHALL NOT aparecer enquanto o medicamento estiver fora da agenda.

#### Scenario: Voltando para a agenda
- **WHEN** o usuário toca em "Adicionar à agenda" no detalhe de um medicamento diário de 08:00 fora da agenda, às 10:00, e confirma o resumo
- **THEN** o medicamento volta para a agenda com a próxima dose amanhã às 08:00 e os lembretes reagendados

#### Scenario: Ajustando antes de voltar
- **WHEN** na confirmação o usuário toca em "Editar"
- **THEN** a edição do medicamento abre, e nada é agendado até ele confirmar a volta

### Requirement: Filtro da aba Medicamentos
A aba Medicamentos SHALL ter um ícone de filtro que mostra e esconde as opções "Todos" (padrão), "Na agenda" e "Fora da agenda". Com um filtro diferente de "Todos", o ícone SHALL aparecer destacado. Em "Todos", os medicamentos fora da agenda SHALL aparecer depois de todos os que estão na agenda, cada grupo em ordem alfabética.

#### Scenario: Filtro escondido por padrão
- **WHEN** o usuário abre a aba Medicamentos
- **THEN** as opções de filtro não aparecem até ele tocar no ícone de filtro, e a lista mostra todos os medicamentos

#### Scenario: Fora da agenda por último
- **WHEN** há "Amoxicilina" fora da agenda e "Losartana" e "Vitamina D" na agenda, sem filtro
- **THEN** a lista mostra Losartana, Vitamina D e, por último, Amoxicilina

#### Scenario: Só fora da agenda
- **WHEN** o usuário escolhe "Fora da agenda"
- **THEN** só aparecem os medicamentos fora da agenda e o ícone de filtro fica destacado

### Requirement: Paginação da aba Medicamentos
A aba Medicamentos SHALL carregar a lista em páginas de 20 medicamentos, carregando a próxima página ao chegar ao fim da rolagem, e SHALL voltar à primeira página quando o filtro mudar.

#### Scenario: Mais de 20 medicamentos
- **WHEN** há 45 medicamentos e o usuário rola até o fim da lista
- **THEN** a lista mostra os 20 primeiros, depois 40 e depois os 45
