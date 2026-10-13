import { describe, expect, it } from 'vitest';

import { deveAplicarCorrecao } from './correcoes';

describe('deveAplicarCorrecao', () => {
  it('roda enquanto não houver a marca, e nunca mais depois dela', () => {
    expect(deveAplicarCorrecao(null)).toBe(true);
    expect(deveAplicarCorrecao('1')).toBe(false);
  });
});
