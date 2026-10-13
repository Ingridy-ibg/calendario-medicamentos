import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Bloco de conteúdo arredondado na cor de superfície (canvas: cartões brancos). */
export function Cartao({
  style,
  fundo = 'surface',
  ...rest
}: ViewProps & { fundo?: ThemeColor }) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[fundo], borderRadius: 22, padding: 18, gap: 12 }, style]} {...rest} />;
}
