## ADDED Requirements

### Requirement: Cíclico aguardando nova cartela aparece na agenda
A agenda diária SHALL listar todo medicamento cíclico que esteja aguardando o início de uma nova cartela (recém-cadastrado ou depois do fim da pausa), indicando "Aguardando nova cartela" e oferecendo a ação "Comecei a nova cartela". Essa ação SHALL registrar o primeiro comprimido como tomado agora (dia 1 do ciclo, descontando uma unidade do estoque), iniciar o ciclo e atualizar a agenda e os lembretes na hora.

#### Scenario: Cíclico recém-cadastrado
- **WHEN** o usuário cadastra um anticoncepcional 21/7 e abre a agenda
- **THEN** ele aparece como "Aguardando nova cartela" com a ação "Comecei a nova cartela"

#### Scenario: Iniciando a cartela
- **WHEN** o usuário toca em "Comecei a nova cartela" às 22:05
- **THEN** a agenda passa a mostrar a dose de hoje como tomada (dia 1 de 21), o estoque diminui uma unidade e a dose de amanhã fica prevista

#### Scenario: Depois da pausa
- **WHEN** os 7 dias de pausa terminam e a nova cartela ainda não foi iniciada
- **THEN** o medicamento volta a aparecer como "Aguardando nova cartela"
