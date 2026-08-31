/**
 * Alerta de recompra (specs/medication-stock): ativo quando o estoque cai
 * abaixo de uma embalagem completa. Deliberadamente não persistido — é
 * sempre recalculado a partir de `quantidadeEmEstoque`/`quantidadePorEmbalagem`,
 * então "ativar" e "remover" a sinalização são só consequência automática de
 * o estoque mudar, nunca uma transição separada para manter sincronizada.
 */
export function temAlertaDeRecompra(quantidadeEmEstoque: number, quantidadePorEmbalagem: number): boolean {
  return quantidadeEmEstoque < quantidadePorEmbalagem;
}
