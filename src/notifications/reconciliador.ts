import { getAllScheduledNotificationsAsync } from 'expo-notifications';

import type { AppDb } from '@/db/repositories/types';
import { planejarReconciliacao } from '@/domain/dose-notifications/reconciliador';
import { fecharDosesVencidas } from '@/domain/dose-notifications/resolucao-por-notificacao';

import { agendarAlvo, cancelarAlvo } from './agendamento';
import { listarAlvosDesejados } from './contexto';

/**
 * Roda a cada abertura do app e periodicamente em segundo plano
 * (`tarefas.ts`) — remove do SO os alarmes que não correspondem mais a nada
 * ativo no banco e agenda exatamente uma notificação por dose/lembrete ativo
 * que ainda não tenha uma (5.3). Também serve de recuperação após reboot
 * (5.13): se o SO tiver perdido algum alarme, a próxima execução — no
 * primeiro app aberto ou na primeira execução da tarefa periódica — rearma a
 * partir da tabela `doses`, a fonte de verdade (ver design.md).
 *
 * Fecha primeiro as doses comuns cujo prazo de silêncio já venceu
 * (`fecharDosesVencidas`, a varredura preguiçosa da perdida — ver cascata.ts):
 * assim elas já saem da lista de desejados desta mesma rodada, em vez de
 * ainda aparecer como "aguardando" um alarme que não deveria mais existir.
 */
export async function reconciliarNotificacoes(db: AppDb, agora: Date = new Date()): Promise<void> {
  fecharDosesVencidas(db, agora);

  const desejados = listarAlvosDesejados(db, agora);
  const agendadosNoSistema = await getAllScheduledNotificationsAsync();

  const plano = planejarReconciliacao(
    desejados,
    agendadosNoSistema.map((n) => ({ identifier: n.identifier })),
  );

  for (const identifier of plano.cancelar) {
    await cancelarAlvo(identifier);
  }
  for (const alvo of plano.agendar) {
    await agendarAlvo(db, alvo);
  }
}
