import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';

/** Arquivos carregados por `useFonts` no layout raiz (design.md, decisão 4). */
export const FONTES_DO_APP = {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
};

export type PesoTexto = 400 | 500 | 600 | 700;

/**
 * No React Native cada peso é um arquivo (e uma família) separado — usar
 * `fontWeight` com a família base faria o Android sintetizar o negrito.
 */
export const FAMILIA_TEXTO: Record<PesoTexto, string> = {
  400: 'Figtree_400Regular',
  500: 'Figtree_500Medium',
  600: 'Figtree_600SemiBold',
  700: 'Figtree_700Bold',
};

export const FAMILIA_TITULO: Record<500 | 700, string> = {
  500: 'BricolageGrotesque_500Medium',
  700: 'BricolageGrotesque_700Bold',
};
