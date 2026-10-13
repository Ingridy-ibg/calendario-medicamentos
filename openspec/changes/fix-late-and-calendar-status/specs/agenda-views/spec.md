## ADDED Requirements

### Requirement: Atrasada na agenda e no calendário
A agenda diária SHALL exibir "Atrasada" (em âmbar, com ícone) nas doses não resolvidas que já passaram mais de 30 minutos do horário previsto, mantendo as ações da dose. O calendário mensal SHALL representar um dia com dose atrasada — e sem nenhuma perdida — com o ponto em contorno âmbar, e a legenda SHALL incluir "Atrasada".

#### Scenario: Agenda
- **WHEN** às 09:00 a dose das 08:00 ainda está pendente
- **THEN** o item mostra "Atrasada" em âmbar com os botões "Tomei agora" e "Não tomar"

#### Scenario: Calendário com especial atrasada de ontem
- **WHEN** a dose especial de ontem continua sem resposta
- **THEN** o dia de ontem aparece com o ponto em contorno âmbar e o painel do dia mostra a dose como "Atrasada"

### Requirement: O calendário mostra o dia de hoje com as doses reais
O calendário mensal SHALL montar o dia de hoje a partir das doses registradas, como os dias passados: doses resolvidas com seu status, não resolvidas como "Pendente" ou "Atrasada". O ponto do dia SHALL usar o pior status já registrado; sem nenhuma dose resolvida nem atrasada, SHALL aparecer em contorno.

#### Scenario: Dose de hoje tomada
- **WHEN** a dose de hoje das 08:00 foi tomada às 08:05
- **THEN** o calendário mostra hoje com o ponto cheio de tomada e o painel mostra "Tomada"

#### Scenario: Hoje ainda sem resposta no horário
- **WHEN** são 07:00 e a dose de hoje é às 08:00
- **THEN** hoje aparece com o ponto em contorno e o painel mostra a dose como "Pendente"
