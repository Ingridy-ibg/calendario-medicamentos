import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { buscarDosePorId, inserirDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';
import type { Criticidade } from '@/db/schema';
import { confirmarDose } from '@/domain/adherence-history/resolucao';
import type { EsquemaDiario } from '@/domain/dose-scheduling/types';

import { adiarDoseViaNotificacao, fecharDosesVencidas, registrarEntregaDeNotificacao } from './resolucao-por-notificacao';

function criarDose(db: TestDb, criticidade: Criticidade = 'comum') {
  const medicamentoId = inserirMedicamento(db, {
    nome: criticidade === 'especial' ? 'Especial' : 'Comum',
    dosagem: '1 comprimido',
    criticidade,
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
  return { esquema, dose, criticidade };
}

describe('registrarEntregaDeNotificacao + fecharDosesVencidas (5.5)', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('agenda o próximo alarme a cada entrega até a 4ª, que não agenda mais nenhum', () => {
    const { dose } = criarDose(db);

    const e1 = registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 0));
    expect(e1).toEqual({
      notificacoesSemResposta: 1,
      proximaNotificacaoEm: new Date(2026, 0, 1, 8, 30),
      agendarProximoAlarme: true,
    });

    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 30));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 0));
    const e4 = registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 30));

    expect(e4.notificacoesSemResposta).toBe(4);
    expect(e4.agendarProximoAlarme).toBe(false);

    // A dose continua "aguardando" — a 4ª notificação ainda tem sua própria janela de aceite.
    expect(buscarDosePorId(db, dose.id)?.status).toBe('aguardando');
  });

  it('a dose só vira perdida quando a varredura roda depois do prazo da 4ª notificação vencer', () => {
    const { dose } = criarDose(db);
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 30));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 0));
    const e4 = registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 30));

    // Antes do prazo (10:00) vencer: a varredura não fecha nada.
    expect(fecharDosesVencidas(db, new Date(2026, 0, 1, 9, 59))).toEqual([]);
    expect(buscarDosePorId(db, dose.id)?.status).toBe('aguardando');

    // Uma resposta durante a janela da 4ª ainda é válida (não perdida) —
    // simulado à parte em adherence-history/resolucao.test.ts.

    const fechadas = fecharDosesVencidas(db, e4.proximaNotificacaoEm);
    expect(fechadas).toEqual([dose.id]);
    const resolvida = buscarDosePorId(db, dose.id);
    expect(resolvida?.status).toBe('perdida');
    // Nunca houve confirmação real do usuário — dataHoraRegistro permanece nulo.
    expect(resolvida?.dataHoraRegistro).toBeNull();
    expect(resolvida?.proximaNotificacaoEm).toBeNull();
  });

  it('uma resposta antes da varredura rodar impede a dose de virar perdida', () => {
    const { esquema, dose } = criarDose(db);
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 8, 30));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 0));
    registrarEntregaDeNotificacao(db, 'comum', dose.id, new Date(2026, 0, 1, 9, 30));

    // Usuário confirma na 4ª notificação, dentro da janela de 30 min dela.
    confirmarDose(db, esquema, dose.id, new Date(2026, 0, 1, 9, 45));

    // A varredura, mesmo rodando bem depois, não encontra mais nada a fechar.
    expect(fecharDosesVencidas(db, new Date(2026, 0, 1, 12, 0))).toEqual([]);
    expect(buscarDosePorId(db, dose.id)?.status).toBe('tomada_com_atraso');
  });
});

describe('adiar (5.6)', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('reagenda +30 min sem incrementar o contador, mesmo tocado repetidamente', () => {
    const { dose } = criarDose(db);

    let agora = new Date(2026, 0, 1, 8, 0);
    for (let i = 0; i < 5; i++) {
      const resultado = adiarDoseViaNotificacao(db, dose.id, agora);
      expect(resultado?.notificacoesSemResposta).toBe(0);
      agora = resultado!.proximaNotificacaoEm!;
    }

    expect(buscarDosePorId(db, dose.id)?.status).toBe('aguardando');
  });
});

describe('reenvio infinito do especial (5.7)', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('continua agendando após muitas entregas, sem nunca deixar de agendar nem virar perdida', () => {
    const { dose } = criarDose(db, 'especial');

    let ultimo;
    let agora = new Date(2026, 0, 1, 8, 0);
    for (let i = 0; i < 20; i++) {
      ultimo = registrarEntregaDeNotificacao(db, 'especial', dose.id, agora);
      expect(ultimo.agendarProximoAlarme).toBe(true);
      agora = ultimo.proximaNotificacaoEm;
    }
    expect(ultimo?.notificacoesSemResposta).toBe(20);

    expect(fecharDosesVencidas(db, agora)).toEqual([]);
    expect(buscarDosePorId(db, dose.id)?.status).not.toBe('perdida');
  });
});
