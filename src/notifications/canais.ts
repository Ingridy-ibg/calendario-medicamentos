import {
  AndroidImportance,
  AndroidNotificationVisibility,
  deleteNotificationChannelAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';

import { CANAIS_NOTIFICACAO, CANAIS_REMOVIDOS, VIBRACAO_DOSE_COMUM } from '@/domain/dose-notifications/types';

/**
 * Um canal por estilo de notificação (obrigatório desde o Android 8), para
 * que o usuário possa silenciar cada tipo de forma independente
 * (design.md). A dose especial não tem canal aqui: ela é um alarme nativo em
 * tela cheia, no canal `alarme_especial` criado pelo módulo `alarme-dose`
 * (alarme-tela-cheia, design.md, decisão 8). Os canais de versões anteriores
 * são apagados, para não aparecerem nas Configurações.
 */
export async function configurarCanaisAndroid(): Promise<void> {
  for (const id of CANAIS_REMOVIDOS) {
    await deleteNotificationChannelAsync(id);
  }

  await setNotificationChannelAsync(CANAIS_NOTIFICACAO.doseComum, {
    name: 'Doses',
    description: 'Lembretes de dose de medicamentos comuns.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: VIBRACAO_DOSE_COMUM,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });

  await setNotificationChannelAsync(CANAIS_NOTIFICACAO.pausaCiclo, {
    name: 'Pausa do ciclo',
    description: 'Lembrete leve e informativo nos dias de pausa de um medicamento cíclico.',
    importance: AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
    showBadge: false,
  });

  await setNotificationChannelAsync(CANAIS_NOTIFICACAO.estoqueBaixo, {
    name: 'Estoque baixo',
    description: 'Aviso de que um medicamento está acabando.',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });
}
