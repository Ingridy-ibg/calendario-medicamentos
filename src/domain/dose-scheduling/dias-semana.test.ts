import { describe, expect, it } from 'vitest';

import { gerarDosesDiasSemana } from './dias-semana';
import type { EsquemaDiasSemana } from './types';

function criarEsquema(overrides: Partial<EsquemaDiasSemana> = {}): EsquemaDiasSemana {
  return {
    id: 'e1',
    medicamentoId: 'm1',
    tipo: 'DIAS_SEMANA',
    diasDaSemana: [1, 3, 5], // segunda, quarta, sexta
    horarios: ['09:00'],
    duracaoDias: null,
    dataInicio: new Date(2026, 0, 1),
    ...overrides,
  };
}

describe('gerarDosesDiasSemana', () => {
  it('gera dose apenas nos dias da semana configurados', () => {
    const esquema = criarEsquema();

    // 2026-08-24 é uma segunda-feira: seg 24, ter 25, qua 26, qui 27, sex 28, sáb 29, dom 30.
    const doses = gerarDosesDiasSemana(esquema, new Date(2026, 7, 24), new Date(2026, 7, 30));

    expect(doses).toEqual([
      { dataHoraPrevista: new Date(2026, 7, 24, 9, 0) }, // segunda
      { dataHoraPrevista: new Date(2026, 7, 26, 9, 0) }, // quarta
      { dataHoraPrevista: new Date(2026, 7, 28, 9, 0) }, // sexta
    ]);
  });

  it('não gera nenhuma dose para dias fora da lista configurada', () => {
    const esquema = criarEsquema({ diasDaSemana: [1, 3, 5] });

    // terça (25) e quinta (27) não estão na lista.
    const dosesTerca = gerarDosesDiasSemana(esquema, new Date(2026, 7, 25), new Date(2026, 7, 25));
    const dosesQuinta = gerarDosesDiasSemana(esquema, new Date(2026, 7, 27), new Date(2026, 7, 27));

    expect(dosesTerca).toEqual([]);
    expect(dosesQuinta).toEqual([]);
  });

  it('respeita a duração fixa dentro dos dias configurados', () => {
    const esquema = criarEsquema({
      diasDaSemana: [1, 3, 5],
      dataInicio: new Date(2026, 7, 24), // segunda
      duracaoDias: 3, // cobre seg(24), ter(25), qua(26)
    });

    const doses = gerarDosesDiasSemana(esquema, new Date(2026, 7, 24), new Date(2026, 7, 28));

    // Só segunda(24) e quarta(26) caem dentro da duração E na lista de dias.
    expect(doses).toEqual([
      { dataHoraPrevista: new Date(2026, 7, 24, 9, 0) },
      { dataHoraPrevista: new Date(2026, 7, 26, 9, 0) },
    ]);
  });
});
