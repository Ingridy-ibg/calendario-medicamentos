## Purpose

Apresenta os medicamentos do usuário para que ele veja rapidamente o que é devido hoje, e oferece uma visão mensal mais ampla combinando a adesão real passada com o horário futuro previsto.

## ADDED Requirements

### Requirement: A agenda diária é a tela principal
O sistema SHALL apresentar uma agenda diária como a tela principal do aplicativo, listando toda dose devida naquele dia junto com seu status atual (pendente, aguardando confirmação, tomada, tomada com atraso, pulada ou perdida).

#### Scenario: Visualizando as doses de hoje
- **WHEN** o usuário abre o aplicativo
- **THEN** a agenda diária é exibida, listando cada dose de hoje com seu status atual

### Requirement: A agenda diária mostra a posição do ciclo para medicamentos cíclicos
Para um medicamento cíclico com dose devida hoje, a agenda diária SHALL mostrar sua posição atual dentro do ciclo (ex: dia 5 de 21, ou dia de pausa).

#### Scenario: Posição do medicamento cíclico exibida
- **WHEN** a agenda de hoje inclui um medicamento cíclico que está no dia 5 dos seus 21 dias ativos
- **THEN** o item desse medicamento mostra "dia 5 de 21"

### Requirement: Agenda diária mostra medicamentos "se necessário" disponíveis para registrar
Para um medicamento se necessário, a agenda diária SHALL mostrar quantas doses já foram registradas hoje em relação ao limite diário configurado, e SHALL permitir registrar uma nova dose a qualquer momento a partir dessa tela.

#### Scenario: Progresso do limite diário exibido
- **WHEN** a agenda de hoje inclui um medicamento se necessário com limite de 4 doses e 2 já registradas
- **THEN** o item desse medicamento mostra "2 de 4" e oferece uma ação para registrar uma nova dose

### Requirement: Agenda diária sinaliza alerta de estoque baixo
Quando um medicamento estiver com o alerta de recompra ativo, a agenda diária SHALL exibir essa sinalização junto ao item desse medicamento.

#### Scenario: Alerta de estoque exibido na agenda
- **WHEN** um medicamento listado na agenda de hoje está com alerta de recompra ativo
- **THEN** o item desse medicamento exibe a sinalização de estoque baixo

### Requirement: Medicamentos com duração encerrada não aparecem na agenda diária
Um medicamento de esquema diário, intervalo em horas ou dias da semana cuja duração fixa tenha terminado SHALL NOT aparecer na agenda diária nem receber mais notificações, embora permaneça visível no histórico de adesão.

#### Scenario: Curso concluído excluído da agenda de hoje
- **WHEN** o curso de duração fixa de um medicamento termina
- **THEN** ele não aparece mais na agenda diária

### Requirement: O calendário mensal mostra o histórico real para dias passados
O sistema SHALL fornecer uma visão de calendário mensal onde dias passados exibem o resultado de adesão realmente registrado para cada dose que ocorreu.

#### Scenario: Visualizando um dia passado
- **WHEN** o usuário navega no calendário mensal até um dia no passado
- **THEN** as doses exibidas para aquele dia refletem seu histórico de adesão registrado, não uma grade reestimada

### Requirement: O calendário mensal mostra o horário previsto para dias futuros
O sistema SHALL fornecer uma visão de calendário mensal onde dias futuros exibem o horário previsto: dias ativos/pausa definitivos para medicamentos cíclicos, os horários fixos definitivos para esquemas diário e dias da semana, e uma grade estimada para medicamentos de intervalo em horas (já que seu horário futuro real depende de quando cada dose é de fato confirmada). Medicamentos se necessário SHALL NOT aparecer com doses previstas em dias futuros, já que não têm horário agendado.

#### Scenario: Visualizando um dia futuro de um medicamento cíclico
- **WHEN** o usuário navega no calendário mensal até um dia futuro que cai dentro da janela ativa ou de pausa configurada de um medicamento cíclico
- **THEN** o calendário mostra esse dia como ativo ou de pausa, conforme o padrão configurado do medicamento

#### Scenario: Visualizando um dia futuro de um medicamento de intervalo em horas
- **WHEN** o usuário navega no calendário mensal até um dia futuro de um medicamento de intervalo em horas
- **THEN** o calendário mostra as doses daquele dia como uma estimativa baseada no horário atual, não um horário garantido
