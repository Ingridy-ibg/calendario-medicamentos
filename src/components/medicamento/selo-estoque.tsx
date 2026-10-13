import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { type AlertaEstoque, alertaForte, textoAlertaEstoque } from '@/domain/medication-stock/alerta';
import { useTheme } from '@/hooks/use-theme';

/**
 * Selo de estoque (stock-in-boxes, decisão 4): forte (insuficiente, baixo) na
 * cor de erro; leve ("se necessário" quase no fim) neutro. Sem alerta, nada.
 */
export function SeloEstoque({ alerta }: { alerta: AlertaEstoque }) {
  const theme = useTheme();
  if (!alerta) return null;
  const forte = alertaForte(alerta);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: forte ? theme.statusPerdidaSoft : theme.surfaceMuted,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}>
      <ThemedText type="caption" style={{ color: forte ? theme.statusPerdida : theme.textSecondary, fontFamily: FAMILIA_TEXTO[600] }}>
        {textoAlertaEstoque(alerta)}
      </ThemedText>
    </View>
  );
}
