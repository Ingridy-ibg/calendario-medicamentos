import type { Esquema } from '@/domain/dose-scheduling/types';

import { temDuracaoFixa } from './doses-restantes';

/** Abaixo disso, um "se necessário" recebe o alerta leve. */
export const LIMITE_ALERTA_LEVE_SE_NECESSARIO = 5;

export type AlertaEstoque =
  /** Forte — duração fixa sem estoque para terminar. */
  | { tipo: 'insuficiente'; faltam: number }
  /** Forte — uso contínuo na última caixa (alerta de recompra). */
  | { tipo: 'baixo' }
  /** Leve — "se necessário" quase no fim. */
  | { tipo: 'baixo_leve' }
  /** Discreto — duração fixa com sobra; só no detalhe. */
  | { tipo: 'sobra'; sobram: number }
  | null;

/**
 * Estado do estoque por tipo de uso (specs/medication-stock, stock-in-boxes
 * decisão 3). Deliberadamente não persistido — é sempre recalculado a partir
 * do estoque e das doses restantes, então "ativar" e "remover" um alerta são
 * só consequência de o estoque mudar.
 *
 * `dosesRestantes`: doses do tratamento ainda não resolvidas, de agora ao fim
 * (ver `contarDosesRestantesDoTratamento`); ignorado sem duração fixa.
 */
export function classificarEstoque(esquema: Esquema, unidades: number, porCaixa: number, dosesRestantes: number | null): AlertaEstoque {
  if (esquema.tipo === 'SE_NECESSARIO') {
    return unidades < LIMITE_ALERTA_LEVE_SE_NECESSARIO ? { tipo: 'baixo_leve' } : null;
  }
  if (temDuracaoFixa(esquema)) {
    const restantes = dosesRestantes ?? 0;
    if (unidades < restantes) return { tipo: 'insuficiente', faltam: restantes - unidades };
    return restantes > 0 && unidades > restantes ? { tipo: 'sobra', sobram: unidades - restantes } : null;
  }
  return unidades < porCaixa ? { tipo: 'baixo' } : null;
}

/** Alertas que aparecem na agenda e na lista (a sobra fica só no detalhe). */
export function alertaVisivelNaLista(alerta: AlertaEstoque): AlertaEstoque {
  return alerta?.tipo === 'sobra' ? null : alerta;
}

/** Texto do alerta: "Estoque insuficiente · faltam 3 para terminar", "Estoque baixo", "Vão sobrar 6 quando o tratamento acabar". */
export function textoAlertaEstoque(alerta: NonNullable<AlertaEstoque>): string {
  switch (alerta.tipo) {
    case 'insuficiente':
      return `Estoque insuficiente · ${alerta.faltam === 1 ? 'falta 1' : `faltam ${alerta.faltam}`} para terminar`;
    case 'baixo':
    case 'baixo_leve':
      return 'Estoque baixo';
    case 'sobra':
      return `${alerta.sobram === 1 ? 'Vai sobrar 1' : `Vão sobrar ${alerta.sobram}`} quando o tratamento acabar`;
  }
}

/** Forte = cor de erro; leve = selo neutro (`baixo_leve`). */
export function alertaForte(alerta: AlertaEstoque): boolean {
  return alerta?.tipo === 'insuficiente' || alerta?.tipo === 'baixo';
}
