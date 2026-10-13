import { describe, expect, it } from 'vitest';

import {
  chaveDaResposta,
  LIMITE_RESPOSTAS_LEMBRADAS,
  lerRespostasLembradas,
  registrarResposta,
} from './respostas-processadas';

describe('registrarResposta', () => {
  it('aceita uma resposta nova e a lembra', () => {
    const chave = chaveDaResposta('dose:1', 'adiar', 1000);
    const { jaProcessada, lembradas } = registrarResposta([], chave);
    expect(jaProcessada).toBe(false);
    expect(lembradas).toEqual([chave]);
  });

  it('barra a mesma resposta lida de novo', () => {
    const chave = chaveDaResposta('dose:1', 'adiar', 1000);
    const primeira = registrarResposta([], chave);
    expect(registrarResposta(primeira.lembradas, chave).jaProcessada).toBe(true);
  });

  it('trata o reenvio da mesma dose como resposta nova', () => {
    const primeira = registrarResposta([], chaveDaResposta('dose:1', 'adiar', 1000));
    const reenvio = registrarResposta(primeira.lembradas, chaveDaResposta('dose:1', 'adiar', 2000));
    expect(reenvio.jaProcessada).toBe(false);
  });

  it('esquece as mais antigas além do limite', () => {
    let lembradas: string[] = [];
    for (let i = 0; i <= LIMITE_RESPOSTAS_LEMBRADAS; i++) {
      lembradas = registrarResposta(lembradas, chaveDaResposta('dose:1', 'adiar', i)).lembradas;
    }
    expect(lembradas).toHaveLength(LIMITE_RESPOSTAS_LEMBRADAS);
    expect(lembradas).not.toContain(chaveDaResposta('dose:1', 'adiar', 0));
  });
});

describe('lerRespostasLembradas', () => {
  it('volta vazio para valor ausente ou corrompido', () => {
    expect(lerRespostasLembradas(null)).toEqual([]);
    expect(lerRespostasLembradas('{x')).toEqual([]);
    expect(lerRespostasLembradas('{"a":1}')).toEqual([]);
  });

  it('lê a lista gravada', () => {
    expect(lerRespostasLembradas('["a","b"]')).toEqual(['a', 'b']);
  });
});
