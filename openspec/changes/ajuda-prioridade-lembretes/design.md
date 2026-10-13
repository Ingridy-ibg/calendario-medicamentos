## Context

O modal de tipos de esquema (`src/components/medicamento/ajuda-tipos-esquema.tsx`, cerca de 270 linhas) mistura duas coisas:
- a estrutura de um modal paginado: overlay que fecha ao toque, cartão, cabeçalho "Tipos de esquema · X de N", setas, bolinhas e voltar do Android;
- o conteúdo específico dos tipos: texto vindo de `CONTEUDO_TIPOS_ESQUEMA` e um desenho por tipo.

O conteúdo fica em `src/constants/tipos-esquema.ts`, com um teste que garante que nenhum item está vazio e que a ordem segue `TIPOS_ESQUEMA`. No formulário, o botão "i" fica no `acao` de `SecaoFormulario`. A criticidade efetiva já existe (`criticidadeEfetiva`).

## Goals / Non-Goals

**Goals:**
- O mesmo visual e comportamento do modal de tipos, sem copiar e colar a estrutura.
- Conteúdo testado como dado, no mesmo padrão de `tipos-esquema.ts`.

**Non-Goals:**
- Mudar o texto, a ordem ou o comportamento do modal de tipos de esquema.
- Permitir escolher a prioridade de dentro do modal: ele só explica.

## Decisions

### 1. Extrair `ModalAjudaPaginada`

O componente novo é genérico e recebe:
- `visivel`, `aoFechar`;
- `rotuloSecao` (ex.: "Tipos de esquema", "Prioridade dos lembretes");
- `itens: { chave, conteudo: { titulo, descricao, exemplo, pontos } }[]`;
- `chaveInicial`;
- `renderIlustracao(chave)`.

`AjudaTiposEsquema` passa a ser um invólucro fino sobre ele. O novo `AjudaPrioridades` também.

*Alternativa considerada:* duplicar `ajuda-tipos-esquema.tsx`. Foi descartada porque são cerca de 200 linhas de estrutura idêntica que tenderiam a divergir em ajustes de acessibilidade e tema.

### 2. Conteúdo em `src/constants/prioridades.ts`

O conteúdo é `CONTEUDO_PRIORIDADES: Record<Criticidade, ConteudoTipoEsquema>` (reaproveitando a interface, renomeada para `ConteudoAjuda` e movida para um lugar comum). Os textos seguem a spec da change.

Comum:
- descrição: "Uma notificação que vibra, com três respostas.";
- exemplo: "Vitamina D às 14:00".

Especial:
- descrição: "Um alarme em tela cheia, com som, até você confirmar.";
- exemplo: "Anticoncepcional às 08:00".

O teste espelha o de `tipos-esquema.test.ts`: as chaves na ordem de `CRITICIDADES` e nenhum campo vazio.

### 3. Ilustração de cada prioridade com `View`s

Segue o padrão das ilustrações dos tipos, para não depender de imagens:
- **Comum**: uma miniatura de notificação (barra com título e três "botões" pequenos);
- **Especial**: uma miniatura da tela de alarme no tema "Noite", com hora, nome e botão.

Cores vêm do tema; a do alarme vem da paleta "Noite" introduzida por `alarme-tela-cheia`.

### 4. Abre na criticidade efetiva

`chaveInicial = criticidadeEfetiva({ tipo, criticidade })`, igual ao que o formulário já mostra selecionado. O modal é reiniciado a cada abertura, como o de tipos.

## Risks / Trade-offs

- **[Risco] Refatorar o modal de tipos quebrar algum detalhe dele.** → Mitigação: a tarefa de refatoração termina com o checklist dos cenários da spec "Explicação dos tipos de esquema no formulário" verificados no app.
- **[Risco] O texto do Especial ficar desatualizado se esta change for implementada antes de `alarme-tela-cheia`.** → Mitigação: a dependência está registrada na proposal e na primeira tarefa. Se a ordem mudar, ajustar o texto.
