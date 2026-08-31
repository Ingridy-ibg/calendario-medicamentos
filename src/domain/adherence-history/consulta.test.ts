import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose, listarDosesPorEsquema } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';
import {
  cadastrarMedicamento,
  editarEsquema,
  removerMedicamentoComHistorico,
} from '@/domain/medication-registration/registration';

import { confirmarDose } from './resolucao';
import { listarHistoricoPorMedicamento } from './consulta';

describe('listarHistoricoPorMedicamento', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('retorna as doses já resolvidas, ordenadas da mais antiga para a mais recente', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00', '20:00'] }).id;

    const doseTarde = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 20, 0) });
    const doseCedo = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 11, 8, 0) }); // ainda pendente

    const esquema = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO' as const,
      horarios: ['08:00', '20:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 0, 10),
    };
    confirmarDose(db, esquema, doseTarde.id, new Date(2026, 0, 10, 20, 5));
    confirmarDose(db, esquema, doseCedo.id, new Date(2026, 0, 10, 8, 2));

    const historico = listarHistoricoPorMedicamento(db, { medicamentoId });

    expect(historico.map((d) => d.id)).toEqual([doseCedo.id, doseTarde.id]);
  });

  it('filtra por intervalo de datas', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Metformina',
      dosagem: '850mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 60,
      quantidadePorEmbalagem: 60,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const esquema = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO' as const,
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 0, 1),
    };

    const doseJaneiro = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 5, 8, 0) });
    const doseFevereiro = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 1, 5, 8, 0) });
    confirmarDose(db, esquema, doseJaneiro.id, new Date(2026, 0, 5, 8, 1));
    confirmarDose(db, esquema, doseFevereiro.id, new Date(2026, 1, 5, 8, 1));

    const historico = listarHistoricoPorMedicamento(db, {
      medicamentoId,
      de: new Date(2026, 1, 1),
      ate: new Date(2026, 1, 28),
    });

    expect(historico.map((d) => d.id)).toEqual([doseFevereiro.id]);
  });

  it('sobrevive à remoção do medicamento', () => {
    const { medicamento, esquema: esquemaRow } = cadastrarMedicamento(
      db,
      {
        comuns: {
          nome: 'Vitamina D',
          dosagem: '1 cápsula',
          criticidade: 'comum',
          quantidadeEmEstoque: 30,
          quantidadePorEmbalagem: 30,
        },
        esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } },
      },
      new Date(2026, 0, 1),
    );
    const [dose] = listarDosesPorEsquema(db, esquemaRow.id);
    const esquemaDominio = {
      id: esquemaRow.id,
      medicamentoId: medicamento.id,
      tipo: 'DIARIO' as const,
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 0, 1),
    };
    confirmarDose(db, esquemaDominio, dose.id, new Date(2026, 0, 1, 8, 3));

    const historicoAntes = listarHistoricoPorMedicamento(db, { medicamentoId: medicamento.id });
    expect(historicoAntes).toHaveLength(1);

    removerMedicamentoComHistorico(db, medicamento.id, new Date(2026, 0, 2));

    const historicoDepois = listarHistoricoPorMedicamento(db, { medicamentoId: medicamento.id });
    expect(historicoDepois).toEqual(historicoAntes);
  });

  it('sobrevive a uma edição de esquema', () => {
    const { medicamento, esquema: esquemaRow } = cadastrarMedicamento(
      db,
      {
        comuns: {
          nome: 'Ibuprofeno',
          dosagem: '400mg',
          criticidade: 'comum',
          quantidadeEmEstoque: 20,
          quantidadePorEmbalagem: 20,
        },
        esquema: { tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } },
      },
      new Date(2026, 0, 1, 8, 0),
    );
    const [dose] = listarDosesPorEsquema(db, esquemaRow.id);
    const esquemaDominio = {
      id: esquemaRow.id,
      medicamentoId: medicamento.id,
      tipo: 'INTERVALO_HORAS' as const,
      intervaloHoras: 8,
      duracaoDias: null,
      dataInicio: new Date(2026, 0, 1, 8, 0),
    };
    confirmarDose(db, esquemaDominio, dose.id, new Date(2026, 0, 1, 8, 5));

    const historicoAntes = listarHistoricoPorMedicamento(db, { medicamentoId: medicamento.id });

    editarEsquema(
      db,
      esquemaRow.id,
      { tipo: 'INTERVALO_HORAS', intervaloHoras: 6, duracao: { modo: 'continuo' } },
      new Date(2026, 0, 2),
    );

    const historicoDepois = listarHistoricoPorMedicamento(db, { medicamentoId: medicamento.id });
    expect(historicoDepois).toEqual(historicoAntes);
  });
});
