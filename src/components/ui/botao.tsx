import { type PressableProps, type StyleProp, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icone, type NomeIcone } from './icone';
import { Tocavel } from './tocavel';

export type VarianteBotao = 'primario' | 'secundario' | 'suave' | 'perigo';

const CORES: Record<VarianteBotao, { fundo: ThemeColor | null; texto: ThemeColor; borda: ThemeColor | null }> = {
  primario: { fundo: 'accent', texto: 'onAccent', borda: null },
  secundario: { fundo: 'surface', texto: 'text', borda: 'border' },
  suave: { fundo: 'accentSoft', texto: 'onAccentSoft', borda: null },
  perigo: { fundo: null, texto: 'statusPerdida', borda: 'statusPerdida' },
};

export interface BotaoProps extends Omit<PressableProps, 'style' | 'children'> {
  rotulo: string;
  variante?: VarianteBotao;
  /** `grande` (54) para a ação principal da tela; `medio` (44) para ações em itens. */
  tamanho?: 'medio' | 'grande';
  icone?: NomeIcone;
  iconeDepois?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Botao({
  rotulo,
  variante = 'primario',
  tamanho = 'medio',
  icone,
  iconeDepois,
  disabled,
  style,
  ...rest
}: BotaoProps) {
  const theme = useTheme();
  const cores = CORES[variante];
  const corTexto = disabled ? theme.textSecondary : theme[cores.texto];
  const elementoIcone = icone ? <Icone nome={icone} cor={corTexto} tamanho={18} /> : null;

  return (
    <Tocavel
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[
        {
          minHeight: tamanho === 'grande' ? 54 : 44,
          borderRadius: tamanho === 'grande' ? 16 : 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? theme.surfaceMuted : cores.fundo ? theme[cores.fundo] : 'transparent',
          borderWidth: cores.borda && !disabled ? 1.5 : 0,
          borderColor: cores.borda ? theme[cores.borda] : undefined,
        },
        style,
      ]}
      {...rest}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!iconeDepois && elementoIcone}
        <ThemedText type={tamanho === 'grande' ? 'default' : 'small'} style={{ color: corTexto, fontFamily: FAMILIA_TEXTO[700] }}>
          {rotulo}
        </ThemedText>
        {iconeDepois && elementoIcone}
      </View>
    </Tocavel>
  );
}
