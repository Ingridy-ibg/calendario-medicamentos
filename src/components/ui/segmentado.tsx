import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface OpcaoSegmentado<T extends string> {
  valor: T;
  rotulo: string;
}

/** Controle segmentado (ex.: "Uso contínuo" / "Nº de dias"). */
export function Segmentado<T extends string>({
  opcoes,
  selecionado,
  onSelecionar,
}: {
  opcoes: readonly OpcaoSegmentado<T>[];
  selecionado: T;
  onSelecionar: (valor: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: theme.surfaceMuted }}>
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === selecionado;
        return (
          <Pressable
            key={opcao.valor}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            onPress={() => onSelecionar(opcao.valor)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ativo ? theme.surface : 'transparent',
              elevation: ativo ? 1 : 0,
            }}>
            <ThemedText type="smallBold" themeColor={ativo ? 'text' : 'textSecondary'}>
              {opcao.rotulo}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
