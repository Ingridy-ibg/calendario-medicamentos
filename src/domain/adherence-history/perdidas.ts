import { subMinutes } from 'date-fns';

import { listarDosesNaoResolvidasAte, marcarDosePerdida } from '@/db/repositories/doses';
import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';

import { deveVirarPerdida, PRAZO_PERDIDA_MIN } from './classificacao';

/**
 * Marca como perdida toda dose de medicamento comum sem resposta 2 horas
 * depois do horário previsto (fix-late-and-calendar-status), com ou sem
 * notificações entregues — também no Expo Go e para medicamentos silenciados.
 * Especiais nunca viram perdida. Idempotente: só toca doses não resolvidas.
 * Convive com `fecharDosesVencidas` (a varredura da cascata de lembretes).
 */
export function marcarPerdidasPorTempo(db: AppDb, agora: Date = new Date()): string[] {
  const marcadas: string[] = [];
  for (const dose of listarDosesNaoResolvidasAte(db, subMinutes(agora, PRAZO_PERDIDA_MIN))) {
    const esquema = buscarEsquemaPorId(db, dose.esquemaId);
    if (!esquema || esquema.deletedAt) continue;
    const medicamento = buscarMedicamentoPorId(db, esquema.medicamentoId);
    if (!medicamento || medicamento.deletedAt) continue;
    if (!deveVirarPerdida(dose, medicamento.criticidade, agora)) continue;
    marcarDosePerdida(db, dose.id, agora);
    marcadas.push(dose.id);
  }
  return marcadas;
}
