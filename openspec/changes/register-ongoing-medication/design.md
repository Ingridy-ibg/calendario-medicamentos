## Context

Referência visual: fileira "Medicamento já em uso" do canvas (https://claude.ai/artifact/5RZ2sX5YF1fbQTYfot6j8J) — **Cadastro — já estava tomando** (com o tipo de esquema ajustável no Tweaks), **Confirmar — cíclico em uso**, **Confirmar — tratamento em andamento** e **Confirmar — medicamento novo** —, além do artboard **Novo medicamento**, que agora tem a seção "Início" e termina em "Continuar". Onde canvas e specs divergirem, as specs mandam.

Estado atual do código relevante:

- `paraEsquemaDominio` usa `esquemas.createdAt` como `dataInicio` de DIARIO, INTERVALO_HORAS e DIAS_SEMANA; `estaDentroDaDuracao(dataInicio, duracaoDias, dia)` conta a duração a partir dela.
- `cadastrarMedicamento` cria o CICLICO com `dataInicioCiclo: null` (em espera) e não gera doses; `calcularStatusDoDia`/`gerarDosesCiclico` já funcionam com qualquer `dataInicioCiclo` no passado.
- INTERVALO_HORAS: `gerarPrimeiraDoseIntervalo` devolve `dataInicio` (o momento do cadastro) como primeira dose.
- `inserirDose` aceita `status`, mas grava `dataHoraRegistro: null`.
- Ainda não se sabe se `materializarJanela` inclui doses de hoje com horário já passado no momento do cadastro (a mesma dúvida da decisão 4 da `manage-medications`); a spec agora exige que não inclua.

Esta change depende de `manage-medications` (`FormularioMedicamento`, `preverFimDoEstoque`) e de `apply-visual-identity` (componentes de UI).

## Goals / Non-Goals

**Goals:**
- Toda a lógica de "em uso" e da confirmação numa função pura de prévia, testável sem banco e sem tela, que é a mesma usada para gravar — o que a confirmação mostra é exatamente o que é salvo.
- Mudança mínima no motor de agendamento: reaproveitar `dataInicio` e `dataInicioCiclo`.

**Non-Goals:**
- Criar histórico retroativo para dias anteriores ao cadastro (decidido: ficam vazios).
- Passar a edição de medicamento pela tela de confirmação ou permitir editar a posição da cartela/data de início depois do cadastro — fica para uma change futura se for necessário.
- Contar estoque em cartelas além do que a quantidade por embalagem já permite (a confirmação do cíclico descreve o estoque como "esta cartela + N fechadas", calculado a partir das unidades).

## Decisions

### 1. Coluna `esquemas.data_inicio`

Nova coluna `data_inicio` (timestamp, nullable) via `drizzle-kit generate` + `drizzle/migrations.js`. `paraEsquemaDominio` passa a usar `linha.dataInicio ?? linha.createdAt`. Nenhum backfill necessário: nulo continua significando "começou no cadastro".

*Alternativa:* gravar `createdAt` no passado. Descartada — `createdAt` é metadado de registro e já é usado para ordenação/auditoria; misturar os dois significados quebraria o "dias anteriores ao cadastro ficam sem registro" (que precisa saber quando o cadastro aconteceu).

### 2. `DadosEmUso` no formulário e uma função pura de prévia

Tipos novos em `medication-registration/types.ts`:

```ts
type DadosEmUso =
  | { tipo: 'inicio'; dataInicio: Date }                       // diário / dias da semana com duração fixa
  | { tipo: 'intervalo'; ultimaDose: Date; dataInicio?: Date } // a cada X horas
  | { tipo: 'ciclo'; fase: 'ativo' | 'pausa'; dia: number }   // cíclico
// + dosesDeHojeTomadas: string[] ("HH:mm") para diário, dias da semana e cíclico
```

`DadosFormularioMedicamento` ganha `emUso?: { dados?: DadosEmUso; dosesDeHojeTomadas: string[] }`.

`montarPreviaCadastro(dados, agora) → PreviaCadastro` (pura, em `medication-registration/previa.ts`): valida (`validarEmUso`, somando-se a `validarFormulario`), resolve `dataInicio`/`dataInicioCiclo`/primeira dose, e devolve tudo o que a tela de confirmação mostra — próxima(s) dose(s), situação do tratamento ou da cartela, doses de hoje (tomadas / a agendar), previsão do estoque (reaproveitando `preverFimDoEstoque` da `manage-medications`), aviso de estoque insuficiente, aviso de dias sem registro — **e** o plano de gravação (`esquema` a inserir, `dosesTomadasHoje` com horário). `cadastrarMedicamento(db, dados, agora)` passa a chamar `montarPreviaCadastro` e gravar o plano, em transação.

A tela de confirmação recebe o mesmo `dados` e o mesmo `agora` (capturado ao tocar em "Continuar"), então exibe exatamente o que será gravado. Se o usuário demorar na confirmação e um horário passar, "Confirmar e agendar" recalcula com o `agora` novo e, se a prévia mudou, mostra a prévia atualizada em vez de salvar (evita gravar algo diferente do que foi visto).

*Alternativa:* calcular a prévia na tela e a gravação no domínio separadamente. Descartada — duas implementações da mesma conta divergem.

### 3. Cíclico em andamento

`dataInicioCiclo = startOfDay(hoje) − (dia − 1)` para "tomando" e `− (diasAtivos + dia − 1)` para "pausa", gravado no cadastro; `materializarDosesIniciais` passa a chamar `materializarJanela` para o CICLICO quando `dataInicioCiclo` não for nulo. A data prevista da nova cartela = `dataInicioCiclo + diasAtivos + diasPausa`. A regra de espera ao fim da pausa não muda.

### 4. Intervalo em horas

`gerarPrimeiraDoseIntervalo` ganha um parâmetro opcional `ultimaDose`: primeira dose = `max(ultimaDose + intervalo, agora)`; a prévia carrega o horário originalmente previsto quando houve ajuste. Se a última dose for de hoje, ela é registrada como tomada (decisão 5), mantendo coerência com "doses de hoje informadas entram no histórico".

### 5. Doses de hoje e doses já passadas

- Após materializar a janela, o cadastro remove as doses **não resolvidas** de hoje com horário `< agora` (vale para todo cadastro, em uso ou não — spec "Medicamento novo com horário de hoje já passado"); se `materializarJanela` já não as cria, a remoção é no-op. Um teste fixa o comportamento.
- Para cada horário em `dosesDeHojeTomadas`, insere uma dose `tomada` com `dataHoraPrevista = dataHoraRegistro = hoje às HH:mm` (`inserirDose` ganha `dataHoraRegistro` opcional), **sem** chamar `decrementarEstoque`.

### 6. Rota de confirmação e fluxo

`src/app/medicamento/confirmar.tsx`, empilhada sobre `novo` no mesmo modal. Os dados do formulário passam por um pequeno store em memória (Zustand já é usado em `src/state/agenda-ui-store.ts`) em vez de parâmetros de rota, para não serializar datas e listas na URL. "Ajustar" = `router.back()` (o formulário mantém o estado); "Confirmar e agendar" = `cadastrarMedicamento` + reconciliar notificações + permissão de full-screen intent quando especial (como hoje) + fechar o modal até a agenda.

### 7. Formulário

No `FormularioMedicamento` (da `manage-medications`): seção "Início" com o interruptor e as perguntas por tipo, conforme o artboard; o botão final vira "Continuar". Em modo edição a seção não aparece (Non-Goals).

## Risks / Trade-offs

- [Usuário informa o dia da cartela errado] → a confirmação mostra datas concretas (último comprimido, pausa, nova cartela) para ele perceber; corrigir depois exige remover e recadastrar até existir edição de posição (Non-Goals).
- [Fuso/horário de verão em `startOfDay − n dias`] → usar `subDays` do date-fns sobre `startOfDay`, como o resto do motor; teste cobrindo a virada.
- [Prévia muda entre "Continuar" e "Confirmar"] → recálculo e reexibição (decisão 2).
- [Dependência de duas changes ainda não implementadas] → implementar por último; se for antecipada, `preverFimDoEstoque` e o formulário compartilhado precisam vir junto.

## Migration Plan

Migração aditiva (coluna nullable), sem backfill. Rollback: reverter os commits; a coluna órfã é inofensiva.
