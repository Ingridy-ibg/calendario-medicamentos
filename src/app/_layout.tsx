import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { db } from '@/db/client';
import { isExpoGo } from '@/lib/expo-go';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success || isExpoGo) return;
    // Import dinâmico, nunca estático: só de importar `expo-notifications` já
    // lança uma exceção dentro do Expo Go (ver `lib/expo-go.ts`).
    import('@/notifications').then(({ inicializarNotificacoes }) => inicializarNotificacoes());
  }, [success]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Erro ao preparar o banco de dados: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="medicamento/novo"
          options={{ presentation: 'modal', headerShown: true, title: 'Novo medicamento' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
