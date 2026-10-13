import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/cores';
import { FONTES_DO_APP } from '@/constants/fontes';
import { db } from '@/db/client';
import { isExpoGo } from '@/lib/expo-go';
import { aplicarAparenciaSalva, usePreferencias } from '@/lib/preferencias';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();
// Antes de qualquer renderização, para a splash e a boas-vindas já abrirem no
// tema escolhido no perfil (specs/user-profile).
aplicarAparenciaSalva();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);
  // Erro de fonte não bloqueia o app: ele segue com a fonte do sistema.
  const [fontesCarregadas, erroFontes] = useFonts(FONTES_DO_APP);
  const fontesProntas = fontesCarregadas || erroFontes != null;
  const boasVindasConcluida = usePreferencias((estado) => estado.boasVindasConcluida);

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
          <Stack.Screen name="perfil" />
        </Stack.Protected>
        <Stack.Protected guard={!boasVindasConcluida}>
          <Stack.Screen name="boas-vindas" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
