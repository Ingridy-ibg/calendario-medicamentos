import { ThemedText } from '@/components/themed-text';
import { FAMILIA_TEXTO } from '@/constants/fontes';

/** Rótulo de seção em caixa alta (ex.: "MANHÃ", "ESTOQUE"). */
export function CabecalhoSecao({ children }: { children: string }) {
  return (
    <ThemedText
      accessibilityRole="header"
      themeColor="textSecondary"
      style={{ fontFamily: FAMILIA_TEXTO[700], fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
      {children}
    </ThemedText>
  );
}
