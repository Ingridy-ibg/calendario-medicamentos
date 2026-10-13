import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';

/** Selo neutro de medicamento fora da agenda (agenda-membership). */
export function SeloForaDaAgenda() {
  const theme = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: theme.surfaceMuted,
      }}>
      <Icone nome="calendario" cor={theme.textSecondary} tamanho={12} />
      <ThemedText type="caption" themeColor="textSecondary" style={{ fontFamily: FAMILIA_TEXTO[600] }}>
        Fora da agenda
      </ThemedText>
    </View>
  );
}
