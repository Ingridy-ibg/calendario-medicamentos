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

export type EstadoLimiteSeNecessario = 'abaixo' | 'atingido' | 'acima';

/**
 * Estado do limite diário de um "se necessário" (warn-as-needed-limit): fonte
 * única para a cor do contador, o aviso no cartão e a decisão de pedir
 * confirmação antes de registrar.
 */
export function estadoLimiteSeNecessario(registradasHoje: number, limiteDiario: number): EstadoLimiteSeNecessario {
  if (registradasHoje < limiteDiario) return 'abaixo';
  return registradasHoje === limiteDiario ? 'atingido' : 'acima';
}

/** Registrar agora passaria do limite: mesma regra de `avisoLimiteExcedido`. */
export function exigeConfirmacaoAoRegistrar(registradasHoje: number, limiteDiario: number): boolean {
  return estadoLimiteSeNecessario(registradasHoje, limiteDiario) !== 'abaixo';
}
