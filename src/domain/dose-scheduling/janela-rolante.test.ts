import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';

import { materializarJanela, SEMANAS_JANELA_MAXIMA } from './janela-rolante';
import type { Esquema } from './types';

describe('materializarJanela', () => {
  let db: TestDb;
  let medicamentoId: string;

  beforeEach(() => {
    db = createTestDb();
    medicamentoId = inserirMedicamento(db, {
      nome: 'Medicamento de teste',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 100,
      quantidadePorEmbalagem: 100,
    }).id;
  });

  it('preenche a janela corretamente ao criar um esquema DIARIO', () => {
    const esquemaId = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00', '20:00'],
    }).id;
    const hoje = new Date(2026, 7, 26);

    const esquema: Esquema = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00', '20:00'],
      duracaoDias: null,
      dataInicio: hoje,
    };

    const inseridas = materializarJanela(db, esquema, hoje);

    // 4 semanas = 29 dias (hoje + 28), 2 horários por dia.
    const diasNaJanela = 7 * SEMANAS_JANELA_MAXIMA + 1;
    expect(inseridas).toHaveLength(diasNaJanela * 2);
    expect(listarDosesPorEsquema(db, esquemaId)).toHaveLength(diasNaJanela * 2);
  });

  it('reajusta a janela ao editar o esquema, sem apagar uma dose já registrada', () => {
    const esquemaId = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00'],
    }).id;
    const hoje = new Date(2026, 7, 26);
    const esquemaOriginal: Esquema = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: hoje,
    };

    const primeiraMaterializacao = materializarJanela(db, esquemaOriginal, hoje);
    const doseDeHoje = primeiraMaterializacao.find(
      (dose) => dose.dataHoraPrevista?.getTime() === new Date(2026, 7, 26, 8, 0).getTime(),
    )!;
    resolverDose(db, doseDeHoje.id, { status: 'tomada', dataHoraRegistro: new Date(2026, 7, 26, 8, 5) });

    // Edição: horário passa de 08:00 para 09:00.
    const esquemaEditado: Esquema = { ...esquemaOriginal, horarios: ['09:00'] };
    materializarJanela(db, esquemaEditado, hoje);

    const dosesFinais = listarDosesPorEsquema(db, esquemaId);

    // A dose de hoje já tomada continua intacta, no horário antigo.
    const doseTomada = dosesFinais.find((dose) => dose.id === doseDeHoje.id);
    expect(doseTomada).toMatchObject({ status: 'tomada' });
    expect(doseTomada?.dataHoraPrevista).toEqual(new Date(2026, 7, 26, 8, 0));

    // As demais doses futuras foram regeneradas para o novo horário (09:00), não o antigo (08:00).
    const dosesFuturasPendentes = dosesFinais.filter((dose) => dose.id !== doseDeHoje.id);
    expect(dosesFuturasPendentes.length).toBeGreaterThan(0);
    for (const dose of dosesFuturasPendentes) {
      expect(dose.dataHoraPrevista?.getHours()).toBe(9);
    }
  });

  it('não materializa nada para um esquema CICLICO em espera (SE_NECESSARIO também não gera linhas)', () => {
    const esquemaCiclicoId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 7, 26),
      horarios: ['08:00'],
    }).id;
    const esquemaSeNecessarioId = inserirEsquema(db, {
      tipo: 'SE_NECESSARIO',
      medicamentoId,
      limiteDiario: 4,
    }).id;
    const hoje = new Date(2026, 7, 26);

    const esquemaCiclicoEmEspera: Esquema = {
      id: esquemaCiclicoId,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: null,
    };
    const esquemaSeNecessario: Esquema = {
      id: esquemaSeNecessarioId,
      medicamentoId,
      tipo: 'SE_NECESSARIO',
      limiteDiario: 4,
    };

    expect(materializarJanela(db, esquemaCiclicoEmEspera, hoje)).toEqual([]);
    expect(materializarJanela(db, esquemaSeNecessario, hoje)).toEqual([]);
    expect(listarDosesPorEsquema(db, esquemaCiclicoId)).toEqual([]);
    expect(listarDosesPorEsquema(db, esquemaSeNecessarioId)).toEqual([]);
  });
});
