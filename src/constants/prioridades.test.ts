import { describe, expect, it } from 'vitest';

import { CRITICIDADES } from '@/db/schema';

import { CONTEUDO_PRIORIDADES } from './prioridades';

describe('CONTEUDO_PRIORIDADES', () => {
  it('tem conteúdo para toda prioridade, na ordem das opções do formulário', () => {
    expect(Object.keys(CONTEUDO_PRIORIDADES)).toEqual([...CRITICIDADES]);
  });

  it('nenhuma prioridade fica com título, descrição, exemplo ou pontos vazios', () => {
    for (const criticidade of CRITICIDADES) {
      const { titulo, descricao, exemplo, pontos } = CONTEUDO_PRIORIDADES[criticidade];
      expect(titulo.trim()).not.toBe('');
      expect(descricao.trim()).not.toBe('');
      expect(exemplo.trim()).not.toBe('');
      expect(pontos.length).toBeGreaterThan(0);
      for (const ponto of pontos) expect(ponto.trim()).not.toBe('');
    }
  });
});
