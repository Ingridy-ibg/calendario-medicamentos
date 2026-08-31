import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarDosePorId, listarDosesAguardandoVencidas, marcarDosePerdida, reagendarProximaNotificacao } from '@/db/repositories/doses';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { Criticidade } from '@/db/schema';

import { adiarNotificacao, decidirAposEntrega } from './cascata';
import type { DecisaoEntrega } from './cascata';

function exigirDose(db: AppDb, doseId: string) {
  const dose = buscarDosePorId(db, doseId);
  if (!dose) {
    throw new Error(`Dose ${doseId} não encontrada`);
  }
  return dose;
}

/**
 * Ação "adiar" explícita — só existe para medicamentos comuns. Nunca conta no
 * limite de 4 notificações do comum (specs/dose-notifications): reagenda sem
 * tocar em `notificacoesSemResposta`.
 */
export function adiarDoseViaNotificacao(db: AppDb, doseId: string, agora: Date) {
  const dose = exigirDose(db, doseId);
  const decisao = adiarNotificacao(dose.notificacoesSemResposta, agora);
  return reagendarProximaNotificacao(db, doseId, decisao);
}

/**
 * Chamada exatamente uma vez a cada notificação de dose efetivamente
 * entregue (evento de recebimento do expo-notifications), com `agora` igual
 * ao horário real da entrega. Grava a entrega e decide se a cascata continua
 * — nunca marca perdida diretamente (ver `decidirAposEntrega`).
 */
export function registrarEntregaDeNotificacao(
  db: AppDb,
  criticidade: Criticidade,
  doseId: string,
  agora: Date,
): DecisaoEntrega {
  const dose = exigirDose(db, doseId);
  const decisao = decidirAposEntrega(criticidade, dose.notificacoesSemResposta, agora);
  reagendarProximaNotificacao(db, doseId, {
    proximaNotificacaoEm: decisao.proximaNotificacaoEm,
    notificacoesSemResposta: decisao.notificacoesSemResposta,
  });
  return decisao;
}

/**
 * Varredura preguiçosa (chamada pelo reconciliador — a cada abertura do app e
 * periodicamente em segundo plano, ver `src/notifications/reconciliador.ts`):
 * fecha como perdida toda dose comum "aguardando" cujo prazo da 4ª
 * notificação já passou sem resposta. Nada no app roda exatamente no
 * instante em que esse prazo se esgota — daqui vem o atraso de detecção
 * (limitado pelo intervalo da tarefa em segundo plano, ou zero na próxima
 * abertura do app).
 */
export function fecharDosesVencidas(db: AppDb, agora: Date): string[] {
  const candidatas = listarDosesAguardandoVencidas(db, agora);
  const fechadas: string[] = [];

  for (const dose of candidatas) {
    const esquemaRow = buscarEsquemaPorId(db, dose.esquemaId);
    if (!esquemaRow) continue;
    const medicamento = buscarMedicamentoPorId(db, esquemaRow.medicamentoId);
    // Um especial nunca fica perdida — se o contador dele bateu no mesmo
    // limiar numérico do comum por coincidência, isso não significa nada.
    if (!medicamento || medicamento.criticidade !== 'comum') continue;

    marcarDosePerdida(db, dose.id, agora);
    fechadas.push(dose.id);
  }

  return fechadas;
}
