import { addWeeks } from 'date-fns';

import { type NovaDose, substituirDosesFuturas } from '@/db/repositories/doses';
import type { AppDb } from '@/db/repositories/types';

import { gerarDosesCiclico } from './ciclico';
import { gerarDosesDiario } from './diario';
import { gerarDosesDiasSemana } from './dias-semana';
import type { DoseGerada, Esquema } from './types';

export const SEMANAS_JANELA_MINIMA = 2;
export const SEMANAS_JANELA_MAXIMA = 4;

/**
 * INTERVALO_HORAS e SE_NECESSARIO não têm grade pré-calculável (ver
 * design.md e specs/dose-scheduling) — não fazem parte da janela rolante.
 */
function gerarDosesParaJanela(esquema: Esquema, de: Date, ate: Date): DoseGerada[] | null {
  switch (esquema.tipo) {
    case 'DIARIO':
      return gerarDosesDiario(esquema, de, ate);
    case 'DIAS_SEMANA':
      return gerarDosesDiasSemana(esquema, de, ate);
    case 'CICLICO':
      return gerarDosesCiclico(esquema, de, ate);
    case 'INTERVALO_HORAS':
    case 'SE_NECESSARIO':
      return null;
  }
}

/**
 * Materializa no banco as doses futuras de um esquema dentro da janela
 * rolante [hoje, hoje + semanas]. Usa `substituirDosesFuturas`, que nunca
 * apaga uma dose já resolvida (ver regra 2.5) — por isso é seguro chamar
 * tanto na criação do esquema quanto após editá-lo.
 */
export function materializarJanela(
  db: AppDb,
  esquema: Esquema,
  hoje: Date,
  semanas: number = SEMANAS_JANELA_MAXIMA,
) {
  const dosesGeradas = gerarDosesParaJanela(esquema, hoje, addWeeks(hoje, semanas));
  if (dosesGeradas === null) {
    return [];
  }

  return substituirDosesFuturas(
    db,
    esquema.id,
    dosesGeradas.map(
      (dose): NovaDose => ({
        esquemaId: esquema.id,
        dataHoraPrevista: dose.dataHoraPrevista,
        numeroNoCiclo: dose.numeroNoCiclo ?? null,
      }),
    ),
  );
}
