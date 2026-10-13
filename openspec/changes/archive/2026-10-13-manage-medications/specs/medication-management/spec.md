## Purpose

Dá ao usuário um lugar para ver todos os seus medicamentos e chegar a cada um deles — mesmo os que não têm dose no dia — para consultar, editar, remover, repor estoque ou silenciar notificações.

## ADDED Requirements

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
