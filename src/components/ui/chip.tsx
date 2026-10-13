import { Pressable, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Opção selecionável em forma de pílula (tipos de esquema, dias da semana). */
export function Chip({
  rotulo,
  selecionado,
  disabled,
  ...rest
}: Omit<PressableProps, 'children' | 'style'> & { rotulo: string; selecionado: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado, disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 999,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: selecionado ? theme.inverseSurface : theme.border,
        backgroundColor: selecionado ? theme.inverseSurface : theme.surface,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: selecionado ? theme.onInverse : theme.text }}>
        {rotulo}
      </ThemedText>
    </Pressable>
  );
}
