## ADDED Requirements

### Requirement: Marca de nova cartela também no dia de hoje
No calendário mensal, o dia de hoje SHALL mostrar a marca de "Nova cartela" quando tiver uma dose de início de cartela pendente e ainda não atrasada, como acontece nos dias futuros. Os status do histórico continuam valendo antes dela: uma dose atrasada, perdida ou resolvida no mesmo dia define a marca.

#### Scenario: Início hoje, ainda por vir
- **WHEN** a dose de início de cartela é hoje às 22:00, são 15:00 e o usuário abre o calendário
- **THEN** o dia de hoje aparece com a marca de "Nova cartela"

#### Scenario: Início de hoje já atrasado
- **WHEN** a dose de início de cartela era hoje às 08:00, são 09:00 e ela não foi confirmada
- **THEN** o dia de hoje aparece com a marca de dose atrasada

### Requirement: Atraso do início de cartela avaliado na hora de exibir
Na agenda, o estado "atrasada" do item "Aguardando nova cartela" SHALL seguir a mesma regra de atraso das doses (mais de 30 minutos depois do horário previsto) e SHALL refletir o horário do momento em que é exibido, inclusive com a agenda já aberta.

#### Scenario: Passa a tolerância com a agenda aberta
- **WHEN** o início da nova cartela é hoje às 22:00, a agenda foi aberta às 22:20 e continua aberta às 22:40
- **THEN** às 22:40 o item mostra "atrasada desde" a data de hoje, com o destaque de atraso
