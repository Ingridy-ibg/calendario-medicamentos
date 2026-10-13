## 1. Regras puras (conforme `specs/daily-greeting`)

- [x] 1.1 Consultar na doc do Expo v57 como detectar abertura por notificação (`getLastNotificationResponse` ou equivalente) e as APIs de `AppState`/`AccessibilityInfo`; anotar divergências no design.md; verificar que cada API citada no design existe na v57.
- [x] 1.2 Implementar `periodoDoDia` e `textoSaudacao`; verificar com testes dos limites 04:59/05:00, 11:59/12:00, 17:59/18:00, 02:15, nome composto ("Ana Paula Souza" → "Ana") e sem nome.
- [x] 1.3 Implementar `resumoSaudacao` sobre `resumirDia`; verificar com um teste por frase da spec (nenhuma resolvida, algumas, só 1 restante, todas, nenhuma agendada) e pelos três rótulos do cartão, ignorando "se necessário".
- [x] 1.4 Implementar `deveExibirSaudacao`; verificar com testes: primeira abertura do dia, segunda abertura, aberto por notificação, boas-vindas pendente e virada do dia (22:00 → 00:30).

## 2. Persistência e decisão de exibir

- [x] 2.1 Ler/gravar `saudacao.ultimaExibicao` no kv-store (módulo fino em `src/lib/`, junto do perfil); verificar com teste de ida e volta usando o kv-store do ambiente de teste ou um dublê.
- [x] 2.2 Em `_layout.tsx`, decidir boas-vindas × saudação × agenda na abertura a frio e reavaliar na volta ao primeiro plano via `AppState`, ignorando aberturas por notificação; verificar num dispositivo/emulador: primeira abertura do dia mostra a saudação, a segunda não, e abrir por notificação vai direto para a dose. **Implementado** (typecheck e testes ok); falta a verificação no aparelho.

## 3. Telas

- [x] 3.1 Criar `src/app/saudacao.tsx` conforme o artboard "Saudação ao abrir" (ilustração e cores por período, saudação, data e hora, resumo, cartão, "Ver agenda", barra de progresso), com passagem automática em 2,5 s, toque para pular, `router.replace` para a agenda e timer desligado com leitor de tela; verificar no app os três períodos (alterando a hora do aparelho) — a noite e a madrugada (ex.: 02:15) com meia-lua e nunca sol —, o tema escuro e o TalkBack. **Implementado** (typecheck e testes ok); falta a verificação no aparelho.
- [x] 3.2 Adicionar as paletas da saudação em `theme.ts` e incluí-las no teste de contraste da `apply-visual-identity`; verificar com o teste passando.
- [x] 3.3 Trocar o título do cabeçalho da agenda pela saudação do período, recalculada a cada foco, com reticências para nomes longos; verificar no app que o título muda ao voltar à agenda depois de 12:00 e que um nome longo não empurra os botões. **Implementado** (typecheck e testes ok); falta a verificação no aparelho.

## 4. Verificação de ponta a ponta

- [ ] 4.1 Num dispositivo/emulador, percorrer: instalação limpa (boas-vindas, sem saudação) → reabrir no mesmo dia (sem saudação) → avançar a data (saudação) → abrir por notificação no dia seguinte (sem saudação) → abrir normalmente (saudação); rodar `npx vitest run` e `npx tsc --noEmit`; documentar o resultado. **Parcial**: `npx vitest run` (265 testes) e `npx tsc --noEmit` passam; o percurso no aparelho não foi feito.
