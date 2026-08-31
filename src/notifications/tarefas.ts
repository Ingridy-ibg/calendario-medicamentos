import * as BackgroundTask from 'expo-background-task';
import {
  DEFAULT_ACTION_IDENTIFIER,
  type NotificationResponse,
  type NotificationTaskPayload,
  registerTaskAsync as registerBackgroundNotificationTaskAsync,
} from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { db } from '@/db/client';
import { confirmarDose, pularDose } from '@/domain/adherence-history/resolucao';
import { analisarIdentificador } from '@/domain/dose-notifications/reconciliador';
import { adiarDoseViaNotificacao, registrarEntregaDeNotificacao } from '@/domain/dose-notifications/resolucao-por-notificacao';
import type { AcaoNotificacao } from '@/domain/dose-notifications/types';

import { agendarAlvo, cancelarAlvo } from './agendamento';
import { buscarContextoDaDose } from './contexto';
import { reconciliarNotificacoes } from './reconciliador';

export const TAREFA_NOTIFICACAO = 'TAREFA_NOTIFICACAO_DOSE';
export const TAREFA_RECONCILIACAO_PERIODICA = 'TAREFA_RECONCILIACAO_PERIODICA';

function ehResposta(payload: NotificationTaskPayload): payload is NotificationResponse {
  return 'actionIdentifier' in payload;
}

function ehAcaoValida(id: string): id is AcaoNotificacao {
  return id === 'tomei_agora' || id === 'adiar' || id === 'nao_tomar';
}

/**
 * Uma dose comum "não tomar"/"adiar" nunca aparece para especial — se a
 * ação chegar mesmo assim (não deveria, a categoria registrada não oferece
 * o botão), ela é ignorada em vez de aplicada, para nunca marcar como
 * pulada/perdida algo que specs/dose-notifications proíbe para especiais.
 */
async function processarResposta(response: NotificationResponse) {
  const analisado = analisarIdentificador(response.notification.request.identifier);
  if (!analisado || analisado.tipo !== 'dose') return; // lembrete de pausa não tem ação — um toque nele só abre o app.

  if (response.actionIdentifier === DEFAULT_ACTION_IDENTIFIER) return; // toque simples só abre o app.
  if (!ehAcaoValida(response.actionIdentifier)) return;

  const { doseId } = analisado;
  const agora = new Date();
  const contexto = buscarContextoDaDose(db, doseId);
  if (!contexto) return; // dose/medicamento removido antes da resposta chegar.

  if (contexto.medicamento.criticidade === 'especial' && response.actionIdentifier !== 'tomei_agora') {
    return;
  }

  switch (response.actionIdentifier) {
    case 'tomei_agora':
      confirmarDose(db, contexto.esquema, doseId, agora);
      await cancelarAlvo(response.notification.request.identifier);
      break;
    case 'nao_tomar':
      pularDose(db, contexto.esquema, doseId, agora);
      await cancelarAlvo(response.notification.request.identifier);
      break;
    case 'adiar': {
      const resultado = adiarDoseViaNotificacao(db, doseId, agora);
      if (resultado) {
        await agendarAlvo(db, {
          identifier: response.notification.request.identifier,
          tipo: 'dose',
          dataHora: resultado.proximaNotificacaoEm!,
        });
      }
      break;
    }
  }
}

/**
 * Uma notificação de dose foi entregue (mostrada) sem que o usuário tivesse
 * respondido a nenhuma anterior. Grava a entrega e, se a cascata continuar,
 * já agenda o próprio próximo alarme (ver `decidirAposEntrega`) — o
 * reconciliador periódico/de abertura do app é só a rede de segurança.
 */
async function processarEntrega(payload: Exclude<NotificationTaskPayload, NotificationResponse>) {
  const notification = payload.notification as { request?: { identifier?: string } } | null;
  const identifier = notification?.request?.identifier;
  if (!identifier) return;

  const analisado = analisarIdentificador(identifier);
  if (!analisado || analisado.tipo !== 'dose') return;

  const { doseId } = analisado;
  const agora = new Date();
  const contexto = buscarContextoDaDose(db, doseId);
  if (!contexto) return;

  const decisao = registrarEntregaDeNotificacao(db, contexto.medicamento.criticidade, doseId, agora);
  if (decisao.agendarProximoAlarme) {
    await agendarAlvo(db, { identifier, tipo: 'dose', dataHora: decisao.proximaNotificacaoEm });
  }
}

/**
 * Define e registra a tarefa de notificação em segundo plano — precisa
 * rodar no escopo do módulo (não dentro de um componente), carregada cedo
 * pelo app (ver `src/app/_layout.tsx`), para que `expo-task-manager` consiga
 * invocá-la mesmo com o app em segundo plano ou encerrado (design.md).
 */
if (!TaskManager.isTaskDefined(TAREFA_NOTIFICACAO)) {
  TaskManager.defineTask<NotificationTaskPayload>(TAREFA_NOTIFICACAO, async ({ data, error }) => {
    if (error || !data) return;
    if (ehResposta(data)) {
      await processarResposta(data);
    } else {
      await processarEntrega(data);
    }
  });
}

export async function registrarTarefaDeNotificacao(): Promise<void> {
  await registerBackgroundNotificationTaskAsync(TAREFA_NOTIFICACAO);
}

if (!TaskManager.isTaskDefined(TAREFA_RECONCILIACAO_PERIODICA)) {
  TaskManager.defineTask(TAREFA_RECONCILIACAO_PERIODICA, async () => {
    await reconciliarNotificacoes(db, new Date());
  });
}

/**
 * Tarefa periódica via `expo-background-task` (WorkManager no Android). Além
 * de servir de rede de segurança para 5.3, o WorkManager reagenda esse
 * trabalho periódico sozinho após um reboot do aparelho — é o mecanismo que
 * cobre 5.13 sem precisar de um `BroadcastReceiver` de `RECEIVE_BOOT_COMPLETED`
 * próprio (ver design.md e a nota em `reconciliador.ts`).
 */
export async function registrarReconciliacaoPeriodica(): Promise<void> {
  await BackgroundTask.registerTaskAsync(TAREFA_RECONCILIACAO_PERIODICA, { minimumInterval: 30 });
}
