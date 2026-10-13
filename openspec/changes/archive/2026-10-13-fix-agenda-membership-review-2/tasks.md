## 1. Volta à agenda sem dose dupla

- [x] 1.1 Em `resolverPlano`, para esquemas de grade, montar `horariosJaResolvidos` casando cada dose resolvida de hoje com o horário de hoje da grade atual mais próximo e ainda livre (empate: o mais cedo), mais as resolvidas de dias seguintes pelo horário exato (decisão 1); verificar com testes de prévia e de `adicionarAAgenda` o cenário 08:00/20:00 → 20:00 tomada às 19:00 → retirar → editar para 20:30 → voltar 19:45 (sem dose hoje, próxima amanhã 08:00), o cenário 08:00 → 08:00/14:00 voltando às 10:00 (próxima hoje 14:00) e que os testes existentes de volta continuam passando.
- [x] 1.2 No intervalo em horas, avançar `primeiraDoseIntervalo` de intervalo em intervalo enquanto cair em `horariosJaResolvidos`, e fazer `materializarDosesIniciais` inserir só `plano.primeiraDoseIntervalo` (decisão 2); verificar com teste o cenário 8 em 8 h com 09:00 tomada e 17:00 pulada voltando às 11:00: prévia e banco com a próxima à 01:00 de amanhã e uma única dose às 17:00 (a pulada).
- [x] 1.3 Extrair `foiTomada(dose)` em `registration.ts` e usá-lo nas duas checagens de `historicoDaVolta` (decisão 7); verificar com `npx vitest run src/domain/medication-registration` sem falhas.

## 2. Confirmação

- [x] 2.1 Em `confirmar.tsx`, capturar `ErroValidacao` no cálculo da nova prévia (cadastro e volta), mostrar a mensagem no `aviso` e retornar sem salvar (decisão 3); verificar com teste de domínio que `prepararCadastro` com o tratamento de 7 dias iniciado há 7 dias lança `ErroValidacao` com "Esse tratamento já terminou", com `npx tsc --noEmit` sem erros e, no aparelho, que a mensagem aparece e "Ajustar" volta ao formulário.

## 3. Aba Medicamentos

- [x] 3.1 Fazer `contarMedicamentos` usar o mesmo `innerJoin` com esquemas não removidos de `listarMedicamentosComEsquema`, com as condições comuns numa função local (decisão 5); verificar em `medicamentos.test.ts` que um medicamento sem esquema ativo não entra no total nem em "na agenda".
- [x] 3.2 Criar `totalDoFiltro(contagem, filtro)` em `lista.ts` e usá-lo na tela, removendo o ternário e o alias `naAgenda` (decisão 4); verificar com teste de `lista.ts` os três filtros.
- [x] 3.3 Na tela, guardar num `useRef` quantos itens já foram pedidos, usá-lo em `carregarMais`, recarregar no foco com `limite = max(carregados, TAMANHO_PAGINA)` e zerar na troca de filtro, com `montarPagina` recebendo `limite` (decisão 4); verificar com `npx tsc --noEmit` e, no aparelho com mais de 40 medicamentos, que a rolagem rápida não repete itens e que voltar do detalhe do 35º mantém a lista com 40.

## 4. Agenda do dia

- [x] 4.1 Em `montarAgendaDoDia`, descartar doses não resolvidas de medicamentos fora da agenda (decisão 6); verificar com teste que, com uma dose pendente de hoje inserida para um medicamento fora da agenda, ela não aparece e a dose tomada do mesmo medicamento continua aparecendo.

## 5. Planejamento

- [x] 5.1 Reescrever o texto da tarefa 4.1 de `openspec/changes/fix-agenda-membership-review/tasks.md` para descrever uma consulta com filtro e `innerJoin`, ordenada em JS (fora da agenda por último, nome com `localeCompare('pt-BR')`) e fatiada, como na decisão 6 daquela change, mantendo-a marcada como feita; verificar lendo o arquivo e com `openspec validate fix-agenda-membership-review` sem erros.

## 6. Verificação

- [x] 6.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas e, no aparelho, repetir os cenários de 1.1, 1.2, 2.1 e 3.3; documentar o resultado aqui.

  - Automático (13/10/2026): `npx vitest run` com 44 arquivos e 402 testes passando; `npx tsc --noEmit` sem erros.
  - No aparelho (13/10/2026): cenários de 1.1, 1.2, 2.1 e 3.3 testados e aprovados.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
