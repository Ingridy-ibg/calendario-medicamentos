import { buscarDosePorId } from '@/db/repositories/doses';
import type { AppDb } from '@/db/repositories/types';
import { resolverDoseEAgendarProxima } from '@/domain/dose-scheduling/resolucao';
import type { Esquema } from '@/domain/dose-scheduling/types';

import { classificarResposta } from './classificacao';

function exigirDose(db: AppDb, doseId: string) {
  const dose = buscarDosePorId(db, doseId);
  if (!dose) {
    throw new Error(`Dose ${doseId} não encontrada`);
  }
  return dose;
}

/**
 * Confirma uma dose comum ou especial de esquema agendado (não "se
 * necessário", ver `adherence-history/se-necessario.ts`) como tomada,
 * classificando tomada/tomada com atraso conforme quantas notificações já
 * foram entregues para ela. Agnóstico de como a confirmação chegou — de uma
 * ação de notificação (src/notifications) ou, no futuro, de um toque direto
 * na agenda.
 */
export function confirmarDose(db: AppDb, esquema: Esquema, doseId: string, agora: Date) {
  const dose = exigirDose(db, doseId);
  const status = classificarResposta(dose.notificacoesSemResposta);
  return resolverDoseEAgendarProxima(db, esquema, doseId, { status, dataHoraRegistro: agora });
}

/** "Não tomar" — só existe para medicamentos comuns (specs/dose-notifications: especial não tem essa ação). */
export function pularDose(db: AppDb, esquema: Esquema, doseId: string, agora: Date) {
  return resolverDoseEAgendarProxima(db, esquema, doseId, { status: 'pulada', dataHoraRegistro: agora });
}
