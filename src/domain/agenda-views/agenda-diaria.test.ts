import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento, removerMedicamento } from '@/db/repositories/medicamentos';
import { materializarJanela } from '@/domain/dose-scheduling/janela-rolante';
import type { EsquemaCiclico, EsquemaDiario } from '@/domain/dose-scheduling/types';

import { montarAgendaDoDia } from './agenda-diaria';

const HOJE = new Date(2026, 7, 26, 7, 0); // 26/08/2026, quarta-feira

describe('montarAgendaDoDia', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('lista uma dose diária de hoje com seu status', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: HOJE,
    };
    materializarJanela(db, esquema, HOJE);

    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda).toHaveLength(1);
    expect(agenda[0]).toMatchObject({
      tipo: 'dose',
      nome: 'Losartana',
      status: 'pendente',
      horario: new Date(2026, 7, 26, 8, 0),
      posicaoCiclo: null,
    });
  });

  it('não lista uma dose de outro dia', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 27, 8, 0) });

    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('mostra a posição no ciclo para um medicamento cíclico com dose hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    const esquemaId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 7, 22), // dia 1
      horarios: ['08:00'],
    }).id;
    const esquema: EsquemaCiclico = {
      id: esquemaId,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: new Date(2026, 7, 22),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 22));

    // 26/08 é o 5º dia (22,23,24,25,26).
    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda[0]).toMatchObject({ tipo: 'dose', posicaoCiclo: { dia: 5, totalDiasAtivos: 21 } });
  });

  it('não lista nada para um cíclico em dia de pausa (sem dose para confirmar)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    const esquema: EsquemaCiclico = {
      id: inserirEsquema(db, {
        tipo: 'CICLICO',
        medicamentoId,
        diasAtivos: 21,
        diasPausa: 7,
        dataInicioCiclo: new Date(2026, 7, 1),
        horarios: ['08:00'],
      }).id,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: new Date(2026, 7, 1),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 1));

    // 1/8 + 21 dias ativos = pausa começa em 22/8; hoje (26/8) é pausa.
    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('mostra um "se necessário" com o progresso do limite diário, mesmo sem nenhuma dose hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 20,
      quantidadePorEmbalagem: 20,
    }).id;
    inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 4 });

    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda).toEqual([
      expect.objectContaining({
        tipo: 'se_necessario',
        nome: 'Analgésico',
        registradasHoje: 0,
        limiteDiario: 4,
      }),
    ]);
  });

  it('sinaliza alerta de estoque baixo junto ao item', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 5,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 26, 8, 0) });

    expect(montarAgendaDoDia(db, HOJE)[0]).toMatchObject({ alertaEstoque: true });
  });

  it('curso de duração fixa já encerrado não aparece na agenda de hoje (8.3)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Antibiótico',
      dosagem: '500mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 14,
      quantidadePorEmbalagem: 14,
    }).id;
    const esquemaId = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00'],
      duracaoDias: 7,
    }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: 7,
      dataInicio: new Date(2026, 7, 1),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 1));

    // Curso de 7 dias a partir de 1/8 termina em 7/8 — hoje (26/8) é bem depois.
    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('medicamento removido não aparece mesmo que ainda exista uma linha de dose para hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 26, 8, 0) });

    removerMedicamento(db, medicamentoId, HOJE);

    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });
});
