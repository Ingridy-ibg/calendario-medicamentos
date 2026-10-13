import { addDays, differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns';

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

/**
 * Dia e horário previstos para o início da próxima cartela
 * (inicio-de-cartela): com ciclo, o dia seguinte ao fim da pausa (ou dos dias
 * ativos, sem pausa); sem ciclo, o dia gravado no cadastro ou na volta à
 * agenda. Sempre no horário atual do ciclo — editar o horário move o início.
 */
export function inicioPrevistoDaCartela(esquema: EsquemaCiclico): Date | null {
  const [horario] = esquema.horarios;
  if (!horario) return null;
  if (esquema.dataInicioCiclo !== null) {
    const dia = addDays(startOfDay(esquema.dataInicioCiclo), esquema.diasAtivos + esquema.diasPausa);
    return combinarDataEHorario(dia, horario);
  }
  return esquema.inicioCartelaPrevisto ? combinarDataEHorario(startOfDay(esquema.inicioCartelaPrevisto), horario) : null;
}

/**
 * A dose de início de cartela (dia 1 da nova cartela) quando ela cai em
 * [de, ate] — só ela: os dias 2 em diante de um ciclo não iniciado nunca são
 * gerados, porque o ciclo só começa com a confirmação.
 */
export function gerarDoseDeInicioDeCartela(esquema: EsquemaCiclico, de: Date, ate: Date): DoseGerada[] {
  const inicio = inicioPrevistoDaCartela(esquema);
  if (!inicio || inicio < startOfDay(de) || startOfDay(inicio) > startOfDay(ate)) return [];
  return [{ dataHoraPrevista: inicio, numeroNoCiclo: 1 }];
}

interface DoseDoCiclo {
  numeroNoCiclo: number | null;
  status: string;
  dataHoraPrevista: Date | null;
}

/** Dia 1 de uma cartela — o rótulo "Início da nova cartela" no histórico. */
export function ehInicioDeCartela(dose: Pick<DoseDoCiclo, 'numeroNoCiclo'>): boolean {
  return dose.numeroNoCiclo === 1;
}

/**
 * Dose de início de cartela ainda à espera da confirmação: dia 1 não
 * resolvido cujo dia cai fora de um ciclo em andamento. O dia 1 de um ciclo
 * já ancorado (ex.: cadastro em uso no dia 1 da cartela) cai em 'ativo' e é
 * uma dose comum.
 */
export function ehInicioDeCartelaPendente(esquema: EsquemaCiclico, dose: DoseDoCiclo): boolean {
  return (
    dose.numeroNoCiclo === 1 &&
    (dose.status === 'pendente' || dose.status === 'aguardando') &&
    dose.dataHoraPrevista !== null &&
    calcularStatusDoDia(esquema, dose.dataHoraPrevista).fase === 'em_espera'
  );
}

/**
 * A dose de início de cartela que deveria existir e não existe
 * (fix-revisao-inicio-de-cartela): o início previsto já chegou (pelo dia) e
 * não há nenhuma dose de dia 1 nesse dia, em qualquer status. Cobre o início
 * que caiu antes da janela rolante — ciclo terminado antes da atualização, ou
 * app fechado por semanas —, que `gerarDoseDeInicioDeCartela` nunca gera.
 */
export function doseDeInicioFaltante(
  esquema: EsquemaCiclico,
  doses: Pick<DoseDoCiclo, 'numeroNoCiclo' | 'dataHoraPrevista'>[],
  agora: Date,
): DoseGerada | null {
  const inicio = inicioPrevistoDaCartela(esquema);
  if (!inicio || startOfDay(inicio) > startOfDay(agora)) return null;
  if (calcularStatusDoDia(esquema, inicio).fase !== 'em_espera') return null;
  const jaExiste = doses.some(
    (dose) => dose.numeroNoCiclo === 1 && dose.dataHoraPrevista !== null && isSameDay(dose.dataHoraPrevista, inicio),
  );
  return jaExiste ? null : { dataHoraPrevista: inicio, numeroNoCiclo: 1 };
}

export type DiaProjetadoCiclico =
  | { dia: Date; fase: 'ativo'; horario: Date; diaDoCiclo: number }
  | { dia: Date; fase: 'pausa' }
  | { dia: Date; fase: 'inicio-cartela'; horario: Date };

/**
 * Projeção para o calendário (inicio-de-cartela): o ciclo atual como está e,
 * a partir do início previsto, ciclos seguidos (início, dias ativos, pausa)
 * supondo que cada cartela começa logo depois da pausa anterior. Uma cartela
 * atrasada é suposta começando `hoje`. `ate` é exclusivo.
 */
export function projetarCiclos(esquema: EsquemaCiclico, de: Date, ate: Date, hoje: Date): DiaProjetadoCiclico[] {
  const [horario] = esquema.horarios;
  if (!horario) return [];

  const inicioPrevisto = inicioPrevistoDaCartela(esquema);
  const ancoraProjecao = inicioPrevisto ? startOfDay(inicioPrevisto < startOfDay(hoje) ? hoje : inicioPrevisto) : null;
  const duracaoCiclo = esquema.diasAtivos + esquema.diasPausa;

  const dias: DiaProjetadoCiclico[] = [];
  for (let dia = startOfDay(de); dia < ate; dia = addDays(dia, 1)) {
    const status = calcularStatusDoDia(esquema, dia);
    if (status.fase === 'ativo') {
      dias.push({ dia, fase: 'ativo', horario: combinarDataEHorario(dia, horario), diaDoCiclo: status.diaDoCiclo });
      continue;
    }
    if (status.fase === 'pausa') {
      dias.push({ dia, fase: 'pausa' });
      continue;
    }
    if (!ancoraProjecao || dia < ancoraProjecao) continue;

    const posicao = differenceInCalendarDays(dia, ancoraProjecao) % duracaoCiclo;
    if (posicao === 0) {
      dias.push({ dia, fase: 'inicio-cartela', horario: combinarDataEHorario(dia, horario) });
    } else if (posicao < esquema.diasAtivos) {
      dias.push({ dia, fase: 'ativo', horario: combinarDataEHorario(dia, horario), diaDoCiclo: posicao + 1 });
    } else {
      dias.push({ dia, fase: 'pausa' });
    }
  }
  return dias;
}
