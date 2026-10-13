/** Filtro da aba Medicamentos (agenda-membership, decisão 5). */
export type FiltroAgenda = 'todos' | 'na_agenda' | 'fora_da_agenda';

export const TAMANHO_PAGINA = 20;

/**
 * Aplica o filtro e devolve as páginas de 1 até `pagina` (rolagem infinita:
 * cada página nova soma mais `tamanho` itens), com `temMais` para pedir a próxima.
 */
export function filtrarEPaginar<T extends { naAgenda: boolean }>(
  lista: T[],
  filtro: FiltroAgenda,
  pagina: number,
  tamanho = TAMANHO_PAGINA,
): { itens: T[]; temMais: boolean } {
  const filtrada = filtro === 'todos' ? lista : lista.filter((item) => item.naAgenda === (filtro === 'na_agenda'));
  const itens = filtrada.slice(0, Math.max(1, pagina) * tamanho);
  return { itens, temMais: itens.length < filtrada.length };
}
