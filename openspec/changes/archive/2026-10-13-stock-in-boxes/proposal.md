## Why

O estoque é informado e exibido em unidades ("Em casa agora: 42"), mas as pessoas contam remédio em caixas — e já havia quem entendesse "Em casa agora" como número de caixas. Além disso, o alerta único "estoque baixo" (menos de uma embalagem) vale igual para tudo, quando o que importa muda conforme o tipo: num tratamento com fim, o que preocupa é não dar para terminar; no uso contínuo, é a última caixa; num "se necessário", só quando está quase no fim.

## What Changes

- **Entrada em caixas**: o formulário (cadastro e edição) pede "Caixas fechadas", "Na caixa em uso" (opcional) e "Unidades por caixa"; o app guarda o total em unidades, como hoje (cada dose continua descontando 1).
- **Exibição em caixas** em agenda, lista, detalhe, compra e confirmação do cadastro: "1 caixa · restam 12", "3 caixas · uma em uso com 12", "Acabou"; no cíclico, "cartela/cartelas".
- **Avisos por tipo de uso**:
  - **Estoque insuficiente** (alerta forte) — tratamento com duração fixa cujo estoque não basta para terminar: "faltam N para terminar". Passa a ser permanente (hoje só aparece na confirmação do cadastro).
  - **Estoque baixo** (alerta forte) — uso contínuo (diário/dias da semana/intervalo sem fim e cíclico) na última caixa (menos de uma caixa).
  - **Estoque baixo leve** — "se necessário" com menos de 5 unidades.
  - **Aviso discreto de sobra** — tratamento com duração fixa e estoque suficiente: "vão sobrar N quando o tratamento acabar", só no detalhe.
- **BREAKING (spec)**: o requisito "Alerta de recompra quando o estoque fica baixo" deixa de valer para todo medicamento e passa a valer só para uso contínuo.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `medication-stock`: entrada e exibição em caixas; alerta de recompra só para uso contínuo; estoque insuficiente para tratamentos com fim; alerta leve do "se necessário"; aviso de sobra. (A spec ainda vive na change ativa `add-medication-scheduling`.)

## Impact

- **Código**: `src/domain/medication-stock/alerta.ts` (nova classificação), `src/domain/agenda-views/agenda-diaria.ts` (alerta no item), `src/components/medicamento/formulario-medicamento.tsx` e `src/domain/medication-registration/formulario.ts` (campos em caixas), telas da lista, detalhe, compra e confirmação; textos de estoque num formatador único.
- **Sem migração**: o banco continua em unidades; estoques já cadastrados aparecem em caixas pela conta.
- **Relação com outras changes**: ajusta textos de `manage-medications` e `register-ongoing-medication` (já implementadas); deve ser arquivada depois de `add-medication-scheduling`.
