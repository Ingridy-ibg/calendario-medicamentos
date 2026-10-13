## 1. Banco e motor de agendamento (conforme `specs/dose-scheduling`)

- [x] 1.1 Adicionar `data_inicio` (nullable) a `esquemas` em `src/db/schema.ts`, gerar a migração com `drizzle-kit` e atualizar `drizzle/migrations.js`; verificar com `create-test-db.ts` que a migração aplica e que esquemas existentes continuam com `dataInicio = createdAt`.
- [x] 1.2 Fazer `paraEsquemaDominio` usar `dataInicio ?? createdAt`; verificar com teste: diário de 10 dias com início em 08/10 cadastrado em 12/10 não tem doses a partir de 18/10.
- [x] 1.3 Dar a `gerarPrimeiraDoseIntervalo` o parâmetro `ultimaDose` (`max(ultimaDose + intervalo, agora)`); verificar com testes dos cenários "próxima dose no futuro" e "já atrasada".
- [x] 1.4 Gerar doses do CICLICO no cadastro quando `dataInicioCiclo` vier preenchido; verificar com testes dos cenários "dia 12 de 21" e "dia 3 da pausa" da spec.
- [x] 1.5 Escrever o teste que cadastra às 15:00 um esquema com horário de hoje às 14:00 e garantir que não fica dose de hoje não resolvida (remover as passadas se `materializarJanela` as criar); verificar com o teste passando.

## 2. Prévia e cadastro (conforme `specs/medication-registration`, `adherence-history`, `medication-stock`)

- [x] 2.1 Adicionar `DadosEmUso` e `emUso` aos tipos do formulário e `validarEmUso` (início no futuro, tratamento já terminado, última dose no futuro, dia da cartela/pausa fora da faixa); verificar com um teste por regra.
- [x] 2.2 Implementar `montarPreviaCadastro(dados, agora)` com todos os blocos da confirmação e o plano de gravação; verificar com testes por cenário: medicamento novo (horário de hoje já passado), cíclico dia 12 de 21 (faltam 10, último 21/10, pausa 22–28/10, nova cartela prevista 29/10), tratamento dia 5 de 10 com 8 unidades (faltam 11 doses, acaba 16/10 08:00, faltam 3), intervalo com última dose às 06:00.
- [x] 2.3 Fazer `cadastrarMedicamento` gravar a partir do plano da prévia, em transação, incluindo doses de hoje tomadas (status tomada, `dataHoraRegistro` = horário previsto, sem decrementar estoque) e nenhuma dose para dias anteriores; verificar com testes de histórico e estoque.

## 3. Telas

- [x] 3.1 Adicionar ao `FormularioMedicamento` a seção "Início" conforme os artboards "Novo medicamento" e "Cadastro — já estava tomando" (interruptor, perguntas por tipo, "Já tomou?" só para horários de hoje já passados; sem a nota "cadastre como 28/0", porque a validação exige pausa > 0 — decidido com o usuário) e trocar o botão final por "Continuar"; ocultar a seção em modo edição; verificar no app cada tipo de esquema com o interruptor ligado e desligado. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 3.2 Criar o store em memória do cadastro e a rota `src/app/medicamento/confirmar.tsx` conforme os três artboards "Confirmar — …", com "Ajustar" (volta preenchido) e "Confirmar e agendar" (recalcula a prévia; se mudou, reexibe em vez de salvar); verificar no app os três cenários dos artboards e que "Ajustar" não grava nada. **Implementado** (typecheck e testes ok); falta conferir no aparelho.
- [x] 3.3 Após confirmar: reconciliar notificações, pedir full-screen intent para especial como no cadastro atual e voltar para a agenda; verificar num dispositivo/emulador que o cíclico cadastrado no dia 12 recebe lembrete às 22:00 de hoje. **Implementado** (typecheck e testes ok); falta conferir no aparelho.

## 4. Verificação de ponta a ponta

- [x] 4.1 Num dispositivo/emulador, cadastrar em uso um cíclico (tomando e na pausa), um tratamento de duração fixa com estoque insuficiente, um "a cada X horas" e um medicamento novo depois do horário de hoje; conferir agenda, calendário (dias anteriores vazios), estoque e lembretes contra a confirmação; rodar `npx vitest run` e `npx tsc --noEmit`; documentar o resultado. **Parcial**: `npx vitest run` (329 testes) e `npx tsc --noEmit` passam; falta o percurso no aparelho.

> Verificação no aparelho concluída em 13/10/2026: todos os percursos manuais desta change foram testados e aprovados.
