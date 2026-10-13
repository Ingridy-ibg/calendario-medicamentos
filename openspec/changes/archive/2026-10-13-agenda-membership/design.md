## Context

- Medicamento ativo hoje = `deletedAt IS NULL`; esquema ativo = `esquemas.deletedAt IS NULL`. `listarEsquemasAtivos` alimenta a agenda (`montarAgendaDoDia`), o calendário (`montarCalendarioMensal`), a renovação da janela (`renovarJanelasAtivas`) e o reconciliador (`listarAlvosDesejados`, que também filtra `notificacoesAtivas`).
- O cadastro grava a partir do plano de `montarPreviaCadastro`; a confirmação (`src/app/medicamento/confirmar.tsx`) lê `dados`/`previa` de `useCadastroStore`.
- A aba Medicamentos usa `listarMedicamentosAtivosComEsquema` e um `ScrollView`.

## Goals / Non-Goals

**Goals:** um único estado `naAgenda` respeitado por todos os pontos que geram ou mostram doses; reaproveitar a confirmação e a lógica de cadastro para a volta à agenda.

**Non-Goals:** "Já estava tomando" ao voltar para a agenda (a volta é sempre como cadastro novo); arquivar automaticamente tratamentos encerrados; paginação no banco.

## Decisions

### 1. Coluna `medicamentos.na_agenda`
Boolean `notNull().default(true)` via `drizzle-kit generate`. Separado de `notificacoesAtivas` (silenciar continua existindo para quem quer o remédio na agenda sem lembretes).

*Alternativa:* reaproveitar `esquemas.deletedAt`. Descartada: o esquema precisa continuar editável e o histórico ligado a ele.

### 2. Filtro central: `listarEsquemasAtivos` passa a ignorar fora da agenda
`listarEsquemasAtivos` faz join com `medicamentos` e devolve só esquemas de medicamentos não excluídos **e** na agenda. Como agenda, calendário, renovação e reconciliador partem dela, todos passam a respeitar o estado sem mudanças locais. Para o histórico de dias passados, o calendário continua lendo as doses resolvidas diretamente (não muda). Pontos que leem doses sem passar por ela (`listarDosesDoIntervalo` na agenda, `listarDosesAtivasComNotificacaoPendente` no reconciliador) já descartam doses sem esquema ativo ou passam a checar `naAgenda` — um teste por ponto garante.

### 3. `retirarDaAgenda` e `adicionarAAgenda` no domínio
- `retirarDaAgenda(db, medicamentoId, agora)`: transação — `naAgenda = false` e `substituirDosesFuturas(esquema, [])` (apaga as não resolvidas, mantém o histórico). A tela reconcilia as notificações.
- `adicionarAAgenda(db, medicamentoId, agora)`: transação — monta `DadosFormularioMedicamento` do medicamento atual (`paraValoresFormulario` → `paraDadosFormulario`, sem `emUso`), calcula o plano com `montarPreviaCadastro`, grava no esquema `dataInicio = agora` e `dataInicioCiclo = null`, `naAgenda = true`, e materializa as doses iniciais com a mesma função do cadastro (`materializarDosesIniciais`, que já descarta horários de hoje passados).
- `editarMedicamento`/`editarEsquema` não geram doses quando o medicamento está fora da agenda.

### 4. Confirmação com dois modos
`useCadastroStore` ganha `modo: 'cadastro' | 'volta_agenda'` e `medicamentoId` (na volta). Na volta, a prévia é montada pelo detalhe a partir do medicamento; os botões viram "Editar" (vai para `medicamento/[id]/editar`) e "Adicionar à agenda" (chama `adicionarAAgenda`, reconcilia, fecha). No cadastro, o interruptor "Adicionar à agenda" (estado local, padrão ligado) esconde os blocos de agenda quando desligado; `cadastrarMedicamento(db, dados, agora, { naAgenda })` com `naAgenda = false` grava o medicamento e o esquema sem materializar doses e sem aplicar o plano de "em uso".

### 5. Lista: filtro e paginação em memória
`listarMedicamentosComEsquema(db)` (renomeada; inclui fora da agenda) devolve a lista ordenada por `naAgenda` desc e nome (`localeCompare('pt-BR')`); uma função pura `filtrarEPaginar(lista, filtro, pagina, tamanho = 20)` aplica o filtro e devolve `{ itens, temMais }`. A tela usa `FlatList` com `onEndReached` para pedir a próxima página e volta à página 1 ao trocar o filtro. O painel de filtro é um `Segmentado` que aparece abaixo do cabeçalho ao tocar no ícone `filtro` (novo nome no `Icone`: `filter_list` / `line.3.horizontal.decrease`), com um ponto de destaque quando o filtro não é "Todos".

*Alternativa:* paginar no SQL com `LIMIT/OFFSET`. Descartada por agora: a ordenação em pt-BR (acentos) não é a do SQLite e a lista é local e pequena; a função de paginação isola a troca se um dia for necessária.

## Risks / Trade-offs

- [Algum ponto de leitura esquecer o filtro e mostrar dose de medicamento fora da agenda] → o filtro mora em `listarEsquemasAtivos`, e a tarefa 1.3 testa agenda, calendário, renovação e alvos de notificação.
- [Volta à agenda perder o início original de um tratamento] → é o comportamento escolhido (recomeça hoje); a confirmação mostra as datas novas antes de confirmar.
- [Interação com `stock-in-boxes`] → quando implementada, `classificarEstoque` deve devolver `null` para medicamentos fora da agenda.

## Migration Plan

Migração aditiva com padrão `true`: todos os medicamentos existentes continuam na agenda. Rollback: reverter os commits.
