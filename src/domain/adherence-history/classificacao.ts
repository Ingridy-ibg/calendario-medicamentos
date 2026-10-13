import { addMinutes } from 'date-fns';

import type { Criticidade, StatusDose } from '@/db/schema';
import { INTERVALO_REENVIO_MINUTOS, LIMITE_NOTIFICACOES_COMUM } from '@/domain/dose-notifications/types';

export const STATUS_FINAIS = ['tomada', 'tomada_com_atraso', 'pulada', 'perdida'] as const;
export type StatusFinal = (typeof STATUS_FINAIS)[number];

export type ClassificacaoResposta = 'tomada' | 'tomada_com_atraso';

/** Depois disso a dose está atrasada: é quando o primeiro reenvio tocaria. */
export const TOLERANCIA_ATRASO_MIN = INTERVALO_REENVIO_MINUTOS;
/** Fim da cascata do comum (4 lembretes de 30 em 30 min): a dose vira perdida. */
export const PRAZO_PERDIDA_MIN = INTERVALO_REENVIO_MINUTOS * LIMITE_NOTIFICACOES_COMUM;

const NAO_RESOLVIDOS: StatusDose[] = ['pendente', 'aguardando'];

interface DoseParaClassificar {
  dataHoraPrevista: Date | null;
  notificacoesSemResposta: number;
}

/**
 * Classifica uma confirmação ("tomei agora") conforme specs/adherence-history
 * (fix-late-and-calendar-status): com atraso se vier mais de 30 minutos depois
 * do horário previsto — quando o primeiro reenvio dispararia — ou se algum
 * reenvio já foi entregue; senão, tomada. Depende do horário, não da entrega
 * das notificações, para valer também sem lembretes (Expo Go, silenciado).
 */
export function classificarResposta(dose: DoseParaClassificar, agora: Date): ClassificacaoResposta {
  const passouDaTolerancia = dose.dataHoraPrevista !== null && agora > addMinutes(dose.dataHoraPrevista, TOLERANCIA_ATRASO_MIN);
  return passouDaTolerancia || dose.notificacoesSemResposta >= 2 ? 'tomada_com_atraso' : 'tomada';
}

interface DoseEmAberto {
  dataHoraPrevista: Date | null;
  status: StatusDose;
}

/** Não resolvida e mais de 30 minutos depois do horário: exibida como "Atrasada". */
export function estaAtrasada(dose: DoseEmAberto, agora: Date): boolean {
  return (
    dose.dataHoraPrevista !== null &&
    NAO_RESOLVIDOS.includes(dose.status) &&
    agora > addMinutes(dose.dataHoraPrevista, TOLERANCIA_ATRASO_MIN)
  );
}

/** Dose comum não resolvida 2 horas depois do horário vira perdida; especial nunca. */
export function deveVirarPerdida(dose: DoseEmAberto, criticidade: Criticidade, agora: Date): boolean {
  return (
    criticidade === 'comum' &&
    dose.dataHoraPrevista !== null &&
    NAO_RESOLVIDOS.includes(dose.status) &&
    agora >= addMinutes(dose.dataHoraPrevista, PRAZO_PERDIDA_MIN)
  );
}
