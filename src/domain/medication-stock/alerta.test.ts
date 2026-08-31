import { describe, expect, it } from 'vitest';

import { temAlertaDeRecompra } from './alerta';

describe('temAlertaDeRecompra', () => {
  it('ativa quando o estoque cai abaixo de uma embalagem completa', () => {
    expect(temAlertaDeRecompra(29, 30)).toBe(true);
    expect(temAlertaDeRecompra(0, 30)).toBe(true);
  });

  it('não ativa com uma embalagem completa ou mais em estoque', () => {
    expect(temAlertaDeRecompra(30, 30)).toBe(false);
    expect(temAlertaDeRecompra(60, 30)).toBe(false);
  });

  it('some assim que o estoque é reposto de volta para uma embalagem ou mais', () => {
    expect(temAlertaDeRecompra(2, 30)).toBe(true);
    expect(temAlertaDeRecompra(2 + 30, 30)).toBe(false);
  });
});
