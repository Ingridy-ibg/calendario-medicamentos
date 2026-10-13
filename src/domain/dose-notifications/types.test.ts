import { describe, expect, it } from 'vitest';

import { acoesDisponiveis, CANAIS_NOTIFICACAO, CANAIS_REMOVIDOS, VIBRACAO_DOSE_COMUM } from './types';

describe('acoesDisponiveis', () => {
  it('comum oferece as três ações', () => {
    expect(acoesDisponiveis('comum')).toEqual(['tomei_agora', 'adiar', 'nao_tomar']);
  });

  it('especial só oferece "tomei agora", sem pular e sem adiar', () => {
    expect(acoesDisponiveis('especial')).toEqual(['tomei_agora']);
  });
});

describe('CANAIS_NOTIFICACAO', () => {
  it('não reaproveita o id de um canal removido (canais do Android não mudam depois de criados)', () => {
    const ativos: string[] = Object.values(CANAIS_NOTIFICACAO);
    expect(CANAIS_REMOVIDOS.filter((id) => ativos.includes(id))).toEqual([]);
  });

  it('a dose comum vibra em quatro pulsos', () => {
    const pulsos = VIBRACAO_DOSE_COMUM.filter((_, i) => i % 2 === 1);
    expect(pulsos).toHaveLength(4);
  });
});
