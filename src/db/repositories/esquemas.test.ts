import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../create-test-db';
import { buscarEsquemaPorId, inserirEsquema } from './esquemas';
import { inserirMedicamento } from './medicamentos';

describe('repositório de esquemas', () => {
  let db: TestDb;
  let medicamentoId: string;

  beforeEach(() => {
    db = createTestDb();
    medicamentoId = inserirMedicamento(db, {
      nome: 'Medicamento de teste',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 10,
      quantidadePorEmbalagem: 10,
    }).id;
  });

  it('persiste um esquema DIARIO com seus horários e duração', () => {
    const inserido = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00', '20:00'],
      duracaoDias: 7,
    });

    const lido = buscarEsquemaPorId(db, inserido.id);

    expect(lido).toMatchObject({
      tipo: 'DIARIO',
      horarios: ['08:00', '20:00'],
      duracaoDias: 7,
      intervaloHoras: null,
      diasDaSemana: null,
      diasAtivos: null,
      diasPausa: null,
      limiteDiario: null,
    });
  });

  it('persiste um esquema INTERVALO_HORAS com o intervalo configurado', () => {
    const inserido = inserirEsquema(db, {
      tipo: 'INTERVALO_HORAS',
      medicamentoId,
      intervaloHoras: 8,
    });

    const lido = buscarEsquemaPorId(db, inserido.id);

    expect(lido).toMatchObject({
      tipo: 'INTERVALO_HORAS',
      intervaloHoras: 8,
      duracaoDias: null,
      horarios: null,
    });
  });

  it('persiste um esquema DIAS_SEMANA com os dias e horários configurados', () => {
    const inserido = inserirEsquema(db, {
      tipo: 'DIAS_SEMANA',
      medicamentoId,
      diasDaSemana: [1, 3, 5],
      horarios: ['09:00'],
    });

    const lido = buscarEsquemaPorId(db, inserido.id);

    expect(lido).toMatchObject({
      tipo: 'DIAS_SEMANA',
      diasDaSemana: [1, 3, 5],
      horarios: ['09:00'],
    });
  });

  it('persiste um esquema CICLICO com dias ativos/pausa e âncora do ciclo', () => {
    const dataInicioCiclo = new Date('2026-08-01T09:00:00.000Z');

    const inserido = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo,
      horarios: ['09:00'],
    });

    const lido = buscarEsquemaPorId(db, inserido.id);

    expect(lido).toMatchObject({
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['09:00'],
    });
    expect(lido?.dataInicioCiclo).toEqual(dataInicioCiclo);
  });

  it('persiste um esquema SE_NECESSARIO com o limite diário, sem horário/duração', () => {
    const inserido = inserirEsquema(db, {
      tipo: 'SE_NECESSARIO',
      medicamentoId,
      limiteDiario: 4,
    });

    const lido = buscarEsquemaPorId(db, inserido.id);

    expect(lido).toMatchObject({
      tipo: 'SE_NECESSARIO',
      limiteDiario: 4,
      horarios: null,
      duracaoDias: null,
    });
  });
});
