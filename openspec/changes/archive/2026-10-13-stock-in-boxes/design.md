## Context

- O banco guarda `medicamentos.quantidadeEmEstoque` (unidades) e `quantidadePorEmbalagem`; `decrementarEstoque`/`reporEstoque` operam em unidades.
- `temAlertaDeRecompra(estoque, porEmbalagem)` (`src/domain/medication-stock/alerta.ts`) é a única regra de alerta, usada em `montarAgendaDoDia` (3 tipos de item), na aba Medicamentos e no detalhe.
- "Estoque insuficiente" já é calculado na prévia do cadastro (`montarPreviaCadastro`), a partir das doses futuras do tratamento; "dura até" vem de `preverFimDoEstoque` (`medication-management/gestao.ts`).
- Os campos do formulário são `quantidadeEmEstoque`/`quantidadePorEmbalagem` em `ValoresFormulario` (`medication-registration/formulario.ts`).

## Goals / Non-Goals

**Goals:** entrada e exibição em caixas sem mudar o modelo em unidades; um único ponto que classifica o estado do estoque por tipo de uso; um único formatador de texto de estoque.

**Non-Goals:** guardar caixas no banco ou rastrear caixas individuais; mudar o desconto por dose; alerta por notificação.

## Decisions

### 1. Unidades no banco, caixas na borda
Conversões puras em `medication-stock/caixas.ts`:
- `paraUnidades({ caixasFechadas, naCaixaEmUso, porCaixa }) = caixasFechadas × porCaixa + naCaixaEmUso`;
- `paraCaixas(unidades, porCaixa) → { caixas, emUso }`: `caixas = ceil(unidades / porCaixa)`, `emUso = unidades − (caixas − 1) × porCaixa` (igual a `porCaixa` quando a última está cheia);
- `textoEstoque(unidades, porCaixa, ciclico) → string` com as frases da spec ("1 caixa · restam 12", "3 caixas · uma em uso com 12", "2 caixas", "Acabou"; "cartela" no cíclico).
Para o formulário de edição: `caixasFechadas = floor(unidades / porCaixa)`, `naCaixaEmUso = unidades mod porCaixa` — 42/30 abre como 1 + 12, 60/30 como 2 + 0.

*Alternativa:* guardar caixas no banco. Descartada: o desconto por dose e toda a lógica de previsão já trabalham em unidades; caixa é só apresentação.

### 2. `ValoresFormulario` em caixas
`quantidadeEmEstoque: string` é substituído por `caixasFechadas: string` e `naCaixaEmUso: string`; `quantidadePorEmbalagem` mantém o nome no banco e vira "Unidades por caixa" na tela. `paraDadosFormulario` calcula as unidades; a validação de `naCaixaEmUso < porCaixa` entra em `validarCamposComuns` via um campo opcional de origem (`emCaixas`) para o erro cair no campo certo (`naCaixaEmUso`). No cadastro em uso, a regra existente vale igual: o informado já é o que está em casa agora.

### 3. Classificação única: `classificarEstoque`
Em `medication-stock/alerta.ts`, substituindo `temAlertaDeRecompra`:

```ts
type AlertaEstoque =
  | { tipo: 'insuficiente'; faltam: number }   // forte — duração fixa sem estoque para terminar
  | { tipo: 'baixo' }                          // forte — uso contínuo na última caixa
  | { tipo: 'baixo_leve' }                     // leve — "se necessário" com < 5
  | { tipo: 'sobra'; sobram: number }          // discreto — duração fixa com sobra (só no detalhe)
  | null;
classificarEstoque(esquema: Esquema, unidades, porCaixa, dosesRestantes: number | null)
```

`dosesRestantes` (doses do tratamento ainda não resolvidas, de agora ao fim) vem de uma função de domínio `contarDosesRestantesDoTratamento(db|geradores, esquema, agora)` que reaproveita a mesma geração da prévia (`dosesDaGrade`/série do intervalo) — extraída de `previa.ts` para ser compartilhada, sem duplicar a conta. Uso contínuo = `duracaoDias === null` para diário/dias da semana/intervalo, e todo cíclico.

`ItemAgenda*.alertaEstoque: boolean` vira `alertaEstoque: AlertaEstoque` (a agenda e a lista mostram `insuficiente`, `baixo` e `baixo_leve`; `sobra` só no detalhe).

### 4. Apresentação dos alertas
- Forte (`insuficiente`, `baixo`): selo atual (`statusPerdida` sobre `statusPerdidaSoft`), com o texto "Estoque insuficiente · faltam N" ou "Estoque baixo".
- Leve (`baixo_leve`): selo neutro (`textSecondary` sobre `surfaceMuted`) "Estoque baixo".
- Sobra: linha `caption` no cartão de estoque do detalhe.

## Risks / Trade-offs

- [Estoques já cadastrados como "unidades" por quem entendia "caixas"] → após a mudança, o texto em caixas deixa o erro visível ("1 caixa · restam 2" para quem digitou 2 achando que eram caixas); a pessoa corrige pela edição. Não há como distinguir automaticamente.
- [Custo de calcular doses restantes em cada item da agenda] → só para itens com duração fixa, e a geração é limitada ao fim do tratamento; a agenda já recalcula no foco.
- [MODIFIED depende da spec base] → arquivar `add-medication-scheduling` antes desta change.

## Migration Plan

Sem migração de dados. Rollback: reverter os commits.
