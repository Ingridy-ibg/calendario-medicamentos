import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icone } from '@/components/ui/icone';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';

/**
 * Selo neutro em pílula ("Silenciado", "Fora da agenda", "Prioridade comum").
 * `compacto` é o tamanho das linhas da aba Medicamentos; o padrão, o do
 * cabeçalho do detalhe.
 */
export function Selo({ texto, icone, compacto = false }: { texto: string; icone?: 'sinoDesligado' | 'calendario'; compacto?: boolean }) {
  const theme = useTheme();
  const cor = theme.textSecondary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        paddingHorizontal: compacto ? 8 : 10,
        paddingVertical: compacto ? 2 : 4,
        backgroundColor: theme.surfaceMuted,
      }}>
      {icone ? <Icone nome={icone} cor={cor} tamanho={12} /> : null}
      <ThemedText type="caption" style={{ color: cor, fontFamily: FAMILIA_TEXTO[600] }}>
        {texto}
      </ThemedText>
    </View>
  );
}
