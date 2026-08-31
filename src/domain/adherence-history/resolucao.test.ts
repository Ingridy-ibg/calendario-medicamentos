import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId, inserirMedicamento } from '@/db/repositories/medicamentos';
import { registrarEntregaDeNotificacao } from '@/domain/dose-notifications/resolucao-por-notificacao';
import type { EsquemaDiario } from '@/domain/dose-scheduling/types';

import { confirmarDose, pularDose } from './resolucao';

function criarDose(db: TestDb) {
  const medicamentoId = inserirMedicamento(db, {
    nome: 'Comum',
    dosagem: '1 comprimido',
    criticidade: 'comum',
    quantidadeEmEstoque: 100,
    quantidadePorEmbalagem: 100,
  }).id;
  const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
  const esquema: EsquemaDiario = {
    id: esquemaId,
    medicamentoId,
    tipo: 'DIARIO',
    horarios: ['08:00'],
    duracaoDias: null,
    dataInicio: new Date(2026, 0, 1),
  };
  const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 1, 8, 0) });
  return { esquema, dose, medicamentoId };
}

describe('confirmarDose', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('classifica como tomada quando confirmada antes de qualquer entrega de reenvio', () => {
    const { esquema, dose } = criarDose(db);
    const resolvida = confirmarDose(db, esquema, dose.id, new Date(2026, 0, 1, 8, 5));
    expect(resolvida.status).toBe('tomada');
    expect(resolvida.proximaNotificacaoEm).toBeNull();
  });

  it('decrementa o estoque do medicamento em uma unidade (specs/medication-stock)', () => {
    const { esquema, dose, medicamentoId } = criarDose(db);
    confirmarDose(db, esquema, dose.id, new Date(2026, 0, 1, 8, 5));
    expect(buscarMedicamentoPorId(db, medicamentoId)?.quantidadeEmEstoque).toBe(99);
  });

  it('classifica como tomada com atraso quando confirmada depois da 2ª notificação ter sido entregue', () => {
    const { esquema, dose } = criarDose(db);
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 30));

    const resolvida = confirmarDose(db, esquema, dose.id, new Date(2026, 0, 1, 8, 45));

    expect(resolvida.status).toBe('tomada_com_atraso');
  });

  it('tomando a dose na 4ª notificação: tomada com atraso, nunca perdida (specs/dose-notifications)', () => {
    const { esquema, dose } = criarDose(db);
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 30));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 30));

    const resolvida = confirmarDose(db, esquema, dose.id, new Date(2026, 0, 1, 9, 45));

    expect(resolvida.status).toBe('tomada_com_atraso');
  });
});

describe('pularDose', () => {
  it('marca a dose como pulada', () => {
    const db = createTestDb();
    const { esquema, dose } = criarDose(db);
    const resolvida = pularDose(db, esquema, dose.id, new Date(2026, 0, 1, 8, 10));
    expect(resolvida.status).toBe('pulada');
  });

  it('não decrementa o estoque — pular não é consumir', () => {
    const db = createTestDb();
    const { esquema, dose, medicamentoId } = criarDose(db);
    pularDose(db, esquema, dose.id, new Date(2026, 0, 1, 8, 10));
    expect(buscarMedicamentoPorId(db, medicamentoId)?.quantidadeEmEstoque).toBe(100);
  });
});
