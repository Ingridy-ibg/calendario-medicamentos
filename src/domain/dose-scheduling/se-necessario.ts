import type { EsquemaSeNecessario } from './types';

export interface AvisoRegistroSeNecessario {
  avisoLimiteExcedido: boolean;
}

/**
 * Nenhuma dose é pré-gerada para SE_NECESSARIO (por isso não há um
 * `gerarDoses` para este tipo) — o registro compara o total de doses já
 * registradas hoje contra o limite diário e apenas AVISA ao ultrapassar,
 * sem bloquear o registro.
 */
export function registrarDoseSeNecessario(
  esquema: EsquemaSeNecessario,
  dosesJaRegistradasHoje: number,
): AvisoRegistroSeNecessario {
  return { avisoLimiteExcedido: dosesJaRegistradasHoje >= esquema.limiteDiario };
}
