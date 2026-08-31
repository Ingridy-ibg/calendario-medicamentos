import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { buscarDosePorId, inserirDose, listarDosesPorEsquema } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId, inserirMedicamento } from '@/db/repositories/medicamentos';

import { materializarJanela } from './janela-rolante';
import { confirmarNovaCartelaCiclica, resolverDoseEAgendarProxima } from './resolucao';
import { registrarDoseSeNecessario } from './se-necessario';
import type { EsquemaCiclico, EsquemaDiario, EsquemaDiasSemana, EsquemaIntervaloHoras } from './types';

describe('resolverDoseEAgendarProxima — de ponta a ponta para cada tipo de esquema', () => {
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

  it('DIARIO: resolve a dose e não gera nenhuma outra (a grade já está pré-materializada)', () => {
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 7, 26),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 26));
    const totalAntes = listarDosesPorEsquema(db, esquemaId).length;
    const dose = listarDosesPorEsquema(db, esquemaId)[0];

    const resolvida = resolverDoseEAgendarProxima(db, esquema, dose.id, {
      status: 'tomada',
      dataHoraRegistro: new Date(2026, 7, 26, 8, 3),
    });

    expect(resolvida.status).toBe('tomada');
    expect(listarDosesPorEsquema(db, esquemaId)).toHaveLength(totalAntes);
  });

  it('DIAS_SEMANA: resolve a dose e não gera nenhuma outra', () => {
    const esquemaId = inserirEsquema(db, {
      tipo: 'DIAS_SEMANA',
      medicamentoId,
      diasDaSemana: [3], // quarta
      horarios: ['09:00'],
    }).id;
    const esquema: EsquemaDiasSemana = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIAS_SEMANA',
      diasDaSemana: [3],
      horarios: ['09:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 7, 26),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 26)); // 26/08/2026 é quarta
    const totalAntes = listarDosesPorEsquema(db, esquemaId).length;
    const dose = listarDosesPorEsquema(db, esquemaId)[0];

    resolverDoseEAgendarProxima(db, esquema, dose.id, {
      status: 'pulada',
      dataHoraRegistro: new Date(2026, 7, 26, 9, 30),
    });

    expect(listarDosesPorEsquema(db, esquemaId)).toHaveLength(totalAntes);
    expect(buscarDosePorId(db, dose.id)?.status).toBe('pulada');
  });

  it('INTERVALO_HORAS: resolver a dose atual agenda imediatamente a próxima', () => {
    const esquemaId = inserirEsquema(db, { tipo: 'INTERVALO_HORAS', medicamentoId, intervaloHoras: 8 }).id;
    const esquema: EsquemaIntervaloHoras = {
      id: esquemaId,
      medicamentoId,
      tipo: 'INTERVALO_HORAS',
      intervaloHoras: 8,
      duracaoDias: null,
      dataInicio: new Date(2026, 7, 26, 14, 0),
    };
    const doseAtual = inserirDose(db, { esquemaId, dataHoraPrevista: esquema.dataInicio });

    resolverDoseEAgendarProxima(db, esquema, doseAtual.id, {
      status: 'tomada',
      dataHoraRegistro: new Date(2026, 7, 26, 12, 0), // 2h adiantada
    });

    const todasAsDoses = listarDosesPorEsquema(db, esquemaId);
    expect(todasAsDoses).toHaveLength(2);
    const proxima = todasAsDoses.find((dose) => dose.id !== doseAtual.id);
    expect(proxima?.dataHoraPrevista).toEqual(new Date(2026, 7, 26, 20, 0));
    expect(proxima?.status).toBe('pendente');
  });

  it('CICLICO: confirmar a primeira dose de uma nova cartela agenda o dia 1 e materializa a janela ativa', () => {
    const esquemaId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 6, 1),
      horarios: ['08:00'],
    }).id;
    const esquemaEmEspera: EsquemaCiclico = {
      id: esquemaId,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: null,
    };
    const agora = new Date(2026, 7, 26, 9, 0);

    const novoEsquema = confirmarNovaCartelaCiclica(db, esquemaEmEspera, agora);

    expect(novoEsquema.dataInicioCiclo).toEqual(agora);
    const dosesGeradas = listarDosesPorEsquema(db, esquemaId);
    const doseDeHoje = dosesGeradas.find((dose) => dose.numeroNoCiclo === 1);
    expect(doseDeHoje).toMatchObject({ status: 'tomada' });
    expect(doseDeHoje?.dataHoraRegistro).toEqual(agora);
    // As doses dos próximos dias ativos já foram materializadas junto.
    expect(dosesGeradas.length).toBeGreaterThan(1);
    // Confirmar a primeira dose da cartela decrementa o estoque (specs/medication-stock).
    expect(buscarMedicamentoPorId(db, medicamentoId)?.quantidadeEmEstoque).toBe(99);
  });

  it('SE_NECESSARIO: cada registro é uma dose direta, sem linha pendente prévia para resolver', () => {
    const esquemaId = inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 2 }).id;
    const esquema = { id: esquemaId, medicamentoId, tipo: 'SE_NECESSARIO' as const, limiteDiario: 2 };

    expect(listarDosesPorEsquema(db, esquemaId)).toEqual([]);

    const primeiro = registrarDoseSeNecessario(esquema, 0);
    inserirDose(db, { esquemaId, status: 'tomada' });
    expect(primeiro.avisoLimiteExcedido).toBe(false);

    const segundo = registrarDoseSeNecessario(esquema, 1);
    inserirDose(db, { esquemaId, status: 'tomada' });
    expect(segundo.avisoLimiteExcedido).toBe(false);

    // Terceiro registro no mesmo dia ultrapassa o limite de 2, mas ainda é registrado.
    const terceiro = registrarDoseSeNecessario(esquema, 2);
    inserirDose(db, { esquemaId, status: 'tomada' });
    expect(terceiro.avisoLimiteExcedido).toBe(true);

    expect(listarDosesPorEsquema(db, esquemaId)).toHaveLength(3);
  });
});
