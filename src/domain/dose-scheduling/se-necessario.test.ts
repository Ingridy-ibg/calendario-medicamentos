import { describe, expect, it } from 'vitest';

import { registrarDoseSeNecessario } from './se-necessario';
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
