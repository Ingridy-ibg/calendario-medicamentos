import type { AppDb } from '@/db/repositories/types';
import { analisarIdentificador, planejarReconciliacao } from '@/domain/dose-notifications/reconciliador';
import { aplicarDisparosDeAlarme, fecharDosesVencidas } from '@/domain/dose-notifications/resolucao-por-notificacao';
import { consumirDisparosDoAlarme } from '@/lib/alarme-dose';

import { AGENDADORES, agendarAlvo, cancelarAlvo } from './agendamento';
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
 *
 * Antes de tudo, aplica os disparos que o alarme nativo dos especiais fez
 * com o app fechado: sem isso o banco ficaria atrás do rearme nativo, e o
 * especial seria reagendado para um horário já passado (alarme-tela-cheia,
 * design.md, decisão 4).
 */
export async function reconciliarNotificacoes(db: AppDb, agora: Date = new Date()): Promise<void> {
  aplicarDisparosDeAlarme(
    db,
    consumirDisparosDoAlarme().flatMap((disparo) => {
      const analisado = analisarIdentificador(disparo.id);
      return analisado?.tipo === 'dose' ? [{ doseId: analisado.doseId, em: new Date(disparo.epochMs) }] : [];
    }),
  );
  fecharDosesVencidas(db, agora);

  const desejados = listarAlvosDesejados(db, agora);
  const agendadosNoSistema = (await Promise.all(Object.values(AGENDADORES).map((a) => a.listar()))).flat();

  const plano = planejarReconciliacao(desejados, agendadosNoSistema);

  for (const { identifier, agendador } of plano.cancelar) {
    await cancelarAlvo(identifier, agendador);
  }
  for (const alvo of plano.agendar) {
    await agendarAlvo(db, alvo);
  }
}
