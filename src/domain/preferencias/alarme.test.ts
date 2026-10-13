import { describe, expect, it } from 'vitest';

import {
  gravarToqueAlarme,
  lerLigadoPorPadrao,
  lerTemaAlarme,
  lerToqueAlarme,
  resumoDoAlarme,
  TOQUE_PADRAO,
  toqueParaNativo,
} from './alarme';

describe('lerTemaAlarme', () => {
  it('ausente ou inválido vira Noite', () => {
    expect(lerTemaAlarme(null)).toBe('noite');
    expect(lerTemaAlarme('rosa')).toBe('noite');
  });

  it('lê os quatro temas', () => {
    for (const tema of ['noite', 'verde', 'claro', 'aurora']) expect(lerTemaAlarme(tema)).toBe(tema);
  });
});

describe('lerToqueAlarme', () => {
  it('ausente ou inválido vira Alvorada', () => {
    expect(lerToqueAlarme(null)).toEqual(TOQUE_PADRAO);
    expect(lerToqueAlarme('buzina')).toEqual(TOQUE_PADRAO);
    expect(lerToqueAlarme('{"uri":""}')).toEqual(TOQUE_PADRAO);
  });

  it('ida e volta de um toque do app e de um do aparelho', () => {
    const sino = { tipo: 'app', id: 'sino' } as const;
    const aparelho = { tipo: 'aparelho', uri: 'content://media/internal/audio/media/12', titulo: 'Galáxia' } as const;
    expect(lerToqueAlarme(gravarToqueAlarme(sino))).toEqual(sino);
    expect(lerToqueAlarme(gravarToqueAlarme(aparelho))).toEqual(aparelho);
  });

  it('converte para o formato do módulo nativo', () => {
    expect(toqueParaNativo({ tipo: 'app', id: 'marimba' })).toBe('marimba');
    expect(toqueParaNativo({ tipo: 'aparelho', uri: 'content://x', titulo: 'X' })).toBe('aparelho:content://x');
  });
});

describe('lerLigadoPorPadrao', () => {
  it('liga por padrão e só desliga com "0"', () => {
    expect(lerLigadoPorPadrao(null)).toBe(true);
    expect(lerLigadoPorPadrao('1')).toBe(true);
    expect(lerLigadoPorPadrao('0')).toBe(false);
  });
});

describe('resumoDoAlarme', () => {
  it('junta toque, tema e vibração', () => {
    expect(resumoDoAlarme({ tema: 'noite', toque: TOQUE_PADRAO, vibrar: true, crescente: true })).toBe(
      'Alvorada · Noite · vibração ligada',
    );
    expect(
      resumoDoAlarme({ tema: 'aurora', toque: { tipo: 'aparelho', uri: 'u', titulo: 'Galáxia' }, vibrar: false, crescente: true }),
    ).toBe('Galáxia · Aurora · sem vibração');
  });
});
