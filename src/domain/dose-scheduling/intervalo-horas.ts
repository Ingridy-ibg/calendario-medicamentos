import { addHours } from 'date-fns';

import { estaDentroDaDuracao } from './duracao';
import type { DoseGerada, EsquemaIntervaloHoras } from './types';

export interface UltimaDoseResolvidaIntervalo {
  dataHoraPrevista: Date;
  dataHoraRegistro: Date | null;
  status: 'tomada' | 'tomada_com_atraso' | 'pulada';
}

/**
 * O horário da próxima dose de INTERVALO_HORAS só é conhecido depois que a
 * dose atual é resolvida — nunca pré-calculado com antecedência (ver
 * design.md). A referência usada é:
 * - o horário REAL de confirmação, quando a dose foi tomada (adiantada ou
 *   atrasada não importa — sempre conta a partir do horário real);
 * - o horário ORIGINALMENTE PREVISTO, quando a dose foi pulada — pular não
 *   reinicia a grade a partir do momento em que "não tomar" foi tocado (ver
 *   "Pular uma dose preserva a grade original" em specs/dose-scheduling).
 *
 * Retorna `null` quando a duração fixa do esquema já terminou.
 */
export function gerarProximaDoseIntervalo(
  esquema: EsquemaIntervaloHoras,
  ultimaDoseResolvida: UltimaDoseResolvidaIntervalo,
): DoseGerada | null {
  const referencia =
    ultimaDoseResolvida.status === 'pulada'
      ? ultimaDoseResolvida.dataHoraPrevista
      : (ultimaDoseResolvida.dataHoraRegistro ?? ultimaDoseResolvida.dataHoraPrevista);

  const dataHoraPrevista = addHours(referencia, esquema.intervaloHoras);

  if (!estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, dataHoraPrevista)) {
    return null;
  }

  return { dataHoraPrevista };
}

/** Primeira dose de um esquema INTERVALO_HORAS recém-criado: âncora é o próprio início de vigência. */
export function gerarPrimeiraDoseIntervalo(esquema: EsquemaIntervaloHoras): DoseGerada {
  return { dataHoraPrevista: esquema.dataInicio };
}
