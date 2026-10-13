## Context

A referência visual desta change são os artboards da fileira "Gestão de medicamentos" do canvas "Calendário de Medicamentos — Telas" (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J): **Medicamentos (lista)**, **Detalhe do medicamento**, **Registrar compra** e **Editar medicamento**, além da barra de 3 abas e do link do nome do medicamento na **Agenda do dia**. Onde o canvas e as specs divergirem, as specs mandam; os dados dos artboards são exemplos.

O domínio já cobre quase tudo (ver proposal.md — Why):

- `editarEsquema(db, esquemaId, dados, agora)` valida e grava os parâmetros do esquema e regenera as doses futuras. Ele não grava `tipo` no patch — trocar de tipo não é suportado, e a spec desta change fixa isso.
- `removerMedicamentoComHistorico(db, id, agora)` faz soft delete do medicamento e dos esquemas e apaga as doses não resolvidas.
- `reporEstoque(db, id, quantidade, agora)` soma ao estoque, sem validar a quantidade.
- `atualizarMedicamento` (repositório) aceita patch de `nome`, `dosagem`, `criticidade`, `quantidadeEmEstoque`, `quantidadePorEmbalagem`, `notificacoesAtivas`, sem validação.
- O reconciliador já ignora doses de medicamentos com `notificacoesAtivas = false` (`alvos.ts`) e de medicamentos removidos; `reconciliarNotificacoesSeDisponivel(db)` (`src/lib/notificacoes-seguras.ts`) é o ponto seguro para chamá-lo das telas, inclusive no Expo Go.
- `substituirDosesFuturas` apaga **todas** as doses não resolvidas do esquema (status pendente/aguardando), inclusive as de horário já passado.
- Não existe consulta de "todos os medicamentos ativos com seu esquema"; a agenda e o calendário partem de `listarEsquemasAtivos`.
- O formulário de cadastro (`src/app/medicamento/novo.tsx`) concentra estado, conversão para `DadosFormularioMedicamento` e a chamada a `cadastrarMedicamento` num único componente de tela.

## Goals / Non-Goals

**Goals:**
- Expor editar, remover, registrar compra e silenciar notificações com o mínimo de lógica nova, reaproveitando as funções de domínio existentes.
- Toda lógica nova (validação de compra, edição de campos comuns, resumo do esquema para a lista, conversão esquema → valores do formulário) em funções puras ou de domínio testadas com Vitest.

**Non-Goals:**
- Trocar o tipo de esquema na edição (decidido com o usuário: remover e cadastrar de novo).
- Desfazer remoção, lixeira ou restauração de medicamento removido.
- Tela de histórico por medicamento (o calendário continua sendo onde o histórico aparece).
- Silenciar só um horário, ou silenciar por um período (o controle é liga/desliga por medicamento, como na spec original).
- Pedir permissão de full-screen intent na edição: hoje ela é pedida no primeiro cadastro de um especial; trocar comum → especial na edição passa a pedir também (ver decisão 6), mas nada além disso muda no fluxo de permissões.

## Decisions

### 1. Rotas

- `src/app/(tabs)/medicamentos.tsx` — aba Medicamentos (terceiro `NativeTabs.Trigger`, ícone de pílula/lista).
- `src/app/medicamento/[id].tsx` — detalhe, empilhado no `Stack` raiz (fora das abas, com cabeçalho e voltar).
- `src/app/medicamento/[id]/editar.tsx` — edição, apresentada como modal, igual ao `novo`.

A rota `medicamento/novo` continua; como `novo` é segmento estático, tem precedência sobre `[id]` no expo-router (confirmar na doc v57, conforme AGENTS.md).

*Alternativa:* detalhe dentro da aba Medicamentos (Stack aninhado na aba). Descartada porque o detalhe também é aberto pela agenda; uma rota única no Stack raiz evita duas cópias e o problema de qual aba fica ativa.

### 2. Formulário compartilhado entre cadastro e edição

Extrair de `novo.tsx` um componente `FormularioMedicamento` (`src/components/medicamento/formulario-medicamento.tsx`) que recebe `valoresIniciais`, `modo: 'cadastro' | 'edicao'` e `aoSalvar(dados) => void` (que pode lançar `ErroValidacao`, como hoje). Em `modo: 'edicao'` o seletor de tipo fica travado no tipo atual, com a nota explicando como trocar.

Duas funções puras novas, testadas:
- `paraValoresFormulario(medicamento, esquemaRow)` → estado inicial do formulário (strings para os inputs, horários ordenados, duração contínua/dias, `horario` do cíclico a partir de `horarios[0]`).
- A conversão inversa já existe implicitamente em `novo.tsx` (`construirDadosEsquema`); ela é movida para o componente compartilhado sem mudança de comportamento.

*Alternativa:* uma tela de edição separada, mais enxuta. Descartada: duplicaria as regras de exibição por tipo de esquema que a spec de cadastro define.

### 3. Edição de campos comuns no domínio: `editarMedicamento`

Nova função em `registration.ts`: `editarMedicamento(db, medicamentoId, dados: DadosFormularioMedicamento, agora)` que:
1. valida com `validarFormulario` (mesmas regras do cadastro, incluindo estoque ≥ 0);
2. aplica a regra "cíclico é sempre especial";
3. grava os campos comuns com `atualizarMedicamento` (incluindo `quantidadeEmEstoque` como correção — spec `medication-stock`);
4. chama `editarEsquema` para o esquema ativo do medicamento, rejeitando se `dados.esquema.tipo` for diferente do tipo atual;
5. roda tudo numa transação do Drizzle, para que um erro no esquema não deixe os campos comuns gravados pela metade.

A tela chama `editarMedicamento` e, em seguida, `reconciliarNotificacoesSeDisponivel(db)`.

### 4. Doses pendentes de horário já passado sobrevivem à edição

Risco encontrado no código: `editarEsquema` → `materializarJanela` → `substituirDosesFuturas` apaga todas as doses não resolvidas, e regenera a partir de `agora`. Se às 10:00 o usuário edita um diário com a dose das 08:00 ainda pendente, essa dose pode sumir da agenda sem ter sido tomada nem marcada como perdida — e a spec diz que a edição vale "somente para doses futuras".

Decisão: no caminho de edição, preservar as doses não resolvidas com `dataHoraPrevista <= agora` (apagar e regenerar só as de horário futuro). Implementação: uma variante de `substituirDosesFuturas` com corte por horário (`substituirDosesAPartirDe(db, esquemaId, agora, novas)`), usada por `materializarDosesFuturasAposEdicao`. A primeira tarefa da implementação escreve o teste que reproduz o caso antes de mudar o código; se o teste mostrar que os geradores já preservam o caso, a variante não é criada.

`removerMedicamentoComHistorico` continua apagando todas as não resolvidas — numa remoção, a dose pendente das 08:00 deve mesmo sumir.

### 5. Registro de compra: folha inferior com quantidade sugerida

No detalhe, "Registrar compra" abre uma folha (modal `presentation: 'formSheet'` ou componente de bottom sheet do próprio app, conforme a doc v57) com um campo numérico pré-preenchido com `quantidadePorEmbalagem`, atalhos "+1 caixa" / "+2 caixas" e o botão "Adicionar ao estoque". Validação em função pura `validarQuantidadeCompra(texto) → número | erro` (inteiro > 0), testada; `reporEstoque` também passa a rejeitar quantidade ≤ 0 (defesa em profundidade, com teste). Reposição não mexe nas notificações, então não reconcilia.

### 6. Notificações: interruptor que grava e reconcilia

O interruptor chama `atualizarMedicamento(db, id, { notificacoesAtivas })` (via uma função de domínio fina `definirNotificacoesAtivas`, para a tela não importar o repositório direto) e depois `reconciliarNotificacoesSeDisponivel(db)`, que cancela ou reagenda os alarmes. O interruptor não é renderizado para esquemas `SE_NECESSARIO`.

Se a edição mudar um medicamento de comum para especial, a tela chama `solicitarPermissaoFullScreenIntent()` como o cadastro já faz.

### 7. Remoção com `Alert.alert` nativo

Confirmação com `Alert.alert` (diálogo nativo do Android, botões "Cancelar" e "Remover" com estilo destrutivo), texto explicando que lembretes e doses futuras são cancelados e o histórico é mantido. Ao confirmar: `removerMedicamentoComHistorico` → reconciliar → `router.back()`.

### 8. Lista: consulta + resumo do esquema

- Nova consulta `listarMedicamentosAtivosComEsquema(db)` no repositório (join medicamento × esquema ativo, `deletedAt` nulo, ordenada por nome com `localeCompare('pt-BR')`), testada com o banco de teste existente (`create-test-db.ts`).
- Função pura `resumirEsquema(esquemaRow) → string` ("Diário · 08:00, 20:00", "A cada 8 h", "Seg, Qua, Sex · 08:00", "Cíclico 21/7 · 22:00", "Se necessário · até 4 por dia"), testada.
- Indicadores de estoque baixo (`temAlertaDeRecompra`) e silenciado (`!notificacoesAtivas`).

### 8b. Situação do ciclo, últimos 7 dias e previsão do estoque

Três informações que o canvas mostra e as specs agora exigem, todas como funções puras/de domínio testadas, sem lógica nova de agendamento:

- `situacaoCiclo(esquema, hoje)` → `{ tipo: 'ativo', dia, total } | { tipo: 'pausa', voltaEmDias } | { tipo: 'aguardando_cartela' }`, reaproveitando o cálculo de posição de `dose-scheduling/ciclico.ts` (o mesmo que alimenta "dia X de Y" na agenda).
- `adesaoUltimosDias(db, medicamentoId, hoje, 7)` → 7 entradas `{ dia, pior: StatusDose | null }` + `{ tomadas, total }`, sobre `listarHistoricoPorMedicamento` mais as doses de hoje ainda não resolvidas; o "pior status" usa a mesma ordem de `corDoDia` do calendário (perdida > pulada > atraso > tomada). Pendentes de hoje não contam no total.
- `preverFimDoEstoque(esquema, estoque, agora)` → `{ data, aproximada } | { acabou: true } | null`: gera doses futuras com os mesmos geradores puros que o calendário usa para dias futuros (`gerarDosesDiario`, `gerarDosesDiasSemana`, `gerarDosesCiclico`; para intervalo em horas, a grade estimada a partir da próxima dose pendente, marcada `aproximada`), conta só as de `dataHoraPrevista > agora` e devolve a data da N-ésima, N = estoque. Limite de busca de 2 anos para não iterar sem fim; além disso, mostra "mais de 2 anos". `null` para "se necessário".

### 9. Atualização das telas

Todas as telas já recarregam com `useFocusEffect`. Lista, detalhe e agenda seguem o mesmo padrão; não há estado global novo.

### 10. Visual

Se `apply-visual-identity` já estiver implementada, as telas novas usam `Cartao`, `Botao`, `Chip`, `CampoTexto`, `Icone` e os tokens dela. Se não, usam `ThemedView`/`ThemedText` atuais e entram na lista de telas a restilizar daquela change. A ordem recomendada é implementar `apply-visual-identity` primeiro.

## Risks / Trade-offs

- [Deltas de `medication-registration`, `medication-stock` e `dose-notifications` dependem da change não arquivada `add-medication-scheduling`] → arquivá-la primeiro.
- [Editar criticidade de especial para comum com uma dose já em cascata de reenvio] → o reconciliador recalcula os alvos pela criticidade atual; o contador `notificacoesSemResposta` da dose é mantido, então uma dose com 4+ reenvios sem resposta vira perdida pela regra do comum. Aceitável e coerente com a spec; coberto por um teste.
- [Alert nativo não é estilizável] → é o padrão da plataforma para ações destrutivas e já é acessível; não vale construir um diálogo próprio.
- [Excluir e regenerar doses futuras troca os IDs das doses] → as notificações agendadas usam o ID da dose; por isso toda edição reconcilia logo em seguida (spec `dose-notifications`).

## Migration Plan

Sem migração de banco. Implementar na ordem das tarefas (domínio e testes → lista → detalhe → compra/notificações → edição → remoção → integração com a agenda). Rollback é reverter os commits.
