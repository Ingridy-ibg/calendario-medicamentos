## Context

Hoje o cíclico tem uma única âncora, `esquemas.dataInicioCiclo`, que cobre exatamente um ciclo (`calcularStatusDoDia` em `src/domain/dose-scheduling/ciclico.ts`). Depois da pausa, o esquema fica `em_espera` sem data:
- `gerarDosesCiclico` não gera nada;
- `calendario-mensal.ts` não projeta nada;
- o reconciliador não tem alvo nenhum, porque só conhece `'dose' | 'pausa-ciclo'`.

A agenda mostra o item `aguardando_cartela`, e "Comecei a nova cartela" chama `confirmarNovaCartelaCiclica` (`resolucao.ts`). Essa função grava a âncora, materializa a janela e resolve a dose `numeroNoCiclo === 1` recém-criada.

Restrições que moldam o desenho:
- todo cíclico é especial (`registration.ts`, `formulario.ts`), então nunca fica perdida e só tem "tomei agora";
- a janela rolante grava doses reais, e toda dose gravada ganha alarme;
- a renovação e a edição usam `substituirDosesFuturas` e `substituirDosesAPartirDe`, que apagam doses não resolvidas da janela.

## Goals / Non-Goals

**Goals:**
- Uma fonte única e pura para "quando começa a próxima cartela", usada pela janela rolante, pelo calendário e pela agenda.
- Reaproveitar o pipeline de dose (cascata especial, ações, reconciliador e, no futuro, o alarme nativo de `alarme-tela-cheia`) para o alarme de início, sem criar um tipo de alvo novo.

**Non-Goals:**
- Mudar a previsão de fim de estoque (`preverFimDoEstoque`), que já supõe cartelas seguidas.
- Lembrete antecipado ("amanhã começa a nova cartela"). Fica para depois, se fizer falta.
- Mudar o lembrete de dia de pausa.

## Decisions

### 1. A dose de início é uma linha comum em `doses`, identificada por derivação

A dose de início de cartela é uma dose do esquema cíclico com `numeroNoCiclo = 1`. Ela está **pendente de início** quando ainda não foi resolvida e o dia dela cai em `em_espera` segundo a âncora atual. Um "dia 1" de um ciclo já ancorado (por exemplo, o cadastro em uso no dia 1) cai em `ativo` e continua sendo uma dose normal.

Uma função `ehInicioDeCartelaPendente(esquema, dose)` em `ciclico.ts` concentra a regra.

- *Alternativa:* uma coluna `doses.inicioCartela`. É mais explícita, mas exige migração na tabela mais volumosa e duplica uma informação derivável. Fica descartada enquanto a derivação for suficiente.
- *Alternativa:* um alvo derivado `'inicio-cartela'` no reconciliador, como a pausa. Foi descartada na exploração, porque perderia a cascata especial, o registro de atraso e o histórico.

### 2. Início previsto: derivado da âncora, ou persistido quando não há âncora

Uma função pura `inicioPrevistoDaCartela(esquema): Date | null`:
- com `dataInicioCiclo`: o dia `dataInicioCiclo + diasAtivos + diasPausa`, no horário do ciclo;
- sem âncora: a nova coluna `esquemas.inicioCartelaPrevisto` (início do dia; o horário vem sempre de `horarios[0]`, então editar o horário move a dose de início sem regravar a coluna).

A coluna é gravada pelo cadastro novo e pela volta à agenda (decisão 6) e zerada quando o ciclo é iniciado.

- *Alternativa:* usar a própria linha da dose de início como fonte da verdade quando não há âncora. Foi descartada porque a edição (`substituirDosesAPartirDe`) e a renovação apagam doses não resolvidas, e a data se perderia.

### 3. A janela rolante gera a dose de início, mas nunca os dias seguintes

`gerarDosesCiclico` passa a emitir, além dos dias ativos do ciclo atual, uma única dose `numeroNoCiclo = 1` no `inicioPrevistoDaCartela`, quando esse dia cai em `[de, ate]`. Ela nunca emite os dias 2+ de um ciclo que não começou. Assim a renovação, a edição e o cadastro passam a criar e mover a dose de início sem código específico.

Uma dose de início vencida (dia anterior a `de`) não é tocada pela janela, porque continua pendente no passado. A implementação precisa conferir que `substituirDosesFuturas` e `substituirDosesAPartirDe` não apagam doses pendentes anteriores ao início da janela.

### 4. Confirmar a dose de início generaliza `confirmarNovaCartelaCiclica`

Comportamento (specs/dose-scheduling):
- **No dia previsto ou depois:**
  1. resolve a própria dose de início, com as regras de atraso de sempre;
  2. grava `dataInicioCiclo = agora` e zera `inicioCartelaPrevisto`;
  3. materializa a janela a partir de amanhã, ignorando o `numeroNoCiclo = 1` que o gerador produziria hoje;
  4. desconta uma unidade do estoque.
- **Antes do dia previsto:** apaga a dose de início e segue o fluxo atual, que materializa a partir de agora e resolve o dia 1 de hoje.

`aplicarRespostaDeNotificacao` com `tomei_agora` numa dose de início pendente chama esse mesmo fluxo, em vez de `confirmarDose`. A agenda continua chamando o mesmo fluxo pelo botão "Comecei a nova cartela".

- *Trade-off:* na confirmação atrasada, o "dia 1" no histórico fica no dia previsto (tomada com atraso) e os dias entre o previsto e a confirmação ficam vazios. Isso é coerente com qualquer especial atrasada e deixa o atraso visível. A alternativa de mover a dose para o dia real esconderia o atraso.

### 5. Projeção do calendário

Uma função pura `projetarCiclos(esquema, de, ate, hoje)` em `ciclico.ts` devolve, por dia, `ativo | pausa | inicio-cartela`:
1. percorre o ciclo atual;
2. a partir de `max(inicioPrevisto, hoje)` (decisão da exploração: cartela atrasada é suposta começando hoje), repete `inicio-cartela`, `diasAtivos − 1` dias ativos e `diasPausa` dias de pausa até `ate`.

`calendario-mensal.ts` troca o laço atual do `CICLICO` por essa função. O resultado inclui um novo `ItemDiaInicioCartela` (`tipo: 'inicio-cartela'`, com horário) e itens previstos e de pausa como hoje.

No histórico (hoje e dias passados), uma dose com `numeroNoCiclo = 1` aparece com o rótulo "Início da nova cartela" no painel.

`marcador-dia.ts`: os status de histórico continuam vencendo (perdida, atrasada, cheio). Num dia futuro, `inicio-cartela` tem uma marca própria (ponto em contorno no token de destaque, com anel ou ícone de estrela; o visual exato fica para a implementação, seguindo o canvas) e vence "previsto". A legenda ganha "Nova cartela".

### 6. Cadastro e volta à agenda: a escolha fica na prévia

`montarPreviaCadastro` calcula, para cíclico sem "em uso", o modo de início:
- `hoje`, quando o horário de hoje ainda não passou;
- `pergunta`, quando já passou.

A escolha do usuário (`ja_tomei` ou `amanha`) entra no plano:
- `ja_tomei`: `dataInicioCiclo` = hoje no horário do ciclo e a dose do dia 1 marcada como tomada, reaproveitando `dosesTomadasHoje` do cadastro em uso, que já não decrementa o estoque;
- `amanha` ou `hoje`: `inicioCartelaPrevisto` = o dia escolhido.

A pergunta mora em `src/app/medicamento/confirmar.tsx`, que já atende cadastro e volta. No toque em "Confirmar e agendar", a prévia é recalculada com o `agora` atual: se o modo mudou de `hoje` para `pergunta`, a tela mostra a pergunta e não salva, como na regra existente de "dados que deixaram de valer".

### 7. Agenda diária

- O item `aguardando_cartela` ganha `inicioPrevisto: Date` e `atrasada: boolean` (mais de 30 minutos depois do início previsto, mesma regra de `estaAtrasada`).
- Uma dose de início **pendente** é filtrada de `itensDose`, porque o item de espera a representa.
- Uma dose de início **resolvida** aparece como dose normal ("dia 1 de 21").

### 8. Conteúdo da notificação

`conteudoDose` (e o conteúdo do alarme nativo, quando `alarme-tela-cheia` existir) recebe um indicador de início de cartela. O contexto vem de `buscarContextoDaDose`, que já carrega esquema e dose, e muda título e corpo. Canal e categoria continuam os do especial.

## Risks / Trade-offs

- [Alarme especial de início que toca a noite inteira se a usuária estiver longe da cartela] → É o comportamento especial especificado. Fica registrado como possível evolução (adiar ou "lembrar amanhã" só para o início).
- [A derivação de `ehInicioDeCartelaPendente` falhar num caso de borda (âncora editada, ciclo sem pausa)] → Testes unitários cobrindo: ciclo sem pausa, cadastro em uso no dia 1, confirmação antecipada, confirmação atrasada e ciclos consecutivos.
- [Os `substituir*` apagarem a dose de início vencida] → Tarefa explícita de verificação e teste antes de mexer no gerador.
- [Dois cálculos de ciclos futuros (projeção e `preverFimDoEstoque`) divergirem] → `projetarCiclos` fica disponível. Migrar a previsão de estoque é opcional e fora do escopo.

## Migration Plan

1. Migração Drizzle adicionando `esquemas.inicio_cartela_previsto` (timestamp, nulo).
2. Correção única na inicialização, idempotente: para todo cíclico na agenda com `dataInicioCiclo` e `inicioCartelaPrevisto` nulos (o "aguardando" de hoje), gravar `inicioCartelaPrevisto` = hoje se o horário do ciclo ainda não passou, ou amanhã se já passou. Em seguida a renovação da janela e o reconciliador criam a dose e o alarme.
3. Rollback: a coluna é opcional e ignorada pelo código antigo. As doses de início já criadas seriam vistas pelo código antigo como doses comuns de dia 1, e confirmá-las não iniciaria o ciclo. É aceitável num app ainda em preview.
