import {
  AndroidImportance,
  AndroidNotificationVisibility,
  setNotificationChannelAsync,
} from 'expo-notifications';

import { CANAIS_NOTIFICACAO } from '@/domain/dose-notifications/types';

/**
 * Um canal por estilo de notificação (obrigatório desde o Android 8), para
 * que o usuário possa silenciar cada tipo de forma independente
 * (design.md). `doseEspecialCritico` usa MAX + bypassDnd para chegar o mais
 * perto possível de um estilo "alarme" dentro do que o Android permite via
 * canal — a apresentação de fato como full-screen intent depende também da
 * permissão declarada em app.json e é resolvida pelo SO a partir dela, não
 * há um campo equivalente na API JS do expo-notifications (ver `permissoes.ts`).
 */
export async function configurarCanaisAndroid(): Promise<void> {
  await setNotificationChannelAsync(CANAIS_NOTIFICACAO.doseComum, {
    name: 'Doses',
    description: 'Lembretes de dose de medicamentos comuns.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });

  await setNotificationChannelAsync(CANAIS_NOTIFICACAO.doseEspecialCritico, {
    name: 'Doses críticas',
    description: 'Lembretes de dose de medicamentos especiais — estilo alarme, difícil de ignorar.',
    importance: AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
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
