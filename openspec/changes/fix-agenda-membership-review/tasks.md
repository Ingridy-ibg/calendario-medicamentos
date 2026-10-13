## 1. Volta à agenda sem dose dupla

- [x] 1.1 Em `prepararVoltaAAgenda`, derivar do histórico do esquema ativo os horários de hoje já resolvidos (grade) e a última dose tomada (intervalo), e usá-los na prévia (decisão 1); verificar com teste de prévia que o bloco de hoje mostra a dose das 20:00 já tomada e que o intervalo de 8 h com dose às 09:00, voltando às 10:00, mostra a próxima às 17:00 (e às 10:00 quando a última tomada foi há dois dias).
- [x] 1.2 Criar a materialização própria da volta (grade: pula horários com dose resolvida existente e horários de hoje já passados; intervalo: só a próxima pendente, sem reinserir tomadas) e fazer `adicionarAAgenda` receber a prévia já conferida em vez de recalcular (decisão 2); verificar em `agenda.test.ts` o cenário 08:00/20:00 → tomada às 19:00 → retirar 19:30 → voltar 19:45 deixa só um registro às 20:00 (tomado) e a próxima pendente amanhã 08:00, que as doses gravadas batem com a prévia, e que os testes existentes de volta (7 dias, 10:00 sem a das 08:00, cíclico aguardando) continuam passando com a nova assinatura.
- [x] 1.3 Atualizar `confirmar.tsx` para calcular `prepararVoltaAAgenda` uma vez no toque e repassar essa prévia a `adicionarAAgenda`; verificar com `npx tsc --noEmit` sem erros.

## 2. Agenda de hoje e alerta de estoque

- [x] 2.1 Tornar `naAgenda` obrigatório no parâmetro de `alertaEstoqueDoMedicamento` (teste `!naAgenda`) e ajustar o tipo de `alertaDe` na agenda diária (decisão 4); verificar com `npx tsc --noEmit` sem erros e com o teste de situação de estoque que fora da agenda continua sem alerta.
- [x] 2.2 Em `montarAgendaDoDia`, buscar os esquemas das doses com `listarEsquemasNaoRemovidos`, mantendo `listarEsquemasAtivos` para "se necessário" e "aguardando nova cartela" (decisão 3); verificar com teste que, depois de tomar a dose das 08:00 e retirar o medicamento às 09:00, a agenda de hoje mostra a 08:00 tomada, sem pendentes e sem alerta de estoque, e que um "se necessário" fora da agenda continua fora da agenda do dia.

## 3. Cadastro sem agenda

- [x] 3.1 Em `confirmar.tsx`, chamar `prepararCadastro` sem `emUso` quando "Adicionar à agenda" estiver desligado (decisão 5); verificar com teste de domínio que `prepararCadastro` com `emUso` removido não lança para um tratamento de 7 dias iniciado há 7 dias, e com `cadastrarMedicamento(..., { naAgenda: false })` que o medicamento é salvo fora da agenda.

## 4. Paginação na consulta

- [x] 4.1 Reescrever `listarMedicamentosComEsquema` com filtro, `innerJoin` de esquemas, `ORDER BY na_agenda DESC, nome` e `LIMIT/OFFSET`, e criar `contarMedicamentos` com total e "na agenda" (decisão 6); verificar em `medicamentos.test.ts` os três filtros, a ordem (fora da agenda por último, incluindo um nome com acento inicial — trocar `NOCASE` por chave normalizada se a ordem divergir) e 45 medicamentos em páginas de 20/20/5.
- [x] 4.2 Remover `filtrarEPaginar` de `lista.ts` (mantendo `FiltroAgenda` e `TAMANHO_PAGINA`) e seus testes, e fazer a aba Medicamentos buscar e montar só a página pedida, recarregando a primeira página no foco e na troca de filtro, com o cabeçalho e o estado vazio vindos de `contarMedicamentos`; verificar com `npx tsc --noEmit` e `npx vitest run` sem falhas.

## 5. Limpeza

- [x] 5.1 Criar `src/components/medicamento/selo.tsx` com `Selo({ texto, icone? })` aceitando `sinoDesligado` e `calendario`, e usá-lo para "Silenciado" e "Fora da agenda" na aba Medicamentos e no detalhe, removendo o `Selo` local e `SeloForaDaAgenda` (decisão 7); verificar com `grep -rn "SeloForaDaAgenda\|function Selo" src` mostrando só o componente novo e `npx tsc --noEmit` sem erros.
- [x] 5.2 Fazer `listarEsquemasCiclicos` filtrar o tipo no SQL reaproveitando a condição de ativos, e remover de `contexto.ts` a checagem redundante de `naAgenda` (decisão 8); verificar com os testes de notificações/contexto que um cíclico fora da agenda continua sem lembretes de pausa e um na agenda continua com eles.

## 6. Verificação

- [ ] 6.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e, no aparelho, repetir o cenário do bug 1 (tomar adiantado → retirar → voltar), conferir a agenda de hoje após retirar, cadastrar sem agenda com "Já estava tomando" preenchido e rolar a aba Medicamentos com mais de 20 itens nos três filtros; documentar o resultado aqui.
