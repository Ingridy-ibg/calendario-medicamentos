## Context

Referência visual: artboard **Saudação ao abrir** (períodos e "com nome" no Tweaks) e o cabeçalho de **Agenda do dia** / **Agenda do dia — escuro** no canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J). As specs mandam onde divergirem.

Esta change se apoia no que `apply-visual-identity` cria: o nome em `perfil.nome` no `expo-sqlite/kv-store`, a flag `boasVindasConcluida`, o redirecionamento inicial em `_layout.tsx`, `resumirDia(itens)` e os tokens/variante escura. Notificações são tratadas em `src/notifications/` (`handler.ts`, `tarefas.ts`), com resposta às ações também em segundo plano.

## Goals / Non-Goals

**Goals:**
- Toda regra (período, texto, resumo, rótulo do cartão, decisão de exibir) em funções puras testadas.
- A saudação nunca atrasar uma ação de dose: aberturas por notificação passam direto.

**Non-Goals:**
- Mensagens variadas ou motivacionais, datas comemorativas, aniversário.
- Configuração para desligar a saudação (pode vir depois, no perfil).
- Saudação em notificações.

## Decisions

### 1. Funções puras em `src/domain/daily-greeting/`

- `periodoDoDia(agora) → 'manha' | 'tarde' | 'noite'` (05:00/12:00/18:00).
- `textoSaudacao(periodo, nome?) → string` — primeiro nome = primeira palavra do nome normalizado (função de `apply-visual-identity`); sem nome, "Bom dia!".
- `resumoSaudacao(resumoDoDia) → { frase, cartao: { rotulo, dose } | null }` sobre o `resumirDia` existente.
- `deveExibirSaudacao({ agora, ultimaSaudacao, boasVindasConcluida, abertoPorNotificacao }) → boolean` — compara datas pelo dia do calendário local (`isSameDay`).

### 2. Quando decidir: abertura a frio e volta ao primeiro plano

- Abertura a frio: `_layout.tsx` já decide boas-vindas × agenda; passa a decidir boas-vindas × saudação × agenda com `deveExibirSaudacao`.
- Volta ao primeiro plano: um listener de `AppState` (`background`/`inactive` → `active`) no layout raiz reavalia e, se for o caso, faz `router.push('/saudacao')`.
- "Aberto por notificação": `Notifications.getLastNotificationResponse()` / o listener de resposta já usado pelo módulo de notificações (a conferir na doc v57) marca a abertura atual como vinda de notificação; nesse caso não exibe e **não** grava a data, para que a próxima abertura comum do dia mostre a saudação (spec).
- A data da última saudação (`saudacao.ultimaExibicao`) é gravada no kv-store **quando a saudação é exibida**, não quando é dispensada — fechar o app no meio dela conta como vista.

*Alternativa:* exibir a saudação como overlay por cima da agenda. Descartada: rota própria deixa o "voltar não reabre" trivial (`router.replace('/')` ao sair) e isola o timer.

### 3. Rota `src/app/saudacao.tsx`

Tela cheia no `Stack` raiz, sem cabeçalho e sem gesto de voltar. Timer de 2,5 s com barra de progresso animada (Reanimated, já instalado); `Pressable` de tela inteira e botão "Ver agenda" chamam `router.replace('/')`. `AccessibilityInfo.isScreenReaderEnabled()` desliga o timer e esconde a barra (spec). Os itens do dia vêm de `montarAgendaDoDia(db, agora)` + `resumirDia`.

### 4. Cores por período

Três paletas próprias da saudação em `theme.ts` (`saudacao.manha/tarde/noite`, valores do artboard). No tema escuro, manhã e tarde usam o fundo e o texto da variante escura e só a ilustração (sol âmbar / sol verde) muda; a noite é igual nos dois temas. Os pares texto/fundo entram no teste de contraste da tarefa 1.3 de `apply-visual-identity`.

A ilustração é feita com `View`s arredondadas (halo, astro, pontos de estrela), como no artboard — sem imagem nem SVG. A meia-lua da noite é um círculo claro parcialmente coberto por um segundo círculo na cor do halo, deslocado para o canto superior direito; a escolha sol × meia-lua vem só de `periodoDoDia`, nunca do tema, para que a madrugada no tema claro também mostre a meia-lua.

### 5. Cabeçalho da agenda

O título da agenda passa de "Agenda" para `textoSaudacao(periodoDoDia(agora), nome)`, recalculado no `useFocusEffect` que a tela já usa; o nome é lido do kv-store no mesmo ponto. Fonte de título reduzida de 36 para 30 para caber ao lado dos botões "Novo" e perfil; nomes longos usam só o primeiro nome e, se ainda assim não couber, `numberOfLines={1}` com reticências.

### Notas da conferência na v57 (tarefa 1.1)

- Abertura por notificação: `getLastNotificationResponse()` (síncrono) + `clearLastNotificationResponseAsync()` do `expo-notifications` instalado; a resposta é "consumida" ao ser detectada (`consumirAberturaPorNotificacao` em `src/lib/notificacoes-seguras.ts`), sempre `false` no Expo Go.
- `AppState` e `AccessibilityInfo.isScreenReaderEnabled()` do React Native; a avaliação na abertura a frio espera `useRootNavigationState().key` para poder navegar.
- Concluir a boas-vindas grava o dia como já saudado, para a saudação não aparecer ao voltar ao app no mesmo dia do primeiro uso.

## Risks / Trade-offs

- [Abertura por notificação não ser detectável com confiança em todas as situações (ex.: ação respondida em segundo plano)] → nesse caso o app nem chega ao primeiro plano; quando chega por toque no corpo da notificação, `getLastNotificationResponse` cobre. Se falhar, o pior caso é a saudação aparecer uma vez antes da agenda, com toque para pular.
- [Fuso/horário do aparelho alterado] → período e "dia" sempre pelo horário local atual; trocar de fuso pode exibir uma saudação a mais no dia, aceitável.
- [Timer competir com navegação manual] → o timer é cancelado no desmonte da tela e em qualquer toque.

## Migration Plan

Sem migração. A chave `saudacao.ultimaExibicao` ausente significa "nunca exibida": na primeira abertura comum após a atualização, a saudação aparece. Rollback: reverter os commits.
