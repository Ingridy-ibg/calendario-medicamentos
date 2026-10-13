## Context

Ver proposal.md (Why). Pontos do código atual que determinam a abordagem:
- `renovarJanela` gera doses só de `max(última prevista + 1 dia, hoje)` em diante, e `gerarDoseDeInicioDeCartela` descarta um início antes de `de`. Por isso um início previsto no passado nunca vira dose.
- `rematerializarJanelaAposEdicao` usa `substituirDosesAPartirDe(corte = agora)`. Ela preserva as pendentes de horário anterior ao corte (inclusive a dose de início) e insere as novas depois do corte, o que pode deixar duas doses de início.
- `cadastrarMedicamento(..., { naAgenda: false })` descarta `emUso`, mas ainda grava `previa.plano`, que traz `dataInicioCiclo` ou `inicioCartelaPrevisto` do cíclico.
- A agenda (`(tabs)/index.tsx`) só recarrega no foco. Nada a redesenha com o tempo.
- `definirInicioDosCiclicosSemData` é chamada dentro de `renovarJanelasAtivas`, que roda na abertura, na volta ao primeiro plano e na tarefa periódica.

## Goals / Non-Goals

**Goals:**
- Uma regra única, pura e testável para "falta a dose de início deste cíclico?", usada pela renovação e pela edição.
- Nenhuma mudança no que `inicio-de-cartela` especificou para a confirmação atrasada e para a projeção de cartela atrasada.

**Non-Goals:**
- Mudar a migração Drizzle 0005. A correção única continua em código, só que roda uma vez.
- Corrigir o alarme em tela cheia no Android 14 (trata-se à parte).

## Decisions

### 1. `doseDeInicioFaltante(esquema, doses, agora)` em `ciclico.ts`

Função pura que devolve a `DoseGerada` de início de cartela quando todas estas condições valem:
- o esquema está aguardando nova cartela;
- `inicioPrevistoDaCartela` não é nulo e o dia dele já chegou (`<= agora`, pelo dia);
- não existe nenhuma dose do esquema com `numeroNoCiclo = 1` no mesmo dia, em qualquer status.

Senão, devolve `null`.

`renovarJanela` a chama antes do retorno antecipado e insere a dose. Assim um início que caiu antes da janela, seja de um ciclo legado ou do app fechado por semanas, ganha a dose no dia e horário previstos. O reconciliador a agenda como qualquer especial: o horário já passou, então o alarme toca na hora.

*Alternativa:* mover o início para hoje, como na correção dos cíclicos sem data. Foi descartada porque contradiz o cenário "Cartela atrasada" de `inicio-de-cartela`, que mantém o atraso visível desde o dia previsto.

### 2. Edição substitui a dose de início pendente

`rematerializarJanelaAposEdicao`, para um cíclico, executa estes passos:
1. apaga as doses não resolvidas do esquema que são início de cartela pendente (`ehInicioDeCartelaPendente` com o esquema já editado), por meio de uma função nova do repositório;
2. segue o fluxo atual, que insere o início se ele cair depois do corte;
3. chama `doseDeInicioFaltante` para o início que ficou antes do corte (hoje mais cedo ou dias atrás).

O resultado é sempre uma única dose de início pendente.

*Trade-off:* a dose recriada zera `notificacoesSemResposta`. Para especial isso só reinicia a contagem do reenvio, que é indefinido, e nunca leva à perda da dose.

### 3. "Só cadastrar" zera o plano do ciclo

- Em `cadastrarMedicamento`, com `naAgenda: false`, os dados passam sem `emUso` e sem `inicioCartela`, e o esquema é gravado com `dataInicioCiclo` e `inicioCartelaPrevisto` nulos.
- `confirmar.tsx` também envia os dados sem `inicioCartela` no caminho "Só cadastrar", para a prévia recalculada não pedir a escolha.
- Na volta à agenda, o início é definido como num cadastro novo, o que já acontece hoje.

### 4. Marca do dia de hoje

`marcadorDoDia` passa a tratar um item de histórico com `inicioDeCartela` e status pendente ou aguardando, não atrasado, como a marca `anel`. A checagem fica depois de perdida, atrasada e resolvidas, e antes do contorno de "previsto".

### 5. Atraso na exibição

- `inicioAtrasado(inicioPrevisto, agora)` usa `estaAtrasada` (classificacao.ts) com uma dose virtual pendente.
- `textoInicioPrevisto` e o destaque visual passam a calcular com o `agora` da renderização.
- A agenda ganha um relógio de 1 minuto (estado `agora` atualizado por `setInterval` enquanto a tela está focada) para redesenhar o texto e o destaque.
- O campo `atrasada` do item continua existindo, calculado pela mesma função.

### 6. Texto da dose em um lugar

- `ContextoDose` passa a incluir a `dose`, porque `buscarContextoDaDose` já a lê.
- Uma função `textosDoContexto(contexto)` monta a entrada de `textosDaDose`, inclusive o `inicioDeCartela`.
- Os dois agendadores usam essa função e deixam de chamar `buscarDosePorId` à parte.

### 7. Correção única com marca no kv-store

`definirInicioDosCiclicosSemData` sai de `renovarJanelasAtivas`. Uma função `aplicarCorrecoesUnicas(db)` em `src/lib` a executa se a chave `correcao.inicioCartelaSemData` não estiver gravada e então grava a chave. Ela é chamada no layout raiz e na tarefa periódica, antes da renovação.

### 8. Remover a notificação exibida ao cancelar, nunca ao agendar

- `agendadorNotificacoes.cancelar(id)` passa a chamar também `dismissNotificationAsync(id)`. O identificador da notificação exibida é o mesmo do agendamento (`dose:<id>`). Isso cobre a resposta "Tomei agora" ou "Não tomar" (`processarResposta` → `cancelarAlvo`) e a dose resolvida no app (o reconciliador cancela o alvo que deixou de ser desejado).
- No "Adiar", `processarResposta` remove a notificação exibida antes de reagendar.
- O reconciliador também remove, entre as notificações exibidas (`getPresentedNotificationsAsync`), as de dose já resolvida ou removida. Isso é preciso porque, depois de entregue, uma notificação só continua na lista de agendadas se o próximo reenvio já tiver sido agendado. Na 4ª notificação de uma comum não há próximo reenvio, e sem esse passo a dose resolvida no app deixaria a notificação na bandeja. Uma dose ainda aberta nunca tem a notificação removida.
- `agendar` não remove nada: o reconciliador reagenda todo alvo desejado a cada rodada, e remover ali apagaria a notificação de uma dose ainda pendente só por abrir o app.

*Alternativa considerada:* trocar a notificação por um "Dose registrada" que some sozinho. Foi descartada porque, no Android, a notificação sumir depois da ação já é o retorno esperado, e o `expo-notifications` não oferece expiração automática.

## Risks / Trade-offs

- **[Risco] Alarme de início tocando logo após a atualização para um ciclo que terminou há meses.** → É o comportamento especificado para cartela atrasada: o usuário confirma pela agenda ou pelo alarme e o ciclo recomeça. Fica registrado nas notas do APK.
- **[Risco] A marca da correção única ser gravada sem que a correção rode, se o app fechar entre as duas coisas.** → A marca é gravada depois da correção, e a correção é idempotente.
