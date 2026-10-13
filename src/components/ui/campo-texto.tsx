import type { ReactNode } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FAMILIA_TEXTO } from '@/constants/fontes';
import { useTheme } from '@/hooks/use-theme';

/** Rótulo + conteúdo + mensagem de erro, no padrão dos campos do formulário. */
export function Campo({ rotulo, erro, ajuda, children }: { rotulo: string; erro?: string; ajuda?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallBold">{rotulo}</ThemedText>
      {children}
      {erro ? (
        <ThemedText type="small" themeColor="statusPerdida" accessibilityRole="alert">
          {erro}
        </ThemedText>
      ) : ajuda ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {ajuda}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  style,
  ...rest
}: TextInputProps & { rotulo: string; erro?: string; ajuda?: string }) {
  const theme = useTheme();
  return (
    <Campo rotulo={rotulo} erro={erro} ajuda={ajuda}>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor={theme.textSecondary}
        style={[
          {
            minHeight: 48,
            borderRadius: 12,
            borderWidth: erro ? 2 : 1.5,
            borderColor: erro ? theme.statusPerdida : theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
            paddingHorizontal: 14,
            fontFamily: FAMILIA_TEXTO[500],
            fontSize: 16,
          },
          style,
        ]}
        {...rest}
      />
    </Campo>
  );
}
