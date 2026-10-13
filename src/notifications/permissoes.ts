import Constants from 'expo-constants';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications';
import { Platform } from 'react-native';

import { permissoesDoAlarmeAPedir } from '@/domain/preferencias/preferencias';
import { abrirConfigSobreOutrosApps, permissoesDoAlarme } from '@/lib/alarme-dose';

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
 * "Aparecer sobre outros apps" (alarme-tela-cheia, design.md, decisão 10):
 * com ela, o alarme abre a tela por cima do app em uso. Como a tela cheia, só
 * se concede nas Configurações.
 */
export async function solicitarPermissaoSobreOutrosApps(): Promise<void> {
  abrirConfigSobreOutrosApps();
}

/**
 * Primeiro cadastro de um especial: abre a configuração de tela cheia e, ao
 * voltar dela, a de aparecer sobre outros apps — só as que ainda faltam.
 * `startActivityAsync` só resolve quando a pessoa volta das Configurações.
 */
export async function solicitarPermissoesDoAlarme(): Promise<void> {
  for (const permissao of permissoesDoAlarmeAPedir(permissoesDoAlarme())) {
    if (permissao === 'telaCheia') await solicitarPermissaoFullScreenIntent();
    else await solicitarPermissaoSobreOutrosApps();
  }
}

/**
 * Pedido único da boas-vindas ("Ativar lembretes e começar", specs/onboarding)
 * — nenhum outro lugar chama isto. Sem isenção de otimização de bateria: os
 * alarmes de dose já disparam no Doze (fix-permissoes-e-respostas, design.md).
 * As permissões de tela cheia e de aparecer sobre outros apps são pedidas
 * separadamente, no primeiro cadastro de um medicamento especial — ver
 * `solicitarPermissoesDoAlarme`, chamada de `src/lib/apos-salvar-medicamento.ts`.
 */
export async function solicitarPermissoesEssenciais(): Promise<void> {
  await solicitarPermissaoPostNotifications();
  await solicitarPermissaoAlarmeExato();
}

export interface SituacaoPermissoes {
  notificacoes: boolean;
  /**
   * Estado real, lido pelo módulo do alarme (`canScheduleExactAlarms` e
   * `canUseFullScreenIntent` — alarme-tela-cheia, design.md, decisão 9).
   * `null` só quando o módulo não existe neste build.
   */
  alarmeExato: boolean | null;
  telaCheia: boolean | null;
  sobreOutrosApps: boolean | null;
}

/** Só consulta — nunca abre diálogo nem tela de Configurações (specs/user-profile). */
export async function consultarPermissoes(): Promise<SituacaoPermissoes> {
  const { granted } = await getPermissionsAsync();
  if (Platform.OS !== 'android') return { notificacoes: granted, alarmeExato: true, telaCheia: true, sobreOutrosApps: true };
  return { notificacoes: granted, ...permissoesDoAlarme() };
}
