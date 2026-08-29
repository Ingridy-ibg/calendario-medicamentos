import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';
import { identificadorDose, identificadorPausaCiclo } from '@/domain/dose-notifications/reconciliador';

import { buscarContextoDaDose, listarAlvosDesejados } from './contexto';

describe('listarAlvosDesejados', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('inclui uma dose pendente com notificações ativas', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    const alvos = listarAlvosDesejados(db, new Date(2026, 0, 5));

    expect(alvos).toContainEqual({
      identifier: identificadorDose(dose.id),
      tipo: 'dose',
      dataHora: new Date(2026, 0, 10, 8, 0),
    });
  });

  it('exclui doses de medicamento com notificações desativadas', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Vitamina D',
      dosagem: '1 cápsula',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
      notificacoesAtivas: false,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    expect(listarAlvosDesejados(db, new Date(2026, 0, 5))).toEqual([]);
  });

  it('inclui lembretes de pausa de um cíclico mesmo sem nenhuma dose ativa pendente no momento', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    // 21 ativos + 7 pausa a partir de 2026-01-01: pausa é 22..28/01. Sem doses
    // pendentes (todas já resolvidas), mas a pausa ainda deve ser lembrada.
    inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 0, 1),
      horarios: ['08:00'],
    });

    const alvos = listarAlvosDesejados(db, new Date(2026, 0, 22));

    expect(alvos.some((a) => a.identifier === identificadorPausaCiclo('e-inexistente', '2026-01-22'))).toBe(false);
    expect(alvos.some((a) => a.tipo === 'pausa-ciclo')).toBe(true);
  });

  it('nunca inclui doses "se necessário" (nunca têm proximaNotificacaoEm)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 20,
      quantidadePorEmbalagem: 20,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 3 }).id;
    inserirDose(db, { esquemaId, status: 'tomada' });

    expect(listarAlvosDesejados(db, new Date(2026, 0, 5))).toEqual([]);
  });
});

describe('buscarContextoDaDose', () => {
  it('retorna o esquema de domínio e o medicamento dono da dose', () => {
    const db = createTestDb();
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Metformina',
      dosagem: '850mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 60,
      quantidadePorEmbalagem: 60,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00', '20:00'] }).id;
    const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    const contexto = buscarContextoDaDose(db, dose.id);

    expect(contexto?.esquema.tipo).toBe('DIARIO');
    expect(contexto?.medicamento.nome).toBe('Metformina');
  });

  it('retorna null para uma dose inexistente', () => {
    const db = createTestDb();
    expect(buscarContextoDaDose(db, 'não-existe')).toBeNull();
  });
});
