import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useRootNavigationState } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/cores';
import { FONTES_DO_APP } from '@/constants/fontes';
import { db } from '@/db/client';
import { isExpoGo } from '@/lib/expo-go';
import { deveExibirSaudacao } from '@/domain/daily-greeting/saudacao';
import { marcarPerdidasPorTempo } from '@/domain/adherence-history/perdidas';
import { renovarJanelasAtivas } from '@/domain/dose-scheduling/janela-rolante';
import { consumirAberturaPorNotificacao } from '@/lib/notificacoes-seguras';
import { aplicarAparenciaSalva, lerUltimaSaudacao, usePreferencias } from '@/lib/preferencias';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();
// Antes de qualquer renderização, para a splash e a boas-vindas já abrirem no
// tema escolhido no perfil (specs/user-profile).
aplicarAparenciaSalva();

/**
 * Saudação na primeira abertura comum do dia (specs/daily-greeting): avaliada
 * quando a navegação fica pronta (abertura a frio) e a cada volta ao primeiro
 * plano. Concluir a boas-vindas não dispara a avaliação, então o primeiro uso
 * nunca mostra a saudação.
 */
function useSaudacaoDiaria(navegacaoPronta: boolean) {
  useEffect(() => {
    if (!navegacaoPronta) return;

    async function avaliar() {
      const exibir = deveExibirSaudacao({
        agora: new Date(),
        ultimaExibicao: lerUltimaSaudacao(),
        boasVindasConcluida: usePreferencias.getState().boasVindasConcluida,
        abertoPorNotificacao: await consumirAberturaPorNotificacao(),
      });
      if (exibir) router.push('/saudacao');
    }

    void avaliar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void avaliar();
    });
    return () => assinatura.remove();
  }, [navegacaoPronta]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);
  // Erro de fonte não bloqueia o app: ele segue com a fonte do sistema.
  const [fontesCarregadas, erroFontes] = useFonts(FONTES_DO_APP);
  const fontesProntas = fontesCarregadas || erroFontes != null;
  const boasVindasConcluida = usePreferencias((estado) => estado.boasVindasConcluida);
  const estadoNavegacao = useRootNavigationState();
  useSaudacaoDiaria(!!estadoNavegacao?.key && !!success && fontesProntas);

  useEffect(() => {
    if (!success) return;
    // Renova a janela de doses e fecha as perdidas por tempo na abertura e a
    // cada volta ao primeiro plano —
    // também no Expo Go, porque não depende de notificações. Roda antes do
    // reconciliador, que agenda os lembretes a partir dessas doses.
    const manter = () => {
      renovarJanelasAtivas(db);
      marcarPerdidasPorTempo(db);
    };
    manter();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') manter();
    });
    return () => assinatura.remove();
  }, [success]);

  useEffect(() => {
    if (!success || isExpoGo) return;
    // Import dinâmico, nunca estático: só de importar `expo-notifications` já
    // lança uma exceção dentro do Expo Go (ver `lib/expo-go.ts`). Enquanto a
    // boas-vindas não foi concluída, nenhuma permissão é pedida aqui — é ela
    // que faz o primeiro pedido (specs/onboarding).
    const pedirPermissoes = usePreferencias.getState().boasVindasConcluida;
    import('@/notifications').then(({ inicializarNotificacoes }) => inicializarNotificacoes({ pedirPermissoes }));
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Erro ao preparar o banco de dados: {error.message}</Text>
      </View>
    );
  }

  if (!success || !fontesProntas) {
    return null;
  }

  const escuro = colorScheme === 'dark';
  const temaNavegacao = escuro ? DarkTheme : DefaultTheme;
  const cores = Colors[escuro ? 'dark' : 'light'];

  return (
    <ThemeProvider
      value={{
        ...temaNavegacao,
        colors: { ...temaNavegacao.colors, background: cores.background, card: cores.surface, primary: cores.accent },
      }}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={boasVindasConcluida}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="medicamento/novo" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medicamento/confirmar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="medicamento/[id]/index" />
          <Stack.Screen name="medicamento/[id]/editar" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="medicamento/[id]/compra"
            options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }}
          />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="saudacao" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!boasVindasConcluida}>
          <Stack.Screen name="boas-vindas" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
