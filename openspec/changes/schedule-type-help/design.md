## Context

- Referência visual: artboards "Novo medicamento" e "Info — tipos de esquema" do canvas.
- O formulário é o componente compartilhado `FormularioMedicamento` (cadastro e edição); o tipo selecionado está no estado `tipo`.
- Componentes disponíveis: `Tocavel`, `Icone` (`info`, `voltar`, `avancar`, `check`), `Cartao`, tokens de cor de `useTheme()`. O teste de varredura proíbe `style` em forma de função em `Pressable`.

## Goals / Non-Goals

**Goals:** explicação acessível sem sair do formulário; conteúdo num único lugar, fácil de revisar; o modal não altera nada do formulário.

**Non-Goals:** gesto de deslizar entre os tipos (setas e bolinhas bastam; pode vir depois); explicação dentro de cada chip; tutorial na primeira abertura.

## Decisions

### 1. Conteúdo em constantes
`src/constants/tipos-esquema.ts` exporta, por `TipoEsquema`, `{ titulo, descricao, exemplo, pontos: string[] }`, com os textos do artboard. A ordem segue `TIPOS_ESQUEMA`. Um teste garante que todo `TipoEsquema` tem conteúdo e que a ordem bate com os chips do formulário.

### 2. Modal nativo com fundo tocável
`AjudaTiposEsquema({ visivel, tipoInicial, aoFechar })` usa o `Modal` do React Native (`transparent`, `animationType="fade"`, `onRequestClose={aoFechar}` para o voltar do Android). O fundo escurecido é um `Tocavel` de tela inteira com `accessibilityLabel="Fechar explicação"` que chama `aoFechar`; o cartão fica por cima, fora do fundo, para que toques dentro dele não fechem o modal.

*Alternativa:* uma rota com `presentation: 'transparentModal'`. Descartada: o modal não tem estado próprio a preservar e não precisa de URL.

### 3. Carrossel por índice
Estado local `indice`, iniciado em `TIPOS_ESQUEMA.indexOf(tipoInicial)` a cada abertura. Setas `Tocavel` de 44×44 desativadas nas pontas (`accessibilityState.disabled`); bolinhas `Tocavel` de 44 de altura com o ponto visual de 10 px (22 px de largura quando ativa), `accessibilityRole="tab"` e `accessibilityState.selected`. O título do tipo fica num container com `accessibilityLiveRegion="polite"` para o leitor de tela anunciar a troca.

### 4. Ilustrações simples em `View`s
Cada tipo tem uma ilustração feita com `View`s (como no artboard: semana com doses, linha do tempo do intervalo, dias da semana destacados, barra 21/7, quadradinhos do "se necessário"), escondida do leitor de tela (`importantForAccessibility="no-hide-descendants"`) — o exemplo em texto já descreve.

## Risks / Trade-offs

- [Textos divergirem das regras se elas mudarem] → o conteúdo está num único arquivo com teste; changes futuras que mudem regras de um tipo devem revisá-lo. O texto do "se necessário" já supõe a confirmação de limite da change `warn-as-needed-limit`; se esta for implementada antes, ajustar a frase para não prometer a confirmação.
