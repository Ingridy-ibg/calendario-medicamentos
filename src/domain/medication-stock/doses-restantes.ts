import { addHours, addWeeks, startOfDay } from 'date-fns';

import { gerarDosesCiclico } from '@/domain/dose-scheduling/ciclico';
import { gerarDosesDiario } from '@/domain/dose-scheduling/diario';
import { gerarDosesDiasSemana } from '@/domain/dose-scheduling/dias-semana';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import type { Esquema } from '@/domain/dose-scheduling/types';

/** Doses de grade (diário, dias da semana, cíclico) num intervalo, já em ordem. */
export function dosesDaGrade(esquema: Esquema, de: Date, ate: Date): Date[] {
  switch (esquema.tipo) {
    case 'DIARIO':
      return gerarDosesDiario(esquema, de, ate).map((d) => d.dataHoraPrevista);
    case 'DIAS_SEMANA':
      return gerarDosesDiasSemana(esquema, de, ate).map((d) => d.dataHoraPrevista);
    case 'CICLICO':
      return gerarDosesCiclico(esquema, de, ate).map((d) => d.dataHoraPrevista);
    default:
      return [];
  }
}

function serieIntervalo(esquema: Esquema, primeira: Date | null, limite: Date): Date[] {
  if (esquema.tipo !== 'INTERVALO_HORAS' || !primeira) return [];
  if (esquema.duracaoDias === null) return [primeira];
  const serie: Date[] = [];
  for (let dose = primeira; dose <= limite && estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, dose); dose = addHours(dose, esquema.intervaloHoras)) {
    serie.push(dose);
  }
  return serie;
}

/**
 * Doses previstas depois de `agora` (horizonte de 2 anos, só para contar o
 * tratamento). Intervalo em horas: a série é estimada a partir de
 * `primeiraDoseIntervalo` (cada dose real depende da anterior) e, no uso
 * contínuo, fica só a primeira.
 */
export function dosesFuturas(esquema: Esquema, agora: Date, primeiraDoseIntervalo: Date | null): Date[] {
  const limite = addWeeks(agora, 104);
  return esquema.tipo === 'INTERVALO_HORAS'
    ? serieIntervalo(esquema, primeiraDoseIntervalo, limite)
    : dosesDaGrade(esquema, startOfDay(agora), limite).filter((dose) => dose > agora);
}

/** Tratamento com duração fixa: diário, dias da semana ou intervalo com `duracaoDias`. */
export function temDuracaoFixa(esquema: Esquema): boolean {
  return 'duracaoDias' in esquema && esquema.duracaoDias !== null;
}

/**
 * Doses do tratamento ainda por vir, de `agora` ao fim (stock-in-boxes,
 * decisão 3). `null` quando não há fim (uso contínuo, cíclico, "se necessário").
 */
export function contarDosesRestantesDoTratamento(esquema: Esquema, agora: Date, primeiraDoseIntervalo: Date | null): number | null {
  if (!temDuracaoFixa(esquema)) return null;
  const primeira = esquema.tipo === 'INTERVALO_HORAS' ? (primeiraDoseIntervalo ?? addHours(agora, esquema.intervaloHoras)) : null;
  return dosesFuturas(esquema, agora, primeira).length;
}
