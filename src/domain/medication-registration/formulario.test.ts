import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';

import { paraDadosFormulario, paraValoresFormulario } from './formulario';
import { cadastrarMedicamento } from './registration';
import type { DadosFormularioMedicamento } from './types';

const comuns = { nome: 'X', dosagem: '1 un.', criticidade: 'comum' as const, quantidadeEmEstoque: 12, quantidadePorEmbalagem: 30 };

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
