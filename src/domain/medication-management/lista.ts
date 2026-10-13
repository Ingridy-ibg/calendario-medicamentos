/** Filtro da aba Medicamentos (agenda-membership, decisão 5). */
export type FiltroAgenda = 'todos' | 'na_agenda' | 'fora_da_agenda';

/** Página da rolagem infinita da aba Medicamentos — a consulta busca só ela (fix-agenda-membership-review). */
export const TAMANHO_PAGINA = 20;

/** O filtro como o repositório o recebe: `undefined` = todos. */
export function naAgendaDoFiltro(filtro: FiltroAgenda): boolean | undefined {
  return filtro === 'todos' ? undefined : filtro === 'na_agenda';
}
