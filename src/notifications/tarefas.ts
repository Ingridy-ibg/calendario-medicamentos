import * as BackgroundTask from 'expo-background-task';
import {
  DEFAULT_ACTION_IDENTIFIER,
  type NotificationResponse,
  type NotificationTaskPayload,
  registerTaskAsync as registerBackgroundNotificationTaskAsync,
} from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import * as TaskManager from 'expo-task-manager';

import { db } from '@/db/client';
import { agendadorParaDose, analisarIdentificador } from '@/domain/dose-notifications/reconciliador';
import {
  aplicarRespostaDeNotificacao,
  registrarEntregaDeNotificacao,
} from '@/domain/dose-notifications/resolucao-por-notificacao';
import {
  chaveDaResposta,
  lerRespostasLembradas,
  registrarResposta,
} from '@/domain/dose-notifications/respostas-processadas';
import type { AcaoNotificacao } from '@/domain/dose-notifications/types';
import { useDadosStore } from '@/state/dados-store';

import { agendarAlvo, cancelarAlvo } from './agendamento';
import { buscarContextoDaDose } from './contexto';
import { reconciliarNotificacoes } from './reconciliador';
import { marcarPerdidasPorTempo } from '@/domain/adherence-history/perdidas';
import { renovarJanelasAtivas } from '@/domain/dose-scheduling/janela-rolante';

export const TAREFA_NOTIFICACAO = 'TAREFA_NOTIFICACAO_DOSE';
export const TAREFA_RECONCILIACAO_PERIODICA = 'TAREFA_RECONCILIACAO_PERIODICA';
const CHAVE_RESPOSTAS_PROCESSADAS = 'notificacoes.respostasProcessadas';

function ehResposta(payload: NotificationTaskPayload): payload is NotificationResponse {
  return 'actionIdentifier' in payload;
}

function ehAcaoValida(id: string): id is AcaoNotificacao {
  return id === 'tomei_agora' || id === 'adiar' || id === 'nao_tomar';
}

/**
 * Marca a resposta como processada e diz se ela já tinha sido. A mesma
 * resposta pode chegar duas vezes — pela tarefa de fundo e pelo ouvinte do
 * app aberto, ou de novo como "última resposta" ao reabrir o app — e o
 * "adiar" deixa a dose aberta, então o status sozinho não o barra.
 */
function jaFoiProcessada(response: NotificationResponse): boolean {
  const chave = chaveDaResposta(
    response.notification.request.identifier,
    response.actionIdentifier,
    response.notification.date,
  );
  const atual = lerRespostasLembradas(Storage.getItemSync(CHAVE_RESPOSTAS_PROCESSADAS));
  const { jaProcessada, lembradas } = registrarResposta(atual, chave);
  if (!jaProcessada) Storage.setItemSync(CHAVE_RESPOSTAS_PROCESSADAS, JSON.stringify(lembradas));
  return jaProcessada;
}

/**
 * Aplica a ação tocada numa notificação de dose, venha ela da tarefa de
 * fundo (app em segundo plano ou fechado) ou do ouvinte registrado em
 * `inicializar.ts` (app aberto). No máximo uma vez por resposta
 * (`jaFoiProcessada` + `aplicarRespostaDeNotificacao`, que ignora dose já
 * resolvida e ações que o especial não oferece).
 */
export async function processarResposta(response: NotificationResponse): Promise<void> {
  const identifier = response.notification.request.identifier;
  const analisado = analisarIdentificador(identifier);
  if (!analisado || analisado.tipo !== 'dose') return; // lembrete de pausa não tem ação — um toque nele só abre o app.

  if (response.actionIdentifier === DEFAULT_ACTION_IDENTIFIER) return; // toque simples só abre o app.
  if (!ehAcaoValida(response.actionIdentifier)) return;
  if (jaFoiProcessada(response)) return;

  const { doseId } = analisado;
  const contexto = buscarContextoDaDose(db, doseId);
  if (!contexto) return; // dose/medicamento removido antes da resposta chegar.

  const resultado = aplicarRespostaDeNotificacao(
    db,
    contexto.esquema,
    contexto.medicamento.criticidade,
    doseId,
    response.actionIdentifier,
    new Date(),
  );

  if (resultado.tipo === 'resolvida') {
    await cancelarAlvo(identifier);
  } else if (resultado.tipo === 'adiada') {
    await agendarAlvo(db, {
      identifier,
      tipo: 'dose',
      dataHora: resultado.proximaNotificacaoEm,
      agendador: agendadorParaDose(contexto.medicamento.criticidade),
    });
  }
  if (resultado.tipo !== 'ignorada') useDadosStore.getState().avisarDadosMudaram();
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
    await agendarAlvo(db, {
      identifier,
      tipo: 'dose',
      dataHora: decisao.proximaNotificacaoEm,
      agendador: agendadorParaDose(contexto.medicamento.criticidade),
    });
  }
}

/**
 * Define e registra a tarefa de notificação em segundo plano — precisa
 * rodar no escopo do módulo (não dentro de um componente) e ser carregada
 * pelo arquivo de entrada (`index.ts` na raiz), antes do expo-router: numa
 * inicialização sem interface (ação tocada com o app fechado) o layout não
 * chega a ser avaliado, e uma tarefa não definida descarta a resposta
 * (fix-permissoes-e-respostas, design.md).
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
    const agora = new Date();
    // Antes de reconciliar: garante doses à frente mesmo se o app não for
    // aberto por semanas (fix-cyclic-and-rolling-window).
    renovarJanelasAtivas(db, agora);
    marcarPerdidasPorTempo(db, agora);
    await reconciliarNotificacoes(db, agora);
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
