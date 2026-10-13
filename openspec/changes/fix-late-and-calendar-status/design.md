## Context

- `classificarResposta(notificacoesSemResposta)` decide tomada × com atraso só pelo contador da cascata; `confirmarDose` (agenda) e a resposta por notificação a usam.
- Perdida só acontece em `fecharDosesVencidas` (`dose-notifications/resolucao-por-notificacao.ts`), chamada pelo reconciliador — que não roda no Expo Go — e baseada no contador.
- `montarCalendarioMensal` lê `doses` só para dias **antes** de hoje e projeta o esquema de hoje em diante.
- `marcadorDoDia` e `TOKEN_STATUS_DOSE`/`ROTULOS_STATUS_DOSE` não conhecem "atrasada".

## Goals / Non-Goals

**Goals:** classificação por tempo, independente de notificações; "Atrasada" como estado derivado; calendário de hoje com doses reais; tudo testado com horários fixos.

**Non-Goals:** mudar a cascata de lembretes (intervalo de 30 min, 4 para comum, infinito para especial); gravar "atrasada" no banco; tornar o limite de 30 min/2 h configurável.

## Decisions

### 1. Constantes e regras puras de tempo
Em `adherence-history/classificacao.ts`:
- `TOLERANCIA_ATRASO_MIN = 30` (igual ao intervalo de reenvio de `cascata.ts`, reaproveitando a constante de lá) e `PRAZO_PERDIDA_MIN = 120` (4 × 30).
- `classificarResposta(dose: { dataHoraPrevista, notificacoesSemResposta }, agora)` → `'tomada_com_atraso'` se `agora > prevista + 30 min` **ou** `notificacoesSemResposta >= 2`; senão `'tomada'`. Assinatura muda (recebe a dose e `agora`); todos os chamadores atualizados.
- `estaAtrasada(dose, agora)`: não resolvida e `agora > prevista + 30 min`.
- `deveVirarPerdida(dose, criticidade, agora)`: não resolvida, criticidade comum e `agora >= prevista + 120 min`.

### 2. Varredura `marcarPerdidasPorTempo(db, agora)`
Função de domínio que percorre as doses não resolvidas com horário previsto de medicamentos comuns e marca como perdida as que `deveVirarPerdida`. Idempotente. Chamada:
- no layout raiz, junto de `renovarJanelasAtivas` (abertura e volta ao primeiro plano, também no Expo Go);
- no foco da agenda e do calendário, antes de montar os dados;
- na tarefa periódica, antes de reconciliar.
`fecharDosesVencidas` continua existindo para a cascata; as duas convergem (perdida é perdida), e a nova cobre o caso sem notificações. O reconciliador já cancela alarmes de doses resolvidas.

### 3. "Atrasada" derivado, não gravado
`ItemAgendaDose` ganha `atrasada: boolean` (calculado em `montarAgendaDoDia` com `agora`); o calendário ganha o mesmo para itens de histórico não resolvidos. Rótulo "Atrasada", token `statusAtraso`, ícone `relogio`. O status gravado continua `pendente`/`aguardando`, então nenhum fluxo de notificação muda.

### 4. Calendário: hoje como histórico
`montarCalendarioMensal` passa a ler `doses` até o **fim de hoje** (não o início) e a projetar o esquema só a partir de amanhã. Itens não resolvidos de hoje entram como histórico pendente (com `atrasada`). `marcadorDoDia`: ordem perdida > pulada > atraso (tomada com atraso **ou** atrasada) > tomada; atrasada sem nenhuma resolvida pior → contorno âmbar; só pendentes no horário → contorno de destaque. Legenda ganha "Atrasada" (contorno âmbar).

## Risks / Trade-offs

- [Mudar a assinatura de `classificarResposta` quebrar a resposta por notificação] → o caminho de notificação passa a mesma dose e o horário da resposta; testes existentes de `resolucao-por-notificacao` cobrem.
- [Especial atrasada há muitos dias poluindo o calendário] → é a regra escolhida (especial nunca é perdida); o ponto âmbar deixa visível que falta confirmar.
- [Dupla escrita de perdida pelas duas varreduras] → ambas só tocam doses não resolvidas; a segunda vira no-op.

## Migration Plan

Sem migração. Doses antigas pendentes de comuns viram perdidas na primeira abertura depois da atualização, conforme a regra de tempo.
