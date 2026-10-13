import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';

import { paraDadosFormulario, paraValoresFormulario, VALORES_INICIAIS } from './formulario';
import { cadastrarMedicamento } from './registration';
import type { DadosFormularioMedicamento } from './types';
import { validarCamposComuns } from './validation';

const comuns = {
  nome: 'X',
  dosagem: '1 un.',
  criticidade: 'comum' as const,
  quantidadeEmEstoque: 42,
  quantidadePorEmbalagem: 30,
  emCaixas: { caixasFechadas: 1, naCaixaEmUso: 12 },
};

const casos: [string, DadosFormularioMedicamento][] = [
  ['diário', { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } } }],
  ['intervalo', { comuns, esquema: { tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'dias', dias: 5 } } }],
  [
    'dias da semana',
    { comuns, esquema: { tipo: 'DIAS_SEMANA', diasDaSemana: [1, 3, 5], horarios: ['14:00'], duracao: { modo: 'continuo' } } },
  ],
  ['cíclico', { comuns: { ...comuns, criticidade: 'especial' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' } }],
  ['se necessário', { comuns, esquema: { tipo: 'SE_NECESSARIO', limiteDiario: 4 } }],
];

describe('paraValoresFormulario', () => {
  it.each(casos)('%s: abrir para editar e salvar sem mudar devolve os mesmos dados', (_, dados) => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados, new Date(2026, 9, 12, 7));
    const valores = paraValoresFormulario(buscarMedicamentoPorId(db, medicamento.id)!, buscarEsquemaPorId(db, esquema.id)!);
    expect(paraDadosFormulario(valores)).toEqual(dados);
  });
});

describe('estoque em caixas', () => {
  it('42 unidades com 30 por caixa abre como 1 fechada + 12 em uso e volta a 42', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, casos[0][1], new Date(2026, 9, 12, 7));
    const valores = paraValoresFormulario(buscarMedicamentoPorId(db, medicamento.id)!, buscarEsquemaPorId(db, esquema.id)!);
    expect(valores).toMatchObject({ caixasFechadas: '1', naCaixaEmUso: '12', quantidadePorEmbalagem: '30' });
    expect(paraDadosFormulario(valores).comuns.quantidadeEmEstoque).toBe(42);
  });

  it('"Na caixa em uso" vazio conta como 0', () => {
    const dados = paraDadosFormulario({ ...VALORES_INICIAIS, caixasFechadas: '2', quantidadePorEmbalagem: '30' });
    expect(dados.comuns.quantidadeEmEstoque).toBe(60);
    expect(validarCamposComuns(dados.comuns)).toEqual({ nome: expect.any(String), dosagem: expect.any(String) });
  });

  it('35 na caixa em uso com 30 por caixa é erro no campo da caixa em uso', () => {
    const dados = paraDadosFormulario({ ...VALORES_INICIAIS, nome: 'X', dosagem: '1', caixasFechadas: '0', naCaixaEmUso: '35', quantidadePorEmbalagem: '30' });
    expect(Object.keys(validarCamposComuns(dados.comuns))).toEqual(['naCaixaEmUso']);
  });

  it('"Caixas fechadas" vazio é erro', () => {
    const dados = paraDadosFormulario({ ...VALORES_INICIAIS, nome: 'X', dosagem: '1', quantidadePorEmbalagem: '30' });
    expect(Object.keys(validarCamposComuns(dados.comuns))).toEqual(['caixasFechadas']);
  });
});
