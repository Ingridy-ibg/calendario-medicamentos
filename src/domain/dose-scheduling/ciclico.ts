import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';

import { combinarDataEHorario } from './horario';
import type { DoseGerada, EsquemaCiclico } from './types';

export type StatusDoDiaCiclico =
  | { fase: 'em_espera' }
  | { fase: 'ativo'; diaDoCiclo: number; totalDiasAtivos: number }
  | { fase: 'pausa' };

/**
 * Aritmética modular pura sobre `dataInicioCiclo`. Importante: `dataInicioCiclo`
 * cobre exatamente UM ciclo (diasAtivos + diasPausa) — a janela NÃO reinicia
 * automaticamente por cálculo de calendário quando a pausa termina. Um novo
 * ciclo só existe quando `confirmarPrimeiraDoseCiclo` é chamada (ver
 * "Um novo ciclo só começa quando a primeira dose da nova cartela é
 * confirmada" em specs/dose-scheduling) — até lá, o esquema permanece
 * 'em_espera'.
 */
export function calcularStatusDoDia(esquema: EsquemaCiclico, dia: Date): StatusDoDiaCiclico {
  if (esquema.dataInicioCiclo === null) {
    return { fase: 'em_espera' };
  }

  const diasDesdeInicio = differenceInCalendarDays(startOfDay(dia), startOfDay(esquema.dataInicioCiclo));

  if (diasDesdeInicio < 0) {
    return { fase: 'em_espera' };
  }
  if (diasDesdeInicio < esquema.diasAtivos) {
    return { fase: 'ativo', diaDoCiclo: diasDesdeInicio + 1, totalDiasAtivos: esquema.diasAtivos };
  }
  if (diasDesdeInicio < esquema.diasAtivos + esquema.diasPausa) {
    return { fase: 'pausa' };
  }
  return { fase: 'em_espera' };
}

/**
 * Define o horário de confirmação como o dia 1 de um novo ciclo. Cabe ao
 * chamador decidir QUANDO isso deve acontecer (tipicamente quando o esquema
 * está 'em_espera' e o usuário confirma a primeira dose da nova cartela).
 */
export function confirmarPrimeiraDoseCiclo(esquema: EsquemaCiclico, horarioConfirmacao: Date): EsquemaCiclico {
  return { ...esquema, dataInicioCiclo: horarioConfirmacao };
}

/**
 * Gera as doses de um esquema CICLICO para cada dia ativo em [de, ate] —
 * dias de pausa e "em espera" não têm dose para confirmar.
 */
export function gerarDosesCiclico(esquema: EsquemaCiclico, de: Date, ate: Date): DoseGerada[] {
  if (esquema.dataInicioCiclo === null) {
    return [];
  }

  const doses: DoseGerada[] = [];
  const fim = startOfDay(ate);
  const [horario] = esquema.horarios;
  let dia = startOfDay(de);

  while (dia <= fim) {
    const status = calcularStatusDoDia(esquema, dia);
    if (status.fase === 'ativo') {
      doses.push({
        dataHoraPrevista: combinarDataEHorario(dia, horario),
        numeroNoCiclo: status.diaDoCiclo,
      });
    }
    dia = addDays(dia, 1);
  }

  return doses;
}
