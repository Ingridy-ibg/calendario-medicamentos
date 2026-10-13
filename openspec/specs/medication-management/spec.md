# medication-management Specification

## Purpose
Dá ao usuário um lugar para ver todos os seus medicamentos e chegar a cada um deles — mesmo os que não têm dose no dia — para consultar, editar, remover, repor estoque ou silenciar notificações.

## Requirements

### Requirement: Aba Medicamentos lista todos os medicamentos ativos
O aplicativo SHALL ter uma aba principal "Medicamentos", depois de "Agenda" e "Calendário" e no mesmo padrão visual delas, que lista todos os medicamentos não removidos em ordem alfabética, independentemente de terem dose no dia. Cada item SHALL mostrar nome, dosagem, um resumo do esquema (ex.: "Diário · 08:00, 20:00", "A cada 8 h", "Cíclico 21/7", "Se necessário · até 4 por dia") e a quantidade em estoque.

#### Scenario: Medicamento sem dose hoje aparece na lista
- **WHEN** um medicamento cíclico está em dia de pausa e o usuário abre a aba Medicamentos
- **THEN** esse medicamento aparece na lista

#### Scenario: Medicamento removido não aparece
- **WHEN** o usuário removeu um medicamento
- **THEN** ele não aparece mais na aba Medicamentos

#### Scenario: Lista vazia
- **WHEN** não há nenhum medicamento cadastrado
- **THEN** a aba mostra uma mensagem de lista vazia e uma ação para cadastrar o primeiro medicamento

### Requirement: A lista sinaliza estoque baixo e notificações silenciadas
Cada item da lista SHALL exibir a sinalização de estoque baixo quando o alerta de recompra estiver ativo, e uma indicação de "notificações silenciadas" quando as notificações daquele medicamento estiverem desativadas.

#### Scenario: Medicamento silenciado na lista
- **WHEN** o usuário desativou as notificações de um medicamento
- **THEN** o item desse medicamento na lista mostra a indicação de notificações silenciadas

### Requirement: A lista mostra a situação do ciclo dos medicamentos cíclicos
Para um medicamento cíclico, o item da lista SHALL mostrar a situação atual do ciclo: "Dia X de Y" nos dias ativos, ou "Em pausa · volta em N dias" nos dias de pausa (com "volta amanhã" quando N for 1). Quando o novo ciclo ainda depende da confirmação da primeira dose da nova cartela, SHALL mostrar "Aguardando nova cartela".

#### Scenario: Cíclico em pausa
- **WHEN** um medicamento 21/7 está no 5º dos 7 dias de pausa
- **THEN** seu item na lista mostra "Em pausa · volta em 3 dias"

#### Scenario: Cíclico em dia ativo
- **WHEN** um medicamento 21/7 está no dia 12 dos dias ativos
- **THEN** seu item na lista mostra "Dia 12 de 21"

### Requirement: O detalhe mostra a adesão dos últimos 7 dias
A tela de detalhe de um medicamento com doses agendadas SHALL mostrar os últimos 7 dias (incluindo hoje), cada dia com a cor do pior status registrado das suas doses — usando as mesmas cores de status do calendário —, o total de doses tomadas sobre o total de doses do período, e um atalho para o calendário. Dias sem dose prevista (pausa, dia da semana sem dose, antes do cadastro) SHALL aparecer neutros. Para medicamentos "se necessário" esse bloco SHALL NOT ser exibido.

#### Scenario: Semana com uma dose perdida
- **WHEN** nos últimos 7 dias um medicamento diário teve 6 doses tomadas e 1 perdida
- **THEN** o detalhe mostra 6 dias na cor de tomada, 1 na cor de perdida e "6 de 7 tomadas"

#### Scenario: Medicamento cadastrado há 3 dias
- **WHEN** o medicamento foi cadastrado há 3 dias
- **THEN** os 4 dias anteriores ao cadastro aparecem neutros e o total considera só as doses existentes

### Requirement: A lista permite cadastrar um novo medicamento
A aba Medicamentos SHALL oferecer uma ação para abrir o formulário de cadastro de novo medicamento.

#### Scenario: Cadastrando a partir da lista
- **WHEN** o usuário toca na ação de novo medicamento na aba Medicamentos e salva o cadastro
- **THEN** o novo medicamento passa a aparecer na lista

### Requirement: Tela de detalhe do medicamento
O sistema SHALL oferecer uma tela de detalhe para cada medicamento, aberta ao tocar no item na aba Medicamentos ou no item do medicamento na agenda diária. A tela SHALL mostrar nome, dosagem, criticidade, o esquema por extenso, a quantidade em estoque e por embalagem, o estado das notificações, e SHALL oferecer as ações registrar compra, ativar/desativar notificações, editar e remover.

#### Scenario: Abrindo o detalhe pela agenda
- **WHEN** o usuário toca no nome de um medicamento na agenda diária
- **THEN** a tela de detalhe desse medicamento é aberta

#### Scenario: Abrindo o detalhe pela lista
- **WHEN** o usuário toca num medicamento na aba Medicamentos
- **THEN** a tela de detalhe desse medicamento é aberta

#### Scenario: Ações da agenda continuam funcionando
- **WHEN** o usuário toca em "Tomei agora" ou "Não tomar" num item da agenda
- **THEN** a dose é resolvida como antes, sem abrir a tela de detalhe

### Requirement: Telas refletem as mudanças imediatamente
Depois de editar, remover, registrar compra ou mudar as notificações de um medicamento, a tela de detalhe, a aba Medicamentos, a agenda diária e o calendário SHALL exibir os dados atualizados ao serem mostrados de novo, sem reiniciar o app.

#### Scenario: Estoque atualizado na agenda
- **WHEN** o usuário registra uma compra que deixa o estoque de um medicamento com alerta de recompra igual ou acima de uma embalagem e volta para a agenda
- **THEN** o item desse medicamento na agenda não mostra mais a sinalização de estoque baixo

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
A aba Medicamentos SHALL carregar a lista em páginas de 20 medicamentos, carregando a próxima página ao chegar ao fim da rolagem, e SHALL voltar à primeira página quando o filtro mudar. Um medicamento SHALL NOT aparecer mais de uma vez na lista, mesmo que o fim da rolagem seja atingido várias vezes seguidas. Ao voltar para a aba (por exemplo, depois de abrir o detalhe de um medicamento), a lista SHALL mostrar os dados atualizados mantendo a quantidade de itens já carregados.

#### Scenario: Mais de 20 medicamentos
- **WHEN** há 45 medicamentos e o usuário rola até o fim da lista
- **THEN** a lista mostra os 20 primeiros, depois 40 e depois os 45

#### Scenario: Fim da rolagem atingido duas vezes seguidas
- **WHEN** há 45 medicamentos, 20 estão carregados e o fim da rolagem é atingido duas vezes antes de a lista se atualizar
- **THEN** a lista passa a mostrar 40 medicamentos, cada um uma vez só

#### Scenario: Voltando do detalhe
- **WHEN** há 45 medicamentos, o usuário rolou até carregar 40, abre o detalhe do 35º e volta
- **THEN** a lista continua com 40 medicamentos carregados, com os dados atualizados
