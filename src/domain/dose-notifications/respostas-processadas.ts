/** Quantas respostas recentes são lembradas — de sobra para as poucas doses de um dia. */
export const LIMITE_RESPOSTAS_LEMBRADAS = 50;

/**
 * Identifica uma resposta específica: a mesma notificação (identificador +
 * horário de entrega) com a mesma ação. Duas entregas da mesma dose (reenvio)
 * geram chaves diferentes.
 */
export function chaveDaResposta(identificador: string, acao: string, entregueEm: number): string {
  return `${identificador}|${acao}|${entregueEm}`;
}

/**
 * Registra uma chave na lista das últimas respostas processadas. Cobre o
 * "adiar", que deixa a dose pendente e por isso não é barrado pelo status:
 * a mesma resposta lida de novo (ex.: pela última resposta guardada pelo SO
 * ao reabrir o app) não reagenda de novo (fix-permissoes-e-respostas).
 */
export function registrarResposta(
  lembradas: readonly string[],
  chave: string,
): { jaProcessada: boolean; lembradas: string[] } {
  if (lembradas.includes(chave)) return { jaProcessada: true, lembradas: [...lembradas] };
  return { jaProcessada: false, lembradas: [...lembradas, chave].slice(-LIMITE_RESPOSTAS_LEMBRADAS) };
}

export function lerRespostasLembradas(valor: string | null): string[] {
  if (!valor) return [];
  try {
    const lista: unknown = JSON.parse(valor);
    return Array.isArray(lista) ? lista.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
