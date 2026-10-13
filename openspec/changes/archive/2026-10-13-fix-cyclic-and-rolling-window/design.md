## Context

Ver proposal.md (Why) para os três defeitos e como foram reproduzidos. Pontos do código:

- `confirmarNovaCartelaCiclica(db, esquema, agora)` (`dose-scheduling/resolucao.ts`) calcula o novo esquema e materializa a janela, mas não grava `dataInicioCiclo`; `atualizarEsquema` deliberadamente não aceita esse campo.
- `materializarJanela(db, esquema, hoje, semanas = 4)` usa `substituirDosesFuturas`, que apaga **todas** as doses não resolvidas do esquema (inclusive de horário já passado) e insere as novas — por isso não serve, como está, para rodar a cada abertura.
- `montarAgendaDoDia` só lista linhas de `doses` e itens "se necessário"; um cíclico em espera não tem linha nenhuma.
- O reconciliador de notificações roda na abertura (`inicializarNotificacoes`) e na tarefa periódica (`registrarReconciliacaoPeriodica`), mas só fora do Expo Go.

## Goals / Non-Goals

**Goals:** corrigir os três defeitos com mudança mínima e testes que verifiquem o **banco**, não só objetos devolvidos.

**Non-Goals:** cadastrar cíclico já no meio da cartela (é da `register-ongoing-medication`); ação "Comecei a nova cartela" na notificação (pode vir depois; a agenda resolve o bloqueio).

## Decisions

### 1. Gravar a âncora do ciclo
Nova função `definirInicioCiclo(db, esquemaId, data, agora)` em `db/repositories/esquemas.ts`, separada de `atualizarEsquema` (que continua sem tocar no campo, para edições não reiniciarem o ciclo). `confirmarNovaCartelaCiclica` a chama antes de materializar, tudo numa transação.

### 2. Renovação da janela sem apagar nada: `renovarJanela`
Nova função `renovarJanela(db, esquema, agora)` em `janela-rolante.ts`: se a última dose prevista do esquema estiver a menos de `SEMANAS_JANELA_MINIMA` (2) semanas de `agora`, gera as doses de `[dia seguinte à última dose prevista, agora + 4 semanas]` e **só insere** as que ainda não existem (mesmo `esquemaId` + `dataHoraPrevista`). Nunca apaga. Respeita duração (os geradores já usam `estaDentroDaDuracao`) e ignora esquemas sem grade, cíclicos em espera e esquemas removidos.

`renovarJanelasAtivas(db, agora)` percorre `listarEsquemasAtivos`. É chamada:
- no layout raiz quando as migrações terminam e a cada volta ao primeiro plano (`AppState`) — **antes** do reconciliador e também no Expo Go, porque não depende de notificações;
- no início da tarefa periódica de segundo plano, antes de reconciliar.

*Alternativa:* chamar `materializarJanela` em cada abertura. Descartada: apagaria doses pendentes de horário já passado e trocaria IDs de doses com notificação agendada.

### 3. Cíclico em espera na agenda
`montarAgendaDoDia` passa a incluir `ItemAgendaAguardandoCartela { tipo: 'aguardando_cartela', esquemaId, medicamentoId, nome, dosagem, alertaEstoque }` para cada cíclico ativo cujo `calcularStatusDoDia(esquema, hoje).fase === 'em_espera'`. Ele entra na seção do período do horário do ciclo (`horarios[0]`) e não conta no resumo do dia (`resumirDia` só conta `tipo: 'dose'`). Na tela, o item mostra "Aguardando nova cartela" e o botão "Comecei a nova cartela", que chama `confirmarNovaCartelaCiclica(db, esquema, new Date())` e reconcilia as notificações.

### 4. Permissão de tela cheia uma vez
Chave `permissao.telaCheiaPedida` no kv-store (via `src/lib/preferencias.ts`); o cadastro só chama `solicitarPermissaoFullScreenIntent()` quando ela estiver ausente e a grava em seguida.

## Risks / Trade-offs

- [Usuário fica meses sem abrir o app e sem tarefa de segundo plano] → ao abrir, a renovação cobre a partir de hoje; dias passados sem doses ficam sem registro, como já acontece hoje.
- [Item novo no `ItemAgenda` quebra `switch`/filtros existentes] → a tela e `agruparPorPeriodo` tratam o novo tipo explicitamente; typecheck pega os demais.

## Migration Plan

Sem migração. Cíclicos já cadastrados (em espera) passam a aparecer na agenda com a ação de iniciar; diários antigos têm a janela renovada na primeira abertura.
