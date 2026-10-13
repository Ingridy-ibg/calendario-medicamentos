## Context

Ver proposal.md (Why). O NativeWind está configurado com `jsxImportSource: 'nativewind'` (`babel.config.js`), então o `jsx` de todo arquivo passa por `wrapJSX`, que troca `Pressable` pela versão com `cssInterop(Pressable, { className: "style" })`. Nessa versão, `props.style` é coletado por `collectInlineRules`, que só sabe lidar com objetos e arrays; uma função é empurrada como "estilo" e o resultado final não contém as propriedades que ela devolveria.

## Goals / Non-Goals

**Goals:** todos os elementos tocáveis voltam a ter fundo, borda, raio, tamanho mínimo e feedback de toque; impedir que o padrão volte.

**Non-Goals:** remover o NativeWind ou migrar as telas para `className`; mudar o visual definido no canvas.

## Decisions

### 1. Componente `Tocavel` com estado de toque próprio
`src/components/ui/tocavel.tsx`: envolve `Pressable`, guarda `pressionado` em `useState` via `onPressIn`/`onPressOut` (repassando os handlers recebidos) e aplica `style` como **objeto/array**, com `opacity` 0.8 enquanto pressionado (ou um estilo `estiloPressionado` opcional). Todos os pontos afetados passam a usá-lo; `Botao` e `Chip` o usam por dentro.

*Alternativa 1:* passar `cssInterop={false}` em cada `Pressable` (suportado por `wrapJSX`). Descartada: depende de um detalhe interno da biblioteca, sem tipos, e é fácil esquecer.
*Alternativa 2:* `TouchableOpacity`. Descartada: tem o mesmo wrapper de interop e o projeto já padronizou `Pressable`.

### 2. Teste de varredura contra regressão
Teste Vitest que lê os arquivos `.tsx` de `src/` e falha se encontrar `style={({` em algum `Pressable` (expressão regular simples), com a mensagem apontando para `Tocavel`. É barato e roda junto com o resto da suíte.

## Risks / Trade-offs

- [Hipótese da causa não confirmada visualmente nesta máquina (sem emulador; a web não abre o banco)] → a primeira tarefa confirma no aparelho, antes de qualquer mudança, que um `Pressable` com `style` em objeto mostra o fundo e com função não mostra; se a causa for outra, pausar e revisar esta change.
- [`onPressIn`/`onPressOut` recebidos por props sobrescreverem os do `Tocavel`] → o componente chama os handlers recebidos dentro dos seus.

## Migration Plan

Sem migração. Rollback: reverter os commits.
