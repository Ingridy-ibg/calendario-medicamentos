## ADDED Requirements

### Requirement: Alarme de início de nova cartela
A dose de início de nova cartela SHALL notificar como uma dose do medicamento cíclico, ou seja, especial:
- apresentação crítica/estilo alarme;
- apenas a ação "tomei agora";
- reenvio a cada 30 minutos, indefinidamente, até a confirmação, inclusive nos dias seguintes ao previsto.

O conteúdo SHALL deixar claro que é o início de uma nova cartela, com o nome do medicamento (ex.: título "Nova cartela: <nome>" e texto "Hora de tomar o 1º comprimido da nova cartela"). Tocar em "tomei agora" SHALL iniciar o ciclo como a confirmação pela agenda. Com as notificações do medicamento desativadas, a dose de início SHALL existir sem alarme.

#### Scenario: Alarme no dia previsto
- **WHEN** um anticoncepcional 21/7 tem o início da nova cartela previsto para 29/10 às 22:00
- **THEN** em 29/10 às 22:00 toca o alarme especial "Nova cartela: <nome>" com a ação "tomei agora"

#### Scenario: Alarme sem resposta atravessa o dia
- **WHEN** o alarme de início de cartela de 29/10 às 22:00 fica sem resposta
- **THEN** o sistema continua reenviando a cada 30 minutos, inclusive em 30/10, até o usuário tocar em "tomei agora"

#### Scenario: Confirmando pelo alarme
- **WHEN** o usuário toca em "tomei agora" no alarme de início de cartela às 22:10
- **THEN** o ciclo começa com dia 1 às 22:10, o estoque diminui uma unidade, os reenvios param e a dose do dia 2 fica agendada para amanhã

#### Scenario: Notificações desativadas
- **WHEN** um cíclico com notificações desativadas chega ao dia de início da nova cartela
- **THEN** nenhum alarme toca, e a agenda mostra o medicamento aguardando a nova cartela
