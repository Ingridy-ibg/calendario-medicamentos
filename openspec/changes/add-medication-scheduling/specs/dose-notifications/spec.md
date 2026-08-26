## Purpose

Entrega lembretes para cada dose devida com uma política de escalonamento guiada pela criticidade do medicamento, e captura a resposta do usuário a cada notificação.

## ADDED Requirements

### Requirement: A notificação dispara no horário previsto da dose
O sistema SHALL enviar uma notificação quando uma dose de esquema diário, intervalo em horas, dias da semana ou cíclico se tornar devida, a menos que as notificações estejam desativadas para aquele medicamento.

#### Scenario: Dose se torna devida
- **WHEN** a dose de um medicamento atinge seu horário previsto e as notificações estão ativadas para ele
- **THEN** o sistema envia uma notificação para essa dose

### Requirement: Medicamentos se necessário não geram notificação agendada
O sistema SHALL NOT agendar notificações para medicamentos do tipo se necessário, já que não existe horário previsto; o registro da dose é sempre iniciado manualmente pelo usuário dentro do app.

#### Scenario: Nenhuma notificação é agendada para "se necessário"
- **WHEN** um medicamento é cadastrado com esquema se necessário
- **THEN** o sistema não agenda nenhuma notificação para ele

### Requirement: Medicamentos comuns oferecem três ações de resposta
Para a notificação de um medicamento comum, o sistema SHALL oferecer três ações: "tomei agora", "adiar" e "não tomar".

#### Scenario: Ações da notificação comum
- **WHEN** uma notificação é exibida para a dose de um medicamento comum
- **THEN** o usuário pode escolher "tomei agora", "adiar" ou "não tomar"

### Requirement: A cascata de reenvio do comum é limitada a 4 notificações consecutivas sem resposta
Para um medicamento comum, se uma notificação não receber resposta dentro de uma janela de aceite de 30 minutos, o sistema SHALL enviar uma notificação de acompanhamento 30 minutos depois, até um total de 4 notificações para aquela dose, antes de marcá-la como perdida.

#### Scenario: As quatro notificações ficam sem resposta
- **WHEN** a notificação de uma dose de medicamento comum e mais 3 notificações de acompanhamento (cada uma 30 minutos depois) ficam todas sem resposta
- **THEN** o sistema marca a dose como perdida e não envia mais notificações para ela

### Requirement: O "adiar" explícito não conta no limite de reenvio do comum
Quando o usuário toca explicitamente em "adiar" na notificação de um medicamento comum, o sistema SHALL agendar a próxima notificação 30 minutos depois sem contá-la no limite de 4 notificações sem resposta, permitindo que a cascata se estenda indefinidamente enquanto o usuário continuar respondendo.

#### Scenario: Adiamentos explícitos repetidos não esgotam o limite
- **WHEN** o usuário toca em "adiar" cinco vezes seguidas na mesma notificação de dose comum
- **THEN** a dose não é marcada como perdida, e uma nova notificação é agendada 30 minutos após cada toque em "adiar"

### Requirement: A dose comum só se torna perdida por silêncio, nunca por ter sido resolvida
Uma dose comum SHALL alcançar o status perdida apenas através de 4 notificações consecutivas sem resposta; uma dose resolvida via "tomei agora" ou "não tomar" em qualquer momento SHALL NOT se tornar perdida.

#### Scenario: Tomando a dose na quarta notificação
- **WHEN** o usuário toca em "tomei agora" na 4ª notificação de uma dose comum
- **THEN** a dose é registrada como tomada (com o horário de confirmação), não como perdida

### Requirement: Medicamentos especiais só permitem confirmar a dose
Para a notificação de um medicamento especial, o sistema SHALL oferecer apenas a ação "tomei agora"; SHALL NOT oferecer uma ação de "não tomar"/pular.

#### Scenario: Notificação especial não tem opção de pular
- **WHEN** uma notificação é exibida para a dose de um medicamento especial
- **THEN** a única ação disponível é "tomei agora"

### Requirement: Medicamentos especiais reenviam indefinidamente até serem confirmados
Para um medicamento especial, se uma notificação de dose não receber resposta (ou "adiar" for tocado) dentro da janela de 30 minutos, o sistema SHALL enviar uma notificação de acompanhamento 30 minutos depois, repetindo indefinidamente até que "tomei agora" seja confirmado. Doses especiais SHALL NOT ser marcadas como perdidas.

#### Scenario: Dose especial ignorada durante a noite
- **WHEN** a notificação da dose de um medicamento especial não é respondida por várias horas, incluindo durante a noite
- **THEN** o sistema continua enviando uma notificação de acompanhamento a cada 30 minutos até o usuário confirmar "tomei agora"

### Requirement: Notificações especiais usam um estilo crítico e difícil de ignorar
O sistema SHALL apresentar as notificações de medicamentos especiais usando uma apresentação crítica/estilo alarme (ex: tela cheia), distinta do estilo de notificação padrão usado para medicamentos comuns.

#### Scenario: Estilo de notificação especial
- **WHEN** uma notificação dispara para a dose de um dia ativo de um medicamento especial
- **THEN** ela é apresentada usando o estilo de notificação crítico/alarme, não o estilo padrão

### Requirement: Lembretes de dia de pausa do ciclo são sempre leves, mesmo para medicamentos especiais
Durante os dias de pausa de um medicamento cíclico, o sistema SHALL enviar um lembrete diário leve, informativo e sem ação, nunca a notificação de estilo crítico/alarme, independentemente da criticidade do medicamento.

#### Scenario: Lembrete de dia de pausa durante a pausa de um medicamento cíclico especial
- **WHEN** um medicamento cíclico especial está dentro da sua janela de dias de pausa
- **THEN** o lembrete diário de pausa usa o estilo de notificação leve e não exige ação de confirmação

### Requirement: Dispensar uma notificação não tem efeito no ciclo de reenvio
Arrastar/dispensar uma notificação pelo sistema Android SHALL NOT interromper ou alterar o ciclo de reenvio daquela dose.

#### Scenario: Arrastando uma notificação para dispensá-la
- **WHEN** o usuário arrasta uma notificação de dose para dispensá-la sem tocar em nenhuma ação
- **THEN** o sistema continua sua cascata de reenvio normal como se a notificação não tivesse recebido resposta

### Requirement: Notificações podem ser desativadas por medicamento apenas dentro do aplicativo
O sistema SHALL permitir que o usuário desative as notificações de um medicamento específico, e esse controle SHALL estar disponível apenas dentro do aplicativo (não pela interface de notificações do sistema Android).

#### Scenario: Desativando notificações de um medicamento
- **WHEN** o usuário desativa as notificações de um medicamento específico dentro do aplicativo
- **THEN** o sistema para de enviar notificações para as doses desse medicamento, continuando a agendá-las e rastreá-las normalmente
