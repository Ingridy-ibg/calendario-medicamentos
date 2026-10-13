import { describe, expect, it } from 'vitest';

import { Colors, type ThemeColor } from './cores';

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG 2.x entre duas cores `#RRGGBB`. */
function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Todo par texto/fundo que as telas usam (specs/visual-identity: mínimo 4,5:1). */
const PARES: [texto: ThemeColor, fundo: ThemeColor][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceMuted'],
  ['accent', 'surface'],
  ['accent', 'background'],
  ['onAccent', 'accent'],
  ['onAccentSoft', 'accentSoft'],
  ['onInverse', 'inverseSurface'],
  ['onInverseSecondary', 'inverseSurface'],
  ['inverseTomada', 'inverseSurface'],
  ['statusTomada', 'surface'],
  ['statusAtraso', 'surface'],
  ['statusPerdida', 'surface'],
  ['statusNeutro', 'surface'],
  ['statusTomada', 'statusTomadaSoft'],
  ['statusAtraso', 'statusAtrasoSoft'],
  ['statusPerdida', 'statusPerdidaSoft'],
  ['statusNeutro', 'statusNeutroSoft'],
];

describe('contraste da paleta', () => {
  it('calcula a razão WCAG conhecida de preto sobre branco', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  for (const tema of ['light', 'dark'] as const) {
    for (const [texto, fundo] of PARES) {
      it(`${tema}: ${texto} sobre ${fundo} tem pelo menos 4,5:1`, () => {
        expect(contraste(Colors[tema][texto], Colors[tema][fundo])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
