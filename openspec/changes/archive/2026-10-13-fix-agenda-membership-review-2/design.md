## Context

Os achados vêm da revisão do commit `b9e6f35` (veja proposal.md, "Why"). Estado atual relevante:

- `resolverPlano` (`previa.ts`) monta `horariosJaResolvidos` a partir de `historico.resolvidas` (horário previsto exato) e, no intervalo em horas, calcula `primeiraDoseIntervalo` a partir de `historico.ultimaTomada`, sem olhar `horariosJaResolvidos`. A prévia filtra as `futuras` por `horariosJaResolvidos`; `materializarDosesIniciais` usa esse conjunto só na grade e, no intervalo, insere `plano.primeiraDoseIntervalo` direto. Por isso prévia e banco divergem quando o próximo horário já foi pulado.
- Na grade, a comparação é por timestamp exato, então um horário editado enquanto o medicamento estava fora da agenda não casa com a dose resolvida no horário antigo.
- `confirmar()` (`confirmar.tsx`) chama `prepararCadastro` sem `try/catch`; com o interruptor ligado, um `ErroValidacao` escapa do `onPress`.
- A aba Medicamentos recarrega `montarPagina(filtro, 0)` em todo foco e calcula o deslocamento de `carregarMais` a partir de `itens.length` do último render.
- `contarMedicamentos` conta medicamentos não removidos sem o `innerJoin` com esquemas que `listarMedicamentosComEsquema` usa.
- `montarAgendaDoDia` aceita qualquer dose de esquema não removido e confia que `retirarDaAgenda` apagou as não resolvidas (decisão 3 de `fix-agenda-membership-review`).

## Goals / Non-Goals

**Goals:**
- Uma única fonte para os horários já cobertos e a primeira dose do intervalo: o plano. Prévia e materialização só leem do plano.
- Nenhum caminho de toque na confirmação lança erro para fora do handler.
- A lista paginada nunca repete itens e não perde a posição ao voltar do detalhe.

**Non-Goals:**
- Levar a ordenação da lista para o SQL. A decisão 6 de `fix-agenda-membership-review` continua valendo: uma consulta leve, ordenada em JS por causa de nomes acentuados. Só o texto da tarefa 4.1 daquela change é corrigido para refletir isso.
- Casar doses resolvidas de outros dias com a grade nova. Só hoje importa, porque a volta não gera doses em dias passados e doses futuras resolvidas são raras (e já casam pelo horário exato).
- Mudar o formulário de cadastro ou as mensagens de validação existentes.

## Decisions

### 1. Grade: cada dose resolvida de hoje cobre o horário mais próximo da grade atual

Em `resolverPlano`, para esquemas de grade, `horariosJaResolvidos` passa a ser:
- os horários de hoje da grade atual (de `dosesDaGrade(esquema, hoje, hoje)`) cobertos pelas doses resolvidas de hoje: percorrendo as resolvidas de hoje em ordem de horário previsto, cada uma cobre o horário de hoje da grade, ainda livre, mais próximo do seu horário previsto (empate: o mais cedo);
- mais as resolvidas de dias seguintes, pelo horário exato, como hoje.

Quando a grade não mudou, cada resolvida cai exatamente no seu horário, então o comportamento atual se mantém. Como cada horário só pode ser coberto uma vez e cada resolvida cobre no máximo um, o total de doses de hoje nunca passa do número de horários da grade.

O cálculo depende do esquema da prévia (a grade atual), por isso ele fica em `resolverPlano`/`montarPreviaCadastro` e não em `historicoDaVolta`, que continua devolvendo só o que está no banco. A materialização não muda: ela já apaga a pendente gerada em cada horário de `horariosJaResolvidos`.

*Alternativa considerada*: casar só por "mesmo período do dia" (manhã/tarde/noite). Rejeitada: os limites dos períodos são arbitrários e não garantem o teto de doses por dia.

*Alternativa considerada*: limitar só a contagem (hoje gera no máximo `horários − resolvidas` doses, as últimas). Rejeitada: no cenário 08:00 → 08:00/14:00 ela daria o mesmo resultado, mas não diz qual horário a dose resolvida cobriu, e a prévia precisa mostrar isso.

### 2. Intervalo: a primeira dose pula horários já resolvidos

Ainda em `resolverPlano`, depois de `gerarPrimeiraDoseIntervalo`, enquanto `primeiraDoseIntervalo` estiver em `horariosJaResolvidos`, soma-se o intervalo. `materializarDosesIniciais` passa a inserir só `plano.primeiraDoseIntervalo` (sem o fallback que recalcula a partir de `agora`), porque o plano sempre o preenche para intervalo. Prévia e banco saem do mesmo valor.

*Alternativa considerada*: usar a última dose resolvida (incluindo pulada) como referência. Rejeitada: a decisão 1 de `fix-agenda-membership-review` já escolheu só tomadas como referência; o pulo resolve o conflito sem mudar essa regra.

### 3. Confirmação captura `ErroValidacao`

`confirmar()` envolve o cálculo da nova prévia (os dois ramos: cadastro e volta) num `try/catch` que trata só `ErroValidacao`: mostra a mensagem no `aviso` já existente e retorna sem salvar. Outros erros continuam subindo, como em todo o app. Assim o botão "Ajustar" segue funcionando para voltar ao formulário, onde a mesma validação aparece no campo.

### 4. Paginação: deslocamento num ref e recarga do que já estava carregado

- Um `useRef` guarda quantos itens já foram pedidos. `carregarMais` lê e atualiza esse ref de forma síncrona antes de buscar, então um segundo `onEndReached` antes do re-render pede a página seguinte (ou nada, se já chegou ao total) em vez de repetir a mesma.
- No foco, a tela recarrega do início com `limite = max(itens já carregados, TAMANHO_PAGINA)`. Na troca de filtro, o ref volta a zero e carrega só a primeira página. `montarPagina` ganha o parâmetro `limite`.
- `totalDoFiltro(contagem, filtro)` vira um helper em `lista.ts`, ao lado de `naAgendaDoFiltro`, e a tela usa `contagem.naAgenda` direto.

Isto substitui a frase "No foco [...] recarrega da página 1" da decisão 6 de `fix-agenda-membership-review`.

### 5. Contagem com o mesmo join da listagem

`contarMedicamentos` passa a fazer o mesmo `innerJoin` com `esquemas` não removidos que `listarMedicamentosComEsquema` faz. As condições comuns (medicamento e esquema não removidos) viram uma função local do repositório, usada pelas duas consultas.

### 6. Agenda do dia filtra pendentes de medicamentos fora da agenda

Em `montarAgendaDoDia`, uma dose de um medicamento com `naAgenda: false` só entra se estiver resolvida. Isso inverte a parte "nenhum filtro de status extra" da decisão 3 de `fix-agenda-membership-review`: o custo é uma comparação por dose, e a regra da spec passa a ser garantida no lugar que a mostra.

### 7. `foiTomada`

Uma função local `foiTomada(dose)` em `registration.ts` substitui as duas cópias de `status === 'tomada' || status === 'tomada_com_atraso'` em `historicoDaVolta`. Se já existir um predicado equivalente no domínio, ele é reaproveitado.

## Risks / Trade-offs

- [O casamento pelo horário mais próximo pode cobrir um horário "errado" quando a grade muda muito, por exemplo 08:00 tomada e grade nova 14:00/22:00] → cobre 14:00 e só 22:00 entra. É o comportamento conservador (nunca passa do número de doses do dia), e a confirmação mostra o resultado antes de salvar.
- [Pular horários resolvidos no intervalo pode empurrar a primeira dose para muito longe se houver várias doses futuras resolvidas] → só doses de hoje em diante entram no conjunto e, na prática, são poucas; o laço termina porque o conjunto é finito.
- [Recarregar 40+ itens no foco custa mais que recarregar 20] → é o custo de manter a posição; continua proporcional ao que o usuário já viu.
- [Mudar a decisão 3 e a decisão 6 de `fix-agenda-membership-review`] → registradas aqui; aquela change não está arquivada, e só o texto da tarefa 4.1 dela é atualizado.

## Migration Plan

Sem migração de banco.
