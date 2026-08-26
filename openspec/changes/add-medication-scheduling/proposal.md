## Why

Este é um aplicativo Android de uso pessoal cujo propósito é garantir que a medicação nunca seja esquecida — cobrindo desde horários fixos simples (ex: remédio de pressão às 8h e 20h) até regimes cíclicos (ex: anticoncepcional 21/7) e doses "se necessário" (ex: analgésico sem horário fixo). Hoje não existe nenhuma lógica de domínio (o app ainda é o starter padrão do Expo). Precisamos de um motor de agendamento que cubra os principais padrões reais de uso de medicação, um sistema de notificações cuja urgência acompanhe a criticidade do medicamento, e controle básico de estoque para nunca faltar a medicação em mãos.

## What Changes

- Adicionar cadastro de medicamentos com cinco tipos de esquema de horário:
  - **Diário**: uma ou mais horas fixas por dia (ex: 8h e 20h).
  - **Intervalo em horas**: a cada X horas, a partir da primeira dose.
  - **Dias da semana**: horários fixos em dias específicos da semana.
  - **Cíclico**: padrão de dias ativos / dias de pausa (ex: 21 ativos / 7 de pausa).
  - **Se necessário**: sem horário fixo, com um limite máximo de doses por dia; a dose é sempre registrada manualmente pelo usuário, sem notificação agendada.
  - Os tipos diário, intervalo em horas e dias da semana aceitam duração fixa (N dias) ou uso contínuo.
- Adicionar um motor de cálculo de doses:
  - Para esquemas de intervalo em horas: a próxima dose é sempre calculada a partir do **horário real de confirmação** ("tomei agora"), nunca do horário originalmente previsto.
  - Para esquemas diário e dias da semana: cada horário do dia é um compromisso fixo e independente — confirmar um horário adiantado ou atrasado não desloca os outros horários daquele dia.
  - Para qualquer esquema com duração fixa: pular uma dose ("não tomar") preserva a grade original em vez de reiniciar o cálculo.
- Adicionar comportamento específico para medicamentos cíclicos: lembretes leves e sem ação nos dias de pausa, e um novo ciclo só começa quando o usuário confirma ter tomado o primeiro comprimido da nova cartela (essa confirmação vira o novo "dia 1").
- Adicionar um sistema de notificações guiado pela criticidade, definida no cadastro (**comum** vs **especial**):
  - **Comum**: notificação padrão; ações são "tomei agora", "adiar", "não tomar"; até 4 notificações consecutivas sem resposta (intervalos de 30 min) antes da dose ser marcada como **perdida**; o "adiar" explícito não conta nesse limite e pode se estender indefinidamente; dispensar a notificação (swipe no Android) não tem efeito.
  - **Especial**: notificação crítica/estilo alarme (mais difícil de ignorar, ex: tela cheia), única ação é "tomei agora" (sem opção de pular), reenvia a cada 30 min pra sempre até ser confirmada.
  - Medicamentos "se necessário" não geram notificação agendada nenhuma.
  - Notificações podem ser desativadas por medicamento, apenas dentro do aplicativo.
- Adicionar histórico de adesão: para cada dose, registrar horário previsto (quando aplicável), horário real de confirmação (se houver) e status final (tomada, tomada com atraso, pulada, perdida).
- Adicionar controle de estoque por medicamento: quantidade em estoque e quantidade por embalagem, com decremento automático a cada dose confirmada como tomada, reposição manual (ex: ao comprar uma caixa nova) e alerta de recompra quando o estoque ficar baixo.
- Adicionar duas telas: uma agenda diária (tela principal, lista das doses/registros de hoje e seus status, incluindo medicamentos "se necessário" e alertas de estoque) e um calendário mensal (secundária, mostrando histórico real para dias passados e a grade prevista/estimada para dias futuros).
- Medicamentos com duração fixa param automaticamente de aparecer na agenda diária e nas notificações quando a duração termina, permanecendo visíveis no histórico de adesão.

## Capabilities

### New Capabilities
- `medication-registration`: cadastro, edição e remoção de um medicamento, incluindo os campos específicos de cada um dos cinco tipos de esquema, os campos de estoque e a marcação de criticidade comum/especial.
- `dose-scheduling`: o motor de cálculo de quando uma dose é devida — diário, intervalo em horas, dias da semana, cíclico (ativo/pausa) e se necessário —, a regra de reset por horário de confirmação (só para intervalo em horas), a independência dos horários fixos (diário/dias da semana) e a exceção de pular-preserva-a-grade.
- `dose-notifications`: entrega de notificações, política de escalonamento por criticidade (cascata limitada vs infinita), ações disponíveis (tomei agora, adiar, não tomar), a ausência de notificação agendada para "se necessário", e desativação de notificação por medicamento.
- `adherence-history`: registro e consulta do resultado de cada dose (tomada, tomada com atraso, pulada, perdida), incluindo doses "se necessário" registradas sem horário previsto.
- `medication-stock`: controle de quantidade em estoque por medicamento, decremento automático, reposição manual e alerta de recompra.
- `agenda-views`: a tela de agenda diária e a tela de calendário mensal, o que cada uma mostra para doses passadas vs futuras, incluindo medicamentos "se necessário" e alertas de estoque.

### Modified Capabilities
(nenhuma — esta é a primeira funcionalidade adicionada ao projeto)

## Impact

- Novo modelo de dados local, separado em três tabelas — `medicamentos` (o que é: nome, dosagem, estoque, criticidade), `esquemas` (a regra de quando tomar) e `doses` (cada ocorrência concreta) — de forma que o histórico de doses passadas nunca seja reescrito quando a regra do esquema muda. Sem backend, sem sincronização — persistência local single-user via `expo-sqlite` acessado através do **Drizzle ORM**.
- Stack técnica: Expo (React Native) + TypeScript, `expo-router` para navegação, NativeWind para estilo, Zustand para estado de UI, `date-fns`/`date-fns-tz` para aritmética de datas e fusos, Vitest para testes automatizados do motor de agendamento.
- Novas permissões de notificação no Android: agendamento de alarme exato (`SCHEDULE_EXACT_ALARM`) e full-screen intent (para medicamentos especiais), solicitadas e tratadas dentro do app.
- Novas telas: formulário de cadastro/edição de medicamento (com os cinco tipos de esquema e estoque), agenda diária (principal), calendário mensal (secundária).
- Substitui as telas padrão do starter do Expo (`index`, `explore`) pela navegação real do aplicativo.
