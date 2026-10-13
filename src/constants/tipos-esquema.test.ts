import { describe, expect, it } from 'vitest';

import { TIPOS_ESQUEMA } from '@/db/schema';

import { CONTEUDO_TIPOS_ESQUEMA } from './tipos-esquema';

describe('CONTEUDO_TIPOS_ESQUEMA', () => {
  it('tem conteúdo para todo tipo, na ordem dos chips do formulário', () => {
    expect(Object.keys(CONTEUDO_TIPOS_ESQUEMA)).toEqual([...TIPOS_ESQUEMA]);
  });

  it('nenhum tipo fica com título, descrição, exemplo ou pontos vazios', () => {
    for (const tipo of TIPOS_ESQUEMA) {
      const { titulo, descricao, exemplo, pontos } = CONTEUDO_TIPOS_ESQUEMA[tipo];
      expect(titulo.trim()).not.toBe('');
      expect(descricao.trim()).not.toBe('');
      expect(exemplo.trim()).not.toBe('');
      expect(pontos.length).toBeGreaterThan(0);
      for (const ponto of pontos) expect(ponto.trim()).not.toBe('');
    }
  });
});
