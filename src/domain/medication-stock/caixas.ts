/**
 * Estoque em caixas (stock-in-boxes): o banco guarda unidades; caixas são só
 * a forma de informar e de mostrar. Cíclicos contam em cartelas.
 */

export interface EstoqueEmCaixas {
  caixasFechadas: number;
  naCaixaEmUso: number;
  porCaixa: number;
}

/** Caixas fechadas × unidades por caixa + o que sobra na caixa em uso. */
export function paraUnidades({ caixasFechadas, naCaixaEmUso, porCaixa }: EstoqueEmCaixas): number {
  return caixasFechadas * porCaixa + naCaixaEmUso;
}

/**
 * Quantas caixas há (contando a em uso) e quantas unidades estão na caixa em
 * uso — igual a `porCaixa` quando a última está cheia. Zero unidades = zero caixas.
 */
export function paraCaixas(unidades: number, porCaixa: number): { caixas: number; emUso: number } {
  const tamanho = Math.max(1, porCaixa);
  if (unidades <= 0) return { caixas: 0, emUso: 0 };
  const caixas = Math.ceil(unidades / tamanho);
  return { caixas, emUso: unidades - (caixas - 1) * tamanho };
}

/** Para abrir a edição: 42/30 → 1 fechada + 12 em uso; 60/30 → 2 + 0. */
export function paraCamposDoFormulario(unidades: number, porCaixa: number): { caixasFechadas: number; naCaixaEmUso: number } {
  const tamanho = Math.max(1, porCaixa);
  const inteiras = Math.max(0, unidades);
  return { caixasFechadas: Math.floor(inteiras / tamanho), naCaixaEmUso: inteiras % tamanho };
}

/** "1 caixa · restam 12", "3 caixas · uma em uso com 12", "2 caixas", "Acabou" (ou cartelas no cíclico). */
export function textoEstoque(unidades: number, porCaixa: number, ciclico = false): string {
  const { caixas, emUso } = paraCaixas(unidades, porCaixa);
  if (caixas === 0) return 'Acabou';
  const nome = ciclico ? (caixas === 1 ? 'cartela' : 'cartelas') : caixas === 1 ? 'caixa' : 'caixas';
  const cheia = emUso >= Math.max(1, porCaixa);
  if (cheia) return `${caixas} ${nome}`;
  if (caixas === 1) return `1 ${nome} · ${emUso === 1 ? 'resta 1' : `restam ${emUso}`}`;
  return `${caixas} ${nome} · uma em uso com ${emUso}`;
}
