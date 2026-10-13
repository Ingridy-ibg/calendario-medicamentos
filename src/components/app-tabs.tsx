import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';

/**
 * Abas principais (specs/visual-identity): fundo de superfície, aba ativa na
 * cor de destaque e inativas em texto secundário. Ícones Material no Android
 * (`md`) e SF Symbols no iOS (`sf`).
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      indicatorColor={theme.accentSoft}
      tintColor={theme.accent}
      iconColor={{ default: theme.textSecondary, selected: theme.accent }}
      labelStyle={{
        default: { color: theme.textSecondary, fontFamily: FAMILIA_TEXTO[600] },
        selected: { color: theme.accent, fontFamily: FAMILIA_TEXTO[700] },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="format_list_bulleted" sf="list.bullet" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendario">
        <NativeTabs.Trigger.Label>Calendário</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="calendar_month" sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="medicamentos">
        <NativeTabs.Trigger.Label>Medicamentos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="pill" sf="pills" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="person" sf="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
