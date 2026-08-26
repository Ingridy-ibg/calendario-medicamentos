import { addDays, startOfDay } from 'date-fns';

import { estaDentroDaDuracao } from './duracao';
import { combinarDataEHorario } from './horario';
import type { DoseGerada, EsquemaDiasSemana } from './types';

/** Gera as doses de um esquema DIAS_SEMANA — só nos dias da semana configurados. */
export function gerarDosesDiasSemana(esquema: EsquemaDiasSemana, de: Date, ate: Date): DoseGerada[] {
  const doses: DoseGerada[] = [];
  const fim = startOfDay(ate);
  let dia = startOfDay(de);

  while (dia <= fim) {
    const diaDaSemana = dia.getDay();
    if (
      esquema.diasDaSemana.includes(diaDaSemana) &&
      estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, dia)
    ) {
      for (const horario of esquema.horarios) {
        doses.push({ dataHoraPrevista: combinarDataEHorario(dia, horario) });
      }
    }
    dia = addDays(dia, 1);
  }

  return doses;
}
