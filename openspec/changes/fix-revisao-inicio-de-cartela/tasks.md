## 1. Dose de início sempre presente e única

- [x] 1.1 Implementar `doseDeInicioFaltante(esquema, doses, agora)` em `ciclico.ts`. Verificar: testes vitest para início vencido sem dose (retorna a dose), com dose no mesmo dia em qualquer status (null), início futuro (null) e ciclo em andamento (null)
- [x] 1.2 Usar `doseDeInicioFaltante` em `renovarJanela`, antes do retorno antecipado. Verificar: teste do cenário "Pausa terminada antes da atualização" (âncora 01/08, renovação em 13/10 cria a dose de 29/08 às 22:00, pendente) e de "App sem abrir durante o início previsto" (uma dose só)
- [x] 1.3 Na edição de um cíclico, apagar a dose de início pendente e recriá-la no novo início (fluxo atual + `doseDeInicioFaltante`). Verificar: testes dos cenários "Horário editado depois do início previsto do dia" (22:00 → 23:00 às 22:30) e "Horário editado com a cartela atrasada de dias anteriores", com exatamente uma dose de início pendente em cada
- [x] 1.4 Conferir que o reconciliador deseja um único alvo de alarme para o esquema depois das duas situações. Verificar: teste em `contexto.test.ts` com `listarAlvosDesejados` retornando um só alvo de dose de início

## 2. "Só cadastrar"

- [x] 2.1 Em `cadastrarMedicamento` com `naAgenda: false`, descartar `inicioCartela` e gravar o cíclico sem `dataInicioCiclo` e sem `inicioCartelaPrevisto`; em `confirmar.tsx`, enviar os dados sem `inicioCartela` no caminho "Só cadastrar". Verificar: teste do cenário "Respondeu e depois escolheu só cadastrar" (sem doses e sem âncora) e de "Volta à agenda depois" ("Nova cartela: hoje às 22:00")

## 3. Agenda e calendário

- [x] 3.1 Marca `anel` para o histórico de hoje com dose de início pendente e não atrasada em `marcador-dia.ts`. Verificar: testes dos cenários "Início hoje, ainda por vir" e "Início de hoje já atrasado"
- [x] 3.2 `inicioAtrasado` sobre `estaAtrasada`, usado pelo item de espera e por `textoInicioPrevisto` com o `agora` da exibição. Verificar: teste de `textoInicioPrevisto` às 22:20 e às 22:40 para um início às 22:00
- [ ] 3.3 Relógio de 1 minuto na agenda (só com a tela em foco) para redesenhar o item de espera. Verificar: `npx tsc --noEmit` passa; no app, com a agenda aberta, o item passa a "atrasada" sem trocar de tela

## 4. Notificação sai da bandeja

- [ ] 4.1 `agendadorNotificacoes.cancelar` remove também a notificação exibida (`dismissNotificationAsync`), e `processarResposta` a remove no "Adiar" antes de reagendar. Verificar: `npx tsc --noEmit` passa; no aparelho, os cenários "Tomei agora pela notificação", "Adiar pela notificação", "Dose resolvida no app com a notificação exibida" e "Abrir o app não some com notificação pendente"

## 5. Limpeza

- [x] 5.1 `ContextoDose` com a dose e `textosDoContexto`, usados pelos dois agendadores sem leitura extra da dose. Verificar: `npx tsc --noEmit` e os testes de `contexto.test.ts` e `textos.test.ts` passam
- [x] 5.2 Tirar `definirInicioDosCiclicosSemData` de `renovarJanelasAtivas` e criar `aplicarCorrecoesUnicas` (marca `correcao.inicioCartelaSemData` no kv-store), chamada no layout raiz e na tarefa periódica. Verificar: teste de que `renovarJanelasAtivas` não altera mais `inicioCartelaPrevisto`; teste puro da decisão de rodar pela marca

## 6. Validação

- [x] 6.1 Rodar `npx vitest run` e `npx tsc --noEmit`. Verificar: ambos passam
- [ ] 6.2 No APK, com um cíclico cuja pausa terminou no passado, abrir o app e conferir o alarme de início e o "atrasada desde"; editar o horário e conferir que só um alarme fica. Verificar: checagem manual no aparelho
