import { differenceInCalendarDays } from 'date-fns';

/**
 * `duracaoDias` conta a partir de `dataInicio` (dia 1 = a própria `dataInicio`).
 * `null` significa uso contínuo, sem data de término — o esquema nunca para
 * de agendar (ver "Esquemas contínuos nunca param de agendar" em
 * specs/dose-scheduling).
 */
export function estaDentroDaDuracao(dataInicio: Date, duracaoDias: number | null, dia: Date): boolean {
  if (duracaoDias === null) {
    return true;
  }
  const diasDecorridos = differenceInCalendarDays(dia, dataInicio);
  return diasDecorridos >= 0 && diasDecorridos < duracaoDias;
}
