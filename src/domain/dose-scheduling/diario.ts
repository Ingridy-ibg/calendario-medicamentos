import { addDays, startOfDay } from 'date-fns';

import { estaDentroDaDuracao } from './duracao';
import { combinarDataEHorario } from './horario';
import type { DoseGerada, EsquemaDiario } from './types';

/**
 * Gera as doses de um esquema DIARIO para cada dia em [de, ate] (bordas de
 * dia, inclusive). Cada horário do dia é independente dos demais — nenhum
 * deles se desloca por causa de outro ter sido confirmado atrasado (ver
 * "Horários fixos de esquemas diário e dias da semana são independentes
 * entre si" em specs/dose-scheduling).
 */
export function gerarDosesDiario(esquema: EsquemaDiario, de: Date, ate: Date): DoseGerada[] {
  const doses: DoseGerada[] = [];
  const fim = startOfDay(ate);
  let dia = startOfDay(de);

  while (dia <= fim) {
    if (estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, dia)) {
      for (const horario of esquema.horarios) {
        doses.push({ dataHoraPrevista: combinarDataEHorario(dia, horario) });
      }
    }
    dia = addDays(dia, 1);
  }

  return doses;
}
