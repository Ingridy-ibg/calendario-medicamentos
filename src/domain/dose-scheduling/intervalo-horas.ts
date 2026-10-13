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

/**
 * Primeira dose de um esquema INTERVALO_HORAS recém-criado. Sem `ultimaDose`
 * é o momento do cadastro; com a última dose informada no cadastro em uso
 * (register-ongoing-medication) é `ultimaDose + intervalo`, ou o próprio
 * cadastro se esse horário já passou.
 */
export function gerarPrimeiraDoseIntervalo(
  esquema: EsquemaIntervaloHoras,
  opcoes: { agora?: Date; ultimaDose?: Date | null } = {},
): DoseGerada {
  const agora = opcoes.agora ?? esquema.dataInicio;
  if (!opcoes.ultimaDose) return { dataHoraPrevista: agora };
  const prevista = addHours(opcoes.ultimaDose, esquema.intervaloHoras);
  return { dataHoraPrevista: prevista > agora ? prevista : agora };
}
