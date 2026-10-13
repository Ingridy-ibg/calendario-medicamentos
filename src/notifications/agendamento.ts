import {
  cancelScheduledNotificationAsync,
  dismissNotificationAsync,
  getAllScheduledNotificationsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
} from 'expo-notifications';

import type { AppDb } from '@/db/repositories/types';
import {
  analisarIdentificador,
  type AlvoNotificacao,
  type NotificacaoAgendadaNoSistema,
  type TipoAgendador,
} from '@/domain/dose-notifications/reconciliador';
import { CANAIS_NOTIFICACAO } from '@/domain/dose-notifications/types';
import { textosDaDose } from '@/domain/dose-notifications/textos';
import { agendarAlarme, cancelarAlarme, linkDoAlarme, listarAlarmesAgendados } from '@/lib/alarme-dose';

import { buscarContextoDaDose, buscarMedicamentoDoEsquema, dadosDoTextoDaDose } from './contexto';
import { conteudoDose, conteudoLembretePausa } from './conteudo';

/**
 * Um jeito de agendar alvos no aparelho (alarme-tela-cheia, design.md,
 * decisão 4): o `expo-notifications` para dose comum e lembrete de pausa, e
 * o alarme nativo em tela cheia para dose especial. O reconciliador lista os
 * dois e o alvo diz em qual agendar (`AlvoNotificacao.agendador`).
 */
export interface Agendador {
  listar(): Promise<NotificacaoAgendadaNoSistema[]>;
  agendar(db: AppDb, alvo: AlvoNotificacao): Promise<void>;
  cancelar(identifier: string): Promise<void>;
}

/**
 * Agenda um alvo usando seu `identifier` determinístico. Sempre cancela
 * qualquer alarme anterior com o mesmo id antes de recriar — idempotente,
 * seguro para chamar tanto a partir do reconciliador (que sempre reagenda
 * todo desejado, ver design.md) quanto diretamente de um evento (resposta,
 * silêncio, "adiar").
 *
 * Se a dose/esquema/medicamento não existir mais no momento de aplicar
 * (removido entre o cálculo do plano e a execução), o alvo é silenciosamente
 * ignorado — a próxima rodada do reconciliador não vai mais desejá-lo.
 */
const agendadorNotificacoes: Agendador = {
  async listar() {
    const agendadas = await getAllScheduledNotificationsAsync();
    return agendadas.map((n) => ({ identifier: n.identifier, agendador: 'notificacoes' }));
  },

  async agendar(db, alvo) {
    const analisado = analisarIdentificador(alvo.identifier);
    if (!analisado) return;

    await cancelScheduledNotificationAsync(alvo.identifier);

    if (analisado.tipo === 'dose') {
      const contexto = buscarContextoDaDose(db, analisado.doseId);
      if (!contexto) return;

      await scheduleNotificationAsync({
        identifier: alvo.identifier,
        content: conteudoDose(analisado.doseId, dadosDoTextoDaDose(contexto)),
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: alvo.dataHora,
          // Só dose comum chega aqui: a especial vai para o alarme nativo.
          channelId: CANAIS_NOTIFICACAO.doseComum,
        },
      });
      return;
    }

    const medicamento = buscarMedicamentoDoEsquema(db, analisado.esquemaId);
    if (!medicamento) return;

    await scheduleNotificationAsync({
      identifier: alvo.identifier,
      content: conteudoLembretePausa(medicamento.nome),
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: alvo.dataHora,
        channelId: CANAIS_NOTIFICACAO.pausaCiclo,
      },
    });
  },

  async cancelar(identifier) {
    await cancelScheduledNotificationAsync(identifier);
    // Também tira da bandeja a notificação já exibida (fix-revisao-inicio-de-cartela, decisão 8).
    await dismissNotificationAsync(identifier);
  },
};

const agendadorAlarme: Agendador = {
  async listar() {
    return listarAlarmesAgendados().map((a) => ({ identifier: a.id, agendador: 'alarme' }));
  },

  async agendar(db, alvo) {
    const analisado = analisarIdentificador(alvo.identifier);
    if (!analisado || analisado.tipo !== 'dose') return;

    const contexto = buscarContextoDaDose(db, analisado.doseId);
    if (!contexto) {
      cancelarAlarme(alvo.identifier);
      return;
    }
    // O mesmo texto da notificação, inclusive o de início de cartela (inicio-de-cartela).
    const { titulo, corpo } = textosDaDose(dadosDoTextoDaDose(contexto));
    // Agendar o mesmo id substitui o anterior (mesmo PendingIntent).
    agendarAlarme(alvo.identifier, alvo.dataHora, { titulo, texto: corpo, link: linkDoAlarme(analisado.doseId) });
  },

  async cancelar(identifier) {
    cancelarAlarme(identifier);
  },
};

export const AGENDADORES: Record<TipoAgendador, Agendador> = {
  notificacoes: agendadorNotificacoes,
  alarme: agendadorAlarme,
};

export async function agendarAlvo(db: AppDb, alvo: AlvoNotificacao): Promise<void> {
  await AGENDADORES[alvo.agendador].agendar(db, alvo);
}

/**
 * Sem `agendador`, cancela nos dois: quem resolve uma dose (resposta,
 * confirmação pela agenda ou pelo alarme) não precisa saber onde ela estava
 * agendada, e cancelar o alarme também para o som se ele estiver tocando.
 */
export async function cancelarAlvo(identifier: string, agendador?: TipoAgendador): Promise<void> {
  if (agendador) {
    await AGENDADORES[agendador].cancelar(identifier);
    return;
  }
  await Promise.all(Object.values(AGENDADORES).map((a) => a.cancelar(identifier)));
}
