import { describe, expect, it } from 'vitest';

import { paraCaixas, paraCamposDoFormulario, paraUnidades, textoEstoque } from './caixas';

describe('paraUnidades', () => {
  it('1 caixa fechada + 12 em uso, 30 por caixa → 42', () => {
    expect(paraUnidades({ caixasFechadas: 1, naCaixaEmUso: 12, porCaixa: 30 })).toBe(42);
  });
});

describe('paraCaixas / paraCamposDoFormulario', () => {
  it('42/30 conta 2 caixas, uma em uso com 12, e abre a edição como 1 + 12', () => {
    expect(paraCaixas(42, 30)).toEqual({ caixas: 2, emUso: 12 });
    expect(paraCamposDoFormulario(42, 30)).toEqual({ caixasFechadas: 1, naCaixaEmUso: 12 });
  });

  it('60/30 abre como 2 + 0', () => {
    expect(paraCaixas(60, 30)).toEqual({ caixas: 2, emUso: 30 });
    expect(paraCamposDoFormulario(60, 30)).toEqual({ caixasFechadas: 2, naCaixaEmUso: 0 });
  });
});

describe('textoEstoque', () => {
  it('uma caixa', () => {
    expect(textoEstoque(12, 30)).toBe('1 caixa · restam 12');
    expect(textoEstoque(1, 30)).toBe('1 caixa · resta 1');
    expect(textoEstoque(30, 30)).toBe('1 caixa');
  });

  it('várias caixas com uma em uso', () => {
    expect(textoEstoque(42, 30)).toBe('2 caixas · uma em uso com 12');
    expect(textoEstoque(72, 30)).toBe('3 caixas · uma em uso com 12');
  });

  it('todas cheias', () => {
    expect(textoEstoque(60, 30)).toBe('2 caixas');
  });

  it('zero unidades', () => {
    expect(textoEstoque(0, 30)).toBe('Acabou');
  });

  it('cíclico conta em cartelas', () => {
    expect(textoEstoque(30, 21, true)).toBe('2 cartelas · uma em uso com 9');
    expect(textoEstoque(9, 21, true)).toBe('1 cartela · restam 9');
  });
});
