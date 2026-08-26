import { describe, expect, it } from 'vitest';

import { gerarDosesDiario } from './diario';
import type { EsquemaDiario } from './types';

function criarEsquema(overrides: Partial<EsquemaDiario> = {}): EsquemaDiario {
  return {
    id: 'e1',
    medicamentoId: 'm1',
    tipo: 'DIARIO',
    horarios: ['08:00', '20:00'],
    duracaoDias: null,
    dataInicio: new Date(2026, 0, 1),
    ...overrides,
  };
}

describe('gerarDosesDiario', () => {
  it('gera um horário fixo para cada horário configurado no dia', () => {
    const esquema = criarEsquema();
    const dia = new Date(2026, 7, 26);

    const doses = gerarDosesDiario(esquema, dia, dia);

    expect(doses).toEqual([
      { dataHoraPrevista: new Date(2026, 7, 26, 8, 0) },
      { dataHoraPrevista: new Date(2026, 7, 26, 20, 0) },
    ]);
  });

  it('mantém os horários independentes entre si — confirmar um atrasado não desloca o outro', () => {
    const esquema = criarEsquema();
    const dia = new Date(2026, 7, 26);

    // gerarDosesDiario não recebe nenhuma informação de confirmação — é
    // puramente uma função do esquema e da janela de datas. Regerar a mesma
    // janela sempre produz exatamente a mesma grade fixa, independentemente
    // de quando (ou se) a dose das 8h foi confirmada.
    const primeiraGeracao = gerarDosesDiario(esquema, dia, dia);
    const segundaGeracao = gerarDosesDiario(esquema, dia, dia);

    expect(segundaGeracao).toEqual(primeiraGeracao);
    expect(segundaGeracao[1]).toEqual({ dataHoraPrevista: new Date(2026, 7, 26, 20, 0) });
  });

  it('gera doses para cada dia da janela [de, ate]', () => {
    const esquema = criarEsquema({ horarios: ['08:00'] });

    const doses = gerarDosesDiario(esquema, new Date(2026, 7, 26), new Date(2026, 7, 28));

    expect(doses).toEqual([
      { dataHoraPrevista: new Date(2026, 7, 26, 8, 0) },
      { dataHoraPrevista: new Date(2026, 7, 27, 8, 0) },
      { dataHoraPrevista: new Date(2026, 7, 28, 8, 0) },
    ]);
  });

  it('para de gerar doses após o fim da duração fixa', () => {
    const esquema = criarEsquema({
      horarios: ['08:00'],
      dataInicio: new Date(2026, 7, 20),
      duracaoDias: 7,
    });

    // Dia 7 (20..26) ainda gera; dia 8 (27) não.
    const doses = gerarDosesDiario(esquema, new Date(2026, 7, 26), new Date(2026, 7, 27));

    expect(doses).toEqual([{ dataHoraPrevista: new Date(2026, 7, 26, 8, 0) }]);
  });

  it('esquema contínuo (duracaoDias null) nunca para de gerar doses', () => {
    const esquema = criarEsquema({ horarios: ['08:00'], duracaoDias: null });

    const doses = gerarDosesDiario(esquema, new Date(2027, 11, 31), new Date(2027, 11, 31));

    expect(doses).toEqual([{ dataHoraPrevista: new Date(2027, 11, 31, 8, 0) }]);
  });
});
