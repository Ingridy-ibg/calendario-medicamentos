/**
 * Identidade visual do app (canvas "Calendário de Medicamentos — Telas").
 * Toda cor das telas sai daqui via `useTheme()`; classes NativeWind ficam só
 * para layout. Os pares texto/fundo são verificados em `cores.test.ts`.
 */
export const Colors = {
  light: {
    background: '#F3F5F2',
    surface: '#FFFFFF',
    surfaceMuted: '#ECEFED',
    text: '#15211D',
    textSecondary: '#5B6661',
    border: '#CBD3CF',
    divider: '#ECEFED',
    accent: '#0E6B58',
    onAccent: '#FFFFFF',
    accentSoft: '#DDEFE9',
    onAccentSoft: '#0A5446',
    inverseSurface: '#15211D',
    onInverse: '#FFFFFF',
    onInverseSecondary: '#C9D6D1',
    inverseTrack: '#3A4A44',
    inverseTomada: '#5FD3B5',
    inverseAtraso: '#F2B46B',
    statusTomada: '#0E6B58',
    statusTomadaSoft: '#DDEFE9',
    statusAtraso: '#9A4A06',
    statusAtrasoSoft: '#FCEBD6',
    statusPerdida: '#B42318',
    statusPerdidaSoft: '#FDE7E4',
    statusNeutro: '#5B6661',
    statusNeutroSoft: '#ECEFED',
  },
  dark: {
    background: '#0E1412',
    surface: '#18211E',
    surfaceMuted: '#222D29',
    text: '#E8EEEB',
    textSecondary: '#9DABA5',
    border: '#34413C',
    divider: '#24302C',
    accent: '#3FB89A',
    onAccent: '#0B1F1A',
    accentSoft: '#173A32',
    onAccentSoft: '#7FE0C6',
    inverseSurface: '#22302B',
    onInverse: '#FFFFFF',
    onInverseSecondary: '#C9D6D1',
    inverseTrack: '#3C4D47',
    inverseTomada: '#5FD3B5',
    inverseAtraso: '#F2B46B',
    statusTomada: '#5FD3B5',
    statusTomadaSoft: '#173A32',
    statusAtraso: '#F2B46B',
    statusAtrasoSoft: '#3A2A14',
    statusPerdida: '#FF8A7A',
    statusPerdidaSoft: '#3D1C18',
    statusNeutro: '#9DABA5',
    statusNeutroSoft: '#222D29',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Tema = (typeof Colors)[keyof typeof Colors];
