import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { FAMILIA_TEXTO, FAMILIA_TITULO } from '@/constants/fontes';
import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
  /** Algarismos de largura fixa, para horários e contagens ficarem alinhados. */
  numerico?: boolean;
};

export function ThemedText({ style, type = 'default', themeColor, numerico, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const corPadrao = type === 'link' || type === 'linkPrimary' ? theme.accent : theme[themeColor ?? 'text'];

  return (
    <Text
      style={[
        { color: themeColor ? theme[themeColor] : corPadrao },
        styles[type],
        numerico && styles.numerico,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  numerico: {
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontFamily: FAMILIA_TEXTO[500],
    fontSize: 13,
    lineHeight: 18,
  },
  small: {
    fontFamily: FAMILIA_TEXTO[500],
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: FAMILIA_TEXTO[700],
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: FAMILIA_TEXTO[500],
    fontSize: 16,
    lineHeight: 24,
  },
  display: {
    fontFamily: FAMILIA_TITULO[700],
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: FAMILIA_TITULO[700],
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: FAMILIA_TITULO[700],
    fontSize: 26,
    lineHeight: 30,
  },
  link: {
    fontFamily: FAMILIA_TEXTO[600],
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: FAMILIA_TEXTO[600],
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
