## 1. Âncora do ciclo (conforme `specs/dose-scheduling`)

- [x] 1.1 Criar `definirInicioCiclo` em `src/db/repositories/esquemas.ts` e fazê-la ser chamada por `confirmarNovaCartelaCiclica` (em transação); corrigir o teste existente para conferir `dataInicioCiclo` lendo o banco; verificar com o teste "Ciclo continua depois de reabrir o app" (dose do dia 2 em 13/10 lendo o esquema do banco).

## 2. Janela rolante (conforme `specs/dose-scheduling`)

- [x] 2.1 Implementar `renovarJanela` e `renovarJanelasAtivas` em `janela-rolante.ts` (só insere doses que faltam, nunca apaga); verificar com testes: diário contínuo cadastrado há 35 dias volta a ter dose hoje e ≥ 2 semanas à frente, rodar duas vezes não duplica, doses resolvidas intactas, duração encerrada não gera, cíclico em espera e esquema removido ignorados.
- [x] 2.2 Chamar `renovarJanelasAtivas` no layout raiz após as migrações e a cada volta ao primeiro plano (também no Expo Go), e no início da tarefa periódica antes de reconciliar; verificar com typecheck e, no aparelho, que a agenda tem doses após avançar a data do celular em 5 semanas. **Implementado** (typecheck ok); falta conferir no aparelho.

## 3. Cíclico aguardando cartela na agenda (conforme `specs/agenda-views`)

- [x] 3.1 Incluir `ItemAgendaAguardandoCartela` em `montarAgendaDoDia` e tratá-lo em `agruparPorPeriodo` (período do horário do ciclo) sem contar no `resumirDia`; verificar com testes: recém-cadastrado aparece, depois de iniciado não aparece, depois da pausa volta a aparecer.
- [x] 3.2 Renderizar o item na agenda com "Aguardando nova cartela" e o botão "Comecei a nova cartela" (confirma, reconcilia e recarrega); verificar com teste de domínio que, após a ação, a agenda mostra a dose de hoje tomada como dia 1, o estoque cai 1 e há dose prevista amanhã; e no aparelho que o botão funciona. **Implementado** (teste de domínio ok); falta conferir o botão no aparelho.

## 4. Permissão de tela cheia (conforme `specs/dose-notifications`)

- [x] 4.1 Guardar `permissao.telaCheiaPedida` no kv-store e só pedir a permissão no primeiro cadastro de especial; verificar com teste da função pura de decisão e, no aparelho, que o segundo especial não abre as Configurações. **Implementado** (teste da decisão ok); falta conferir no aparelho.

## 5. Verificação

- [x] 5.1 Rodar `npx vitest run` e `npx tsc --noEmit` sem falhas; no aparelho, cadastrar um cíclico, iniciar a cartela pela agenda e conferir lembrete às horas do ciclo; documentar o resultado. **Parcial**: `npx vitest run` (277 testes) e `npx tsc --noEmit` passam; falta o percurso no aparelho.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
