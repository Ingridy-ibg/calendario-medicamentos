import Constants from 'expo-constants';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * `POST_NOTIFICATIONS` (Android 13+) é a única permissão daqui pedida por um
 * diálogo padrão do sistema — as demais abaixo são permissões/telas que o
 * Android só concede através das Configurações (design.md).
 */
export async function solicitarPermissaoPostNotifications(): Promise<boolean> {
  const atual = await getPermissionsAsync();
  if (atual.granted) {
    return true;
  }
  const resultado = await requestPermissionsAsync();
  return resultado.granted;
}

function nomeDoPacote(): string | undefined {
  return Constants.expoConfig?.android?.package;
}

/**
 * A partir do Android 13 (API 33), `SCHEDULE_EXACT_ALARM` não vem
 * pré-concedida para apps que não são de alarme/calendário — é preciso levar
 * o usuário à tela do sistema para conceder manualmente (design.md). Abaixo
 * da API 31 a permissão nem existe; entre 31 e 32 ela é concedida
 * automaticamente na instalação. Só faz sentido abrir a tela nesses casos.
 */
export async function solicitarPermissaoAlarmeExato(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return;
  }
  await startActivityAsync(ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, {
    data: `package:${nomeDoPacote()}`,
  });
}

/**
 * Full-screen intent (`USE_FULL_SCREEN_INTENT`): declarada em app.json e
 * concedida automaticamente na instalação até o Android 13. A partir do
 * Android 14 (API 34), o usuário precisa revisá-la manualmente numa tela de
 * Configurações dedicada — não existe diálogo de permissão do sistema para
 * ela em nenhuma versão (specs/dose-notifications, design.md).
 */
export async function solicitarPermissaoFullScreenIntent(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 34) {
    return;
  }
  await startActivityAsync(ActivityAction.MANAGE_APP_USE_FULL_SCREEN_INTENT, {
    data: `package:${nomeDoPacote()}`,
  });
}

/**
 * Pedido único da boas-vindas ("Ativar lembretes e começar", specs/onboarding)
 * — nenhum outro lugar chama isto. Sem isenção de otimização de bateria: os
 * alarmes de dose já disparam no Doze (fix-permissoes-e-respostas, design.md).
 * A permissão de full-screen intent (5.2) é pedida separadamente, no primeiro
 * cadastro de um medicamento especial — ver `solicitarPermissaoFullScreenIntent`
 * chamada a partir de `src/app/medicamento/novo.tsx`.
 */
export async function solicitarPermissoesEssenciais(): Promise<void> {
  await solicitarPermissaoPostNotifications();
  await solicitarPermissaoAlarmeExato();
}

export interface SituacaoPermissoes {
  notificacoes: boolean;
  /**
   * `null` quando não há como saber: o `expo-notifications` não expõe consulta
   * de `SCHEDULE_EXACT_ALARM`, então do Android 13 em diante o perfil só
   * oferece "Abrir configurações" (apply-visual-identity, design.md).
   */
  alarmeExato: boolean | null;
}

/** Só consulta — nunca abre diálogo nem tela de Configurações (specs/user-profile). */
export async function consultarPermissoes(): Promise<SituacaoPermissoes> {
  const { granted } = await getPermissionsAsync();
  const versao = Number(Platform.Version);
  // Abaixo da API 31 a permissão nem existe; nas APIs 31–32 vem concedida na instalação.
  const alarmeExato = Platform.OS !== 'android' || versao < 33 ? true : null;
  return { notificacoes: granted, alarmeExato };
}
