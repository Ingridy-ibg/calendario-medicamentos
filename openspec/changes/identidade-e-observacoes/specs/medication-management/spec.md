## ADDED Requirements

### Requirement: O detalhe mostra as observações
Quando o medicamento tiver observação, a tela de detalhe SHALL exibir um card "Observações" com o texto completo, logo abaixo do cabeçalho com nome e dosagem. Sem observação, o card SHALL NOT ser exibido. As observações SHALL NOT aparecer na agenda diária, no calendário, na lista de medicamentos nem nas notificações de dose.

#### Scenario: Medicamento com observação
- **WHEN** o usuário abre o detalhe de um medicamento com a observação "Tomar em jejum"
- **THEN** vê o card "Observações" com "Tomar em jejum" abaixo do nome e da dosagem

#### Scenario: Medicamento sem observação
- **WHEN** o usuário abre o detalhe de um medicamento sem observação
- **THEN** nenhum card de observações é exibido

#### Scenario: Notificação de dose comum
- **WHEN** chega a notificação de uma dose comum de um medicamento com observação
- **THEN** a notificação mostra nome e dosagem, sem a observação
