import {
  cancelScheduledNotificationAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
} from 'expo-notifications';

import { buscarDosePorId } from '@/db/repositories/doses';
import type { AppDb } from '@/db/repositories/types';
import { analisarIdentificador, type AlvoNotificacao } from '@/domain/dose-notifications/reconciliador';
import { CANAIS_NOTIFICACAO, canalParaDose } from '@/domain/dose-notifications/types';

import { buscarContextoDaDose, buscarMedicamentoDoEsquema } from './contexto';
import { conteudoDose, conteudoLembretePausa } from './conteudo';

/**
 * Agenda um alvo (dose ou lembrete de pausa) usando seu `identifier`
 * determinístico. Sempre cancela qualquer alarme anterior com o mesmo id
 * antes de recriar — idempotente, seguro para chamar tanto a partir do
 * reconciliador (que sempre reagenda todo desejado, ver design.md) quanto
 * diretamente de um evento (resposta, silêncio, "adiar").
 *
 * Se a dose/esquema/medicamento não existir mais no momento de aplicar
 * (removido entre o cálculo do plano e a execução), o alvo é silenciosamente
 * ignorado — a próxima rodada do reconciliador não vai mais desejá-lo.
 */
export async function agendarAlvo(db: AppDb, alvo: AlvoNotificacao): Promise<void> {
  const analisado = analisarIdentificador(alvo.identifier);
  if (!analisado) return;

  await cancelScheduledNotificationAsync(alvo.identifier);

  if (analisado.tipo === 'dose') {
    const dose = buscarDosePorId(db, analisado.doseId);
    const contexto = buscarContextoDaDose(db, analisado.doseId);
    if (!dose || !contexto) return;

    await scheduleNotificationAsync({
      identifier: alvo.identifier,
      content: conteudoDose(analisado.doseId, {
        nomeMedicamento: contexto.medicamento.nome,
        dosagem: contexto.medicamento.dosagem,
        criticidade: contexto.medicamento.criticidade,
        notificacoesSemResposta: dose.notificacoesSemResposta,
      }),
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: alvo.dataHora,
        channelId: canalParaDose(contexto.medicamento.criticidade),
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
}

export async function cancelarAlvo(identifier: string): Promise<void> {
  await cancelScheduledNotificationAsync(identifier);
}
