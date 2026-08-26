import { describe, expect, it } from 'vitest';

import { validarCamposComuns, validarEsquema } from './validation';
import type { CamposComunsFormulario, DadosEsquemaFormulario } from './types';

const comunsValidos: CamposComunsFormulario = {
  nome: 'Losartana',
  dosagem: '50mg',
  criticidade: 'comum',
  quantidadeEmEstoque: 30,
  quantidadePorEmbalagem: 30,
};

describe('validarCamposComuns', () => {
  it('aceita campos comuns válidos', () => {
    expect(validarCamposComuns(comunsValidos)).toEqual({});
  });

  it('rejeita nome vazio', () => {
    expect(validarCamposComuns({ ...comunsValidos, nome: '  ' })).toHaveProperty('nome');
  });

  it('rejeita quantidade por embalagem ausente ou zero', () => {
    expect(validarCamposComuns({ ...comunsValidos, quantidadePorEmbalagem: 0 })).toHaveProperty(
      'quantidadePorEmbalagem',
    );
  });
});

describe('validarEsquema — DIARIO (4.2)', () => {
  it('exige ao menos um horário', () => {
    const esquema: DadosEsquemaFormulario = { tipo: 'DIARIO', horarios: [], duracao: { modo: 'continuo' } };
    expect(validarEsquema(esquema)).toHaveProperty('horarios');
  });

  it('aceita horários preenchidos e duração contínua ou em dias', () => {
    expect(
      validarEsquema({ tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } }),
    ).toEqual({});
    expect(
      validarEsquema({ tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 7 } }),
    ).toEqual({});
  });

  it('rejeita duração em dias inválida', () => {
    expect(
      validarEsquema({ tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 0 } }),
    ).toHaveProperty('duracao');
  });
});

describe('validarEsquema — INTERVALO_HORAS (4.3)', () => {
  it('rejeita intervalo ausente/inválido', () => {
    expect(
      validarEsquema({ tipo: 'INTERVALO_HORAS', intervaloHoras: 0, duracao: { modo: 'continuo' } }),
    ).toHaveProperty('intervaloHoras');
    expect(
      validarEsquema({ tipo: 'INTERVALO_HORAS', intervaloHoras: Number.NaN, duracao: { modo: 'continuo' } }),
    ).toHaveProperty('intervaloHoras');
  });

  it('aceita um intervalo válido', () => {
    expect(
      validarEsquema({ tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } }),
    ).toEqual({});
  });
});

describe('validarEsquema — DIAS_SEMANA (4.4)', () => {
  it('exige ao menos um dia e um horário', () => {
    expect(
      validarEsquema({ tipo: 'DIAS_SEMANA', diasDaSemana: [], horarios: ['09:00'], duracao: { modo: 'continuo' } }),
    ).toHaveProperty('diasDaSemana');
    expect(
      validarEsquema({ tipo: 'DIAS_SEMANA', diasDaSemana: [1], horarios: [], duracao: { modo: 'continuo' } }),
    ).toHaveProperty('horarios');
  });

  it('aceita dias e horários preenchidos', () => {
    expect(
      validarEsquema({
        tipo: 'DIAS_SEMANA',
        diasDaSemana: [1, 3, 5],
        horarios: ['09:00'],
        duracao: { modo: 'continuo' },
      }),
    ).toEqual({});
  });
});

describe('validarEsquema — CICLICO', () => {
  it('exige dias ativos, dias de pausa e horário', () => {
    expect(validarEsquema({ tipo: 'CICLICO', diasAtivos: 0, diasPausa: 7, horario: '08:00' })).toHaveProperty(
      'diasAtivos',
    );
    expect(validarEsquema({ tipo: 'CICLICO', diasAtivos: 21, diasPausa: 0, horario: '08:00' })).toHaveProperty(
      'diasPausa',
    );
    expect(validarEsquema({ tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '' })).toHaveProperty('horario');
  });

  it('aceita um ciclo 21/7 válido', () => {
    expect(validarEsquema({ tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '08:00' })).toEqual({});
  });
});

describe('validarEsquema — SE_NECESSARIO (4.6)', () => {
  it('exige apenas o limite diário — não há campo de horário/duração para validar', () => {
    expect(validarEsquema({ tipo: 'SE_NECESSARIO', limiteDiario: 0 })).toHaveProperty('limiteDiario');
    expect(validarEsquema({ tipo: 'SE_NECESSARIO', limiteDiario: 4 })).toEqual({});
  });
});
