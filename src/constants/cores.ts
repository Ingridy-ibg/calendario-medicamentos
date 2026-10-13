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

/**
 * Cores próprias da tela de saudação (add-daily-greeting). A ilustração muda
 * por período; no tema escuro, manhã e tarde usam o fundo escuro e só trocam
 * o astro (specs/daily-greeting, "Visual por período").
 */
export interface PaletaSaudacao {
  fundo: string;
  texto: string;
  secundario: string;
  cartao: string;
  astro: string;
  halo: string;
  iconeFundo: string;
  iconeTexto: string;
}

const NOITE: PaletaSaudacao = {
  fundo: '#0E1412',
  texto: '#E8EEEB',
  secundario: '#9DABA5',
  cartao: '#18211E',
  astro: '#E8EEEB',
  halo: '#1B2622',
  iconeFundo: '#173A32',
  iconeTexto: '#7FE0C6',
};

export const PALETAS_SAUDACAO = {
  light: {
    manha: {
      fundo: '#F6EFE2',
      texto: '#2A2116',
      secundario: '#6B5A43',
      cartao: '#FFFFFF',
      astro: '#E9A23B',
      halo: '#F2D9A8',
      iconeFundo: '#FBE7C4',
      iconeTexto: '#8A5A12',
    },
    tarde: {
      fundo: '#E9F2EE',
      texto: '#15211D',
      secundario: '#4A5550',
      cartao: '#FFFFFF',
      astro: '#0E6B58',
      halo: '#CBE7DF',
      iconeFundo: '#DDEFE9',
      iconeTexto: '#0E6B58',
    },
    noite: NOITE,
  },
  dark: {
    manha: { ...NOITE, astro: '#E9A23B', halo: '#2A2416', iconeFundo: '#3A2A14', iconeTexto: '#F2B46B' },
    tarde: { ...NOITE, astro: '#3FB89A', halo: '#173A32' },
    noite: NOITE,
  },
} satisfies Record<'light' | 'dark', Record<'manha' | 'tarde' | 'noite', PaletaSaudacao>>;
