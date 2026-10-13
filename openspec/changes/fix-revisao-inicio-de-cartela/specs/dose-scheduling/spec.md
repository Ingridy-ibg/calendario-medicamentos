## ADDED Requirements

### Requirement: A dose de início de cartela existe sempre que o início previsto chega
Para todo medicamento cíclico na agenda aguardando nova cartela, o sistema SHALL ter uma dose pendente de início de cartela no dia e horário do início previsto assim que esse dia chegar. Isso SHALL valer também quando o início previsto já passou antes de o app ser aberto ou atualizado, por exemplo uma pausa que terminou antes da versão com o alarme de início ou o app fechado por semanas. Nesse caso a dose SHALL ser criada no dia e horário previstos, aparecer como atrasada e disparar o alarme especial de início de cartela.

#### Scenario: Pausa terminada antes da atualização
- **WHEN** um cíclico 21/7 às 22:00 teve o dia 1 em 01/08, a pausa terminou em 28/08 e o app é aberto pela primeira vez na versão nova em 13/10
- **THEN** existe uma dose pendente de início de cartela em 29/08 às 22:00, a agenda mostra "Aguardando nova cartela · atrasada desde 29/08" e o alarme de início de cartela toca

#### Scenario: App sem abrir durante o início previsto
- **WHEN** o início previsto é 29/10 às 22:00, a janela de doses ainda não o incluía e o app só é aberto em 02/11
- **THEN** existe uma única dose pendente de início de cartela em 29/10 às 22:00, atrasada

### Requirement: No máximo uma dose de início de cartela pendente, inclusive após edição
O sistema SHALL manter no máximo uma dose pendente de início de cartela por medicamento. Ao editar o horário do ciclo, ou os dias ativos e de pausa, de um cíclico com a dose de início pendente, o sistema SHALL substituir essa dose pela do novo início previsto, em vez de criar uma segunda, e SHALL deixar só um alarme de início ativo.

#### Scenario: Horário editado depois do início previsto do dia
- **WHEN** a dose de início está prevista para hoje às 22:00, são 22:30, ela não foi confirmada e o usuário muda o horário do ciclo para 23:00
- **THEN** existe uma só dose pendente de início de cartela, hoje às 23:00, e só um alarme de início está agendado

#### Scenario: Horário editado com a cartela atrasada de dias anteriores
- **WHEN** a dose de início estava prevista para 29/10 às 22:00, hoje é 31/10 e o usuário muda o horário do ciclo para 21:00
- **THEN** existe uma só dose pendente de início de cartela, em 29/10 às 21:00, ainda atrasada
