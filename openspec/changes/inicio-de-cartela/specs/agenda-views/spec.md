## ADDED Requirements

### Requirement: O calendário mostra o início da nova cartela e os ciclos seguintes
Para um medicamento cíclico na agenda, o calendário mensal SHALL mostrar o dia de início de cada nova cartela com uma marca própria, distinta do ponto de dose prevista, e o painel do dia SHALL listar o medicamento como "Início da nova cartela" com o horário. A partir do início previsto, o calendário SHALL projetar os ciclos seguintes (dias ativos, dias de pausa e o início da cartela seguinte), repetindo o padrão configurado até o fim do mês exibido. Se o início previsto já passou sem confirmação, a projeção SHALL supor que a cartela começa hoje. A legenda SHALL incluir "Nova cartela".

#### Scenario: Próxima cartela no mês
- **WHEN** um cíclico 21/7 às 22:00 teve o dia 1 em 01/10 e o usuário abre o calendário de outubro
- **THEN** 22/10 a 28/10 aparecem como pausa, 29/10 aparece com a marca de nova cartela e o painel de 29/10 mostra "Início da nova cartela · 22:00", e 30/10 e 31/10 aparecem como doses previstas

#### Scenario: Ciclos seguintes em meses à frente
- **WHEN** o mesmo cíclico é visto no calendário de dezembro
- **THEN** o calendário mostra os dias ativos, de pausa e o início de cartela de dezembro supondo que cada cartela começa logo depois da pausa anterior

#### Scenario: Cartela atrasada
- **WHEN** o início previsto era 29/10, ainda não foi confirmado e hoje é 31/10
- **THEN** 29/10 aparece como atrasada e, a partir de 01/11, o calendário projeta o ciclo supondo que a cartela começa hoje (01/11 como dia 2)

## MODIFIED Requirements

### Requirement: O calendário mensal mostra o horário previsto para dias futuros
O sistema SHALL fornecer uma visão de calendário mensal onde dias futuros exibem o horário previsto: dias ativos/pausa definitivos para medicamentos cíclicos, incluindo o início das próximas cartelas e os ciclos seguintes; os horários fixos definitivos para esquemas diário e dias da semana; e uma grade estimada para medicamentos de intervalo em horas (já que seu horário futuro real depende de quando cada dose é de fato confirmada). Medicamentos se necessário SHALL NOT aparecer com doses previstas em dias futuros, já que não têm horário agendado.

#### Scenario: Visualizando um dia futuro de um medicamento cíclico
- **WHEN** o usuário navega no calendário mensal até um dia futuro que cai dentro da janela ativa ou de pausa configurada de um medicamento cíclico, no ciclo atual ou num ciclo seguinte
- **THEN** o calendário mostra esse dia como ativo, de pausa ou de início de nova cartela, conforme o padrão configurado do medicamento

#### Scenario: Visualizando um dia futuro de um medicamento de intervalo em horas
- **WHEN** o usuário navega no calendário mensal até um dia futuro de um medicamento de intervalo em horas
- **THEN** o calendário mostra as doses daquele dia como uma estimativa baseada no horário atual, não um horário garantido

### Requirement: Cíclico aguardando nova cartela aparece na agenda
A agenda diária SHALL listar todo medicamento cíclico que esteja aguardando o início de uma nova cartela, indicando "Aguardando nova cartela" com o início previsto ("hoje às 22:00", "amanhã às 22:00", ou "atrasada desde 29/10" quando o início previsto já passou há mais de 30 minutos) e oferecendo a ação "Comecei a nova cartela" a qualquer momento. A dose de início de cartela SHALL NOT aparecer como um item separado na agenda. A ação SHALL registrar o primeiro comprimido como tomado agora (dia 1 do ciclo, descontando uma unidade do estoque), iniciar o ciclo e atualizar a agenda e os lembretes na hora.

#### Scenario: Cíclico recém-cadastrado
- **WHEN** às 15:00 o usuário cadastra um anticoncepcional 21/7 das 22:00 e abre a agenda
- **THEN** ele aparece como "Aguardando nova cartela · hoje às 22:00" com a ação "Comecei a nova cartela"

#### Scenario: Iniciando a cartela
- **WHEN** o usuário toca em "Comecei a nova cartela" às 22:05
- **THEN** a agenda passa a mostrar a dose de hoje como tomada (dia 1 de 21), o estoque diminui uma unidade e a dose de amanhã fica prevista

#### Scenario: Depois da pausa
- **WHEN** os 7 dias de pausa terminam e a nova cartela ainda não foi iniciada
- **THEN** o medicamento aparece como "Aguardando nova cartela" com o horário do início de hoje

#### Scenario: Cartela atrasada de dias anteriores
- **WHEN** o início previsto era 29/10 às 22:00 e hoje é 31/10
- **THEN** a agenda de hoje mostra o medicamento como "Aguardando nova cartela · atrasada desde 29/10", em âmbar, com a ação "Comecei a nova cartela"
