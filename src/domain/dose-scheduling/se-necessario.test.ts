import { describe, expect, it } from 'vitest';

import { estadoLimiteSeNecessario, exigeConfirmacaoAoRegistrar, registrarDoseSeNecessario } from './se-necessario';
import type { EsquemaSeNecessario } from './types';

const esquema: EsquemaSeNecessario = {
  id: 'e1',
  medicamentoId: 'm1',
  tipo: 'SE_NECESSARIO',
  limiteDiario: 4,
};

describe('registrarDoseSeNecessario', () => {
  it('não avisa enquanto o total de hoje está abaixo do limite', () => {
    expect(registrarDoseSeNecessario(esquema, 0)).toEqual({ avisoLimiteExcedido: false });
    expect(registrarDoseSeNecessario(esquema, 2)).toEqual({ avisoLimiteExcedido: false });
  });

  it('avisa ao registrar a dose que ultrapassa o limite diário, mas não bloqueia', () => {
    // 4 já registradas hoje, limite é 4 — a 5ª ultrapassa.
    expect(registrarDoseSeNecessario(esquema, 4)).toEqual({ avisoLimiteExcedido: true });
  });
});

describe('estadoLimiteSeNecessario', () => {
  it('3/4 abaixo, 4/4 atingido, 5/4 acima', () => {
    expect(estadoLimiteSeNecessario(3, 4)).toBe('abaixo');
    expect(estadoLimiteSeNecessario(4, 4)).toBe('atingido');
    expect(estadoLimiteSeNecessario(5, 4)).toBe('acima');
  });

  it('limite 1', () => {
    expect(estadoLimiteSeNecessario(0, 1)).toBe('abaixo');
    expect(estadoLimiteSeNecessario(1, 1)).toBe('atingido');
    expect(estadoLimiteSeNecessario(2, 1)).toBe('acima');
  });

  it('pedir confirmação coincide com o aviso do registro', () => {
    for (const registradas of [0, 1, 3, 4, 5, 9]) {
      expect(exigeConfirmacaoAoRegistrar(registradas, esquema.limiteDiario)).toBe(
        registrarDoseSeNecessario(esquema, registradas).avisoLimiteExcedido,
      );
    }
  });
});
