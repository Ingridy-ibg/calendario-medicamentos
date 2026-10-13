## Context

Os achados vêm da revisão do merge de `agenda-membership` (veja proposal.md, "Why"). Estado atual relevante:

- `adicionarAAgenda` (`registration.ts`) chama `prepararVoltaAAgenda` de novo, apaga as não resolvidas (`substituirDosesFuturas`), reinicia o esquema e chama `materializarDosesIniciais` — a mesma rotina do cadastro. Para grade, ela usa `materializarJanela` (insere toda a janela a partir de hoje) e depois apaga as pendentes de hoje com horário ≤ agora. Os horários de hoje **depois** de agora não são comparados com as doses resolvidas que ficaram no banco. Para intervalo, a primeira dose é sempre `agora`.
- A prévia do cadastro já sabe tratar "última dose" do intervalo e "doses de hoje tomadas" via `emUso` (register-ongoing-medication), mas `prepararVoltaAAgenda` monta os dados sem `emUso`.
- A confirmação compara a `assinatura` (plano, próximas doses, hoje) da prévia mostrada com uma recalculada no toque; na volta ela já recalcula `prepararVoltaAAgenda` e depois `adicionarAAgenda` recalcula outra vez.
- `montarAgendaDoDia` parte de `listarEsquemasAtivos`, que exclui fora da agenda; `montarCalendarioMensal` usa `listarEsquemasNaoRemovidos` para o histórico.
- A aba Medicamentos carrega todos os medicamentos, faz uma consulta de esquema por medicamento e calcula resumo/alerta de todos, e só então fatia em memória.

## Goals / Non-Goals

**Goals:**
- Nenhum caminho da volta à agenda pode deixar dois registros (um resolvido e um pendente) no mesmo horário de um esquema.
- Prévia mostrada = o que é gravado, também na volta à agenda.
- Custo da aba Medicamentos proporcional à página, não ao total.

**Non-Goals:**
- Mudar a regra de "duração recomeça no dia da volta" ou a do cíclico aguardando nova cartela.
- Mostrar na agenda de hoje as ações (tomar/pular) para medicamentos fora da agenda — só as já resolvidas aparecem, e elas não têm ações pendentes.
- Mudar a aparência dos selos ou da lista.
- Migração de banco.

## Decisions

### 1. A volta à agenda deriva um "em uso" a partir do histórico

`prepararVoltaAAgenda` passa a preencher, a partir das doses resolvidas do esquema ativo:
- **Grade**: os horários de hoje que já têm dose resolvida entram como "já resolvidos hoje". A prévia os mostra no bloco de hoje como já registrados, e a materialização da volta **pula** esses horários (não insere pendente, em qualquer horário de hoje — antes ou depois de agora).
- **Intervalo**: a última dose `tomada`/`tomada_com_atraso` (pelo horário real de registro) vira a `ultimaDose`, e a primeira dose sai de `gerarPrimeiraDoseIntervalo(dominio, { agora, ultimaDose })` — que já devolve `max(ultimaDose + intervalo, agora)`. Pulada não conta como referência, porque a volta à agenda é um recomeço e não continua a grade original.

A duração **não** usa o `emUso` de tipo "início" — continua recomeçando no dia da volta, como o requisito manda.

Diferente do cadastro, essas doses **já existem** no banco: a volta não pode reinseri-las como `tomada` (o cadastro em uso faz isso). Na implementação, a volta reaproveita `materializarDosesIniciais` com dois ajustes no plano: `dosesTomadasHoje` fica vazio (só o "em uso" do formulário o preenche), e o novo campo `horariosJaResolvidos` (doses resolvidas de hoje em diante) faz a materialização apagar a pendente recém-gerada em cada um desses horários — mesma ideia do `jaExiste` de `renovarJanela`.

*Alternativa considerada*: deduplicar dentro de `substituirDosesFuturas`/`materializarJanela` para todos os chamadores. Rejeitada: muda o contrato de uma rotina usada também por cadastro e edição, onde hoje não há conflito, e espalha o risco.

### 2. `adicionarAAgenda` recebe o plano já conferido

Assinatura passa a ser `adicionarAAgenda(db, medicamentoId, previa, agora)` (ou equivalente com o `plano`), espelhando `cadastrarMedicamento`, que já usa a prévia como fonte do que gravar. A confirmação calcula `prepararVoltaAAgenda` uma vez no toque, compara a assinatura e repassa essa mesma prévia. Os testes de domínio que chamam `adicionarAAgenda` direto passam a chamar `prepararVoltaAAgenda` antes.

### 3. Agenda do dia: doses vêm de esquemas não removidos; o resto, de ativos

`montarAgendaDoDia` monta o mapa de esquemas para as **doses** com `listarEsquemasNaoRemovidos` (como o calendário) e mantém `listarEsquemasAtivos` para os "se necessário" e "aguardando nova cartela". Como `retirarDaAgenda` apaga as não resolvidas, as doses de hoje que sobram para um fora da agenda já são todas resolvidas — nenhum filtro de status extra é necessário, mas um teste trava esse invariante. O alerta de estoque desses itens sai `null` porque o medicamento real (com `naAgenda: false`) é passado para `alertaEstoqueDoMedicamento`.

### 4. `naAgenda` obrigatório no alerta de estoque

O parâmetro de `alertaEstoqueDoMedicamento` passa a `{ quantidadeEmEstoque; quantidadePorEmbalagem; naAgenda: boolean }` e o teste vira `if (!medicamento.naAgenda)`. O helper `alertaDe` da agenda diária passa a tipar o medicamento com o mesmo formato. Todos os chamadores atuais já passam a linha do banco, então a mudança só endurece o tipo.

### 5. Confirmação sem agenda não valida "em uso"

No modo cadastro, `confirmar()` chama `prepararCadastro` com `emUso` removido quando o interruptor está desligado — o mesmo objeto que `cadastrarMedicamento` vai usar. A comparação de assinatura já é pulada nesse caso e continua assim.

### 6. Paginação na consulta

- Repositório: `listarMedicamentosComEsquema(db, { naAgenda?, limite, deslocamento })` faz **uma** consulta com `innerJoin` de `esquemas` (não removido) e o filtro no `WHERE`, ordena em JS e devolve só a fatia pedida; `contarMedicamentos(db)` devolve `{ total, naAgenda }` em SQL para o cabeçalho, o estado vazio e o `temMais`.
- Ordenação: `COLLATE NOCASE` foi descartado porque o SQLite põe "Ácido" depois de "Zinco", e `localeCompare('pt-BR')` não existe no SQLite. A ordem continua em JS sobre as linhas da única consulta, que custam pouco; o caro (consulta de esquema por item, resumo, situação e alerta de estoque) passou a ser feito só para a página. Um teste com "Ácido fólico" trava a ordem.
- Tela: guarda os itens já montados e, em `onEndReached`, busca a próxima página e monta só ela (resumo, situação, alerta). No foco e na troca de filtro, recarrega da página 1. `filtrarEPaginar` sai de `lista.ts` (o fatiamento vai para a consulta); `FiltroAgenda` e `TAMANHO_PAGINA` ficam.

*Alternativa considerada*: tirar a paginação e deixar a `FlatList` virtualizar. Rejeitada porque o requisito "Paginação da aba Medicamentos" pede páginas de 20 e o ganho real (não montar dados de itens não vistos) só vem paginando a consulta.

### 7. Selo compartilhado

`src/components/medicamento/selo.tsx` exporta `Selo({ texto, icone? })` com `icone` aceitando `'sinoDesligado' | 'calendario'`, usando o espaçamento atual do selo da lista (8/2). `SeloForaDaAgenda` vira um uso de `Selo` (ou é removido em favor dele) e o detalhe passa a usar o mesmo componente.

### 8. Gating num lugar só

- `listarEsquemasCiclicos` volta a filtrar `tipo = 'CICLICO'` no SQL, reaproveitando o mesmo `WHERE` de ativos (extrair a condição de `listarEsquemasAtivos` numa constante/função local do repositório).
- Em `contexto.ts`, sai o `!encontrado.naAgenda` (a consulta já garante) e a checagem `dominio.tipo !== 'CICLICO'` pode virar uma asserção de tipo.

## Risks / Trade-offs

- [A consulta ainda lê todas as linhas para ordenar] → é uma consulta só, sem trabalho por item; se um dia houver milhares de medicamentos, uma coluna de nome normalizado permite `ORDER BY/LIMIT` no SQL.
- [Prévia da volta e materialização divergirem nos horários pulados] → ambas usam a mesma lista "já resolvidos hoje" calculada em `prepararVoltaAAgenda`, e a materialização recebe o plano da prévia (decisão 2); teste de domínio compara prévia e doses gravadas.
- [Volta de intervalo com dose tomada muito no futuro por relógio errado] → `max(ultima + intervalo, agora)` já limita para não ficar antes de agora; não há limite superior, como no cadastro em uso.
- [Mudar a assinatura de `adicionarAAgenda` quebra testes existentes] → ajuste mecânico, listado nas tarefas.

## Migration Plan

Sem migração de banco. Doses duplicadas que já existam em aparelhos de teste (resolvida + pendente no mesmo horário) não são limpas automaticamente; como a change de origem ainda não foi verificada no aparelho nem publicada, não há dado de usuário a corrigir.

## Open Questions

- (nenhuma)
