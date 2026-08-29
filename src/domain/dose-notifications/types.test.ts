import { describe, expect, it } from 'vitest';

import { acoesDisponiveis, canalParaDose, CANAIS_NOTIFICACAO } from './types';

describe('acoesDisponiveis', () => {
  it('comum oferece as três ações', () => {
    expect(acoesDisponiveis('comum')).toEqual(['tomei_agora', 'adiar', 'nao_tomar']);
  });

  it('especial só oferece "tomei agora", sem pular e sem adiar', () => {
    expect(acoesDisponiveis('especial')).toEqual(['tomei_agora']);
  });
});

describe('canalParaDose', () => {
  it('usa o canal crítico para especial e o padrão para comum', () => {
    expect(canalParaDose('especial')).toBe(CANAIS_NOTIFICACAO.doseEspecialCritico);
    expect(canalParaDose('comum')).toBe(CANAIS_NOTIFICACAO.doseComum);
  });
});
