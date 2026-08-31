import { describe, expect, it } from 'vitest';

import { classificarResposta } from './classificacao';

describe('classificarResposta', () => {
  it('tomada quando confirmada antes de qualquer reenvio (0 ou 1 notificação entregue)', () => {
    expect(classificarResposta(0)).toBe('tomada');
    expect(classificarResposta(1)).toBe('tomada');
  });

  it('tomada com atraso quando confirmada depois de ao menos um reenvio já ter disparado', () => {
    expect(classificarResposta(2)).toBe('tomada_com_atraso');
    expect(classificarResposta(4)).toBe('tomada_com_atraso');
  });
});
