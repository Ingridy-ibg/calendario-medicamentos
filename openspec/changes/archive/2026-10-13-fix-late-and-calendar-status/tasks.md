## 1. Regras por tempo (conforme `specs/adherence-history`)

- [x] 1.1 Reescrever `classificarResposta` para receber a dose e `agora` (atraso se > 30 min depois do previsto ou com reenvio entregue) e atualizar `confirmarDose` e a resposta por notificação; verificar com testes: 08:20 → tomada; 14:00 sem notificação → com atraso; reenvio entregue → com atraso; testes existentes de notificação sem regressão.
- [x] 1.2 Criar `estaAtrasada` e `deveVirarPerdida`; verificar com testes dos limites 08:30/08:31 e 09:59/10:00/10:01, de especial (nunca perdida) e de silenciado (mesma regra).
- [x] 1.3 Criar `marcarPerdidasPorTempo(db, agora)` e chamá-la no layout raiz (abertura e volta ao primeiro plano), no foco da agenda e do calendário e na tarefa periódica; verificar com teste que uma comum das 08:00 sem resposta vira perdida às 10:01, uma especial não, e que rodar duas vezes não muda nada.

## 2. Agenda e calendário (conforme `specs/agenda-views`)

- [x] 2.1 Adicionar `atrasada` aos itens da agenda e mostrar "Atrasada" (âmbar, ícone) mantendo as ações; verificar com teste de `montarAgendaDoDia` às 09:00 e no app. **Implementado** (teste de domínio ok); falta conferir no aparelho.
- [x] 2.2 Fazer `montarCalendarioMensal` ler as doses reais até o fim de hoje e projetar só a partir de amanhã; atualizar `marcadorDoDia` (atrasada → contorno âmbar) e a legenda; verificar com testes: dose de hoje tomada às 08:05 → ponto cheio de tomada; às 07:00 → contorno e "Pendente"; especial de ontem sem resposta → contorno âmbar e "Atrasada"; e no app. **Implementado** (testes de domínio ok). Ajuste: no intervalo em horas, a projeção de hoje continua para mostrar as doses estimadas depois da pendente, sem duplicar a dose real. Falta conferir no aparelho.

## 3. Verificação

- [x] 3.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e, no aparelho (Expo Go), confirmar uma dose mais de 30 min depois (com atraso), deixar uma comum passar 2 h (perdida) e conferir hoje no calendário; documentar o resultado. **Parcial**: `npx vitest run` (343 testes) e `npx tsc --noEmit` passam; falta o percurso no aparelho.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
