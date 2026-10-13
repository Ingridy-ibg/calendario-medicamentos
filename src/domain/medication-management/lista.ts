/** Filtro da aba Medicamentos (agenda-membership, decisão 5). */
export type FiltroAgenda = 'todos' | 'na_agenda' | 'fora_da_agenda';

/** Página da rolagem infinita da aba Medicamentos — a consulta busca só ela (fix-agenda-membership-review). */
export const TAMANHO_PAGINA = 20;

/** O filtro como o repositório o recebe: `undefined` = todos. */
export function naAgendaDoFiltro(filtro: FiltroAgenda): boolean | undefined {
  return filtro === 'todos' ? undefined : filtro === 'na_agenda';
}

/** Quantos medicamentos o filtro mostra, a partir de `contarMedicamentos` — decide se há mais páginas. */
export function totalDoFiltro(contagem: { total: number; naAgenda: number }, filtro: FiltroAgenda): number {
  const naAgenda = naAgendaDoFiltro(filtro);
  if (naAgenda === undefined) return contagem.total;
  return naAgenda ? contagem.naAgenda : contagem.total - contagem.naAgenda;
}
