## ADDED Requirements

### Requirement: Controle de notificações no detalhe do medicamento
A tela de detalhe de cada medicamento SHALL ter um interruptor "Notificações" que mostra se os lembretes desse medicamento estão ativos e permite desativá-los ou reativá-los. Para medicamentos "se necessário", que não têm notificação agendada, o interruptor SHALL NOT ser exibido.

#### Scenario: Silenciando um medicamento
- **WHEN** o usuário desliga o interruptor "Notificações" no detalhe de um medicamento
- **THEN** os lembretes já agendados desse medicamento são cancelados imediatamente, nenhum novo lembrete é enviado, e as doses continuam aparecendo na agenda para serem confirmadas ou puladas manualmente

#### Scenario: Reativando um medicamento
- **WHEN** o usuário liga de novo o interruptor de um medicamento silenciado que tem uma dose pendente ainda no futuro
- **THEN** o lembrete dessa dose volta a ser agendado

#### Scenario: Medicamento se necessário
- **WHEN** o usuário abre o detalhe de um medicamento "se necessário"
- **THEN** o interruptor de notificações não aparece

### Requirement: Mudanças no medicamento reconciliam as notificações na hora
Editar, remover, silenciar ou reativar um medicamento SHALL atualizar os lembretes agendados no sistema operacional imediatamente, sem esperar a próxima abertura do app ou a tarefa periódica.

#### Scenario: Horário editado
- **WHEN** o usuário muda o horário de um medicamento diário de 20:00 para 21:00
- **THEN** o lembrete das 20:00 de hoje deixa de existir e passa a existir um lembrete às 21:00
