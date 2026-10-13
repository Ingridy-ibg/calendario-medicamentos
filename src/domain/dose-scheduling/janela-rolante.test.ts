import { addDays } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';

import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';
import { cadastrarMedicamento, removerMedicamentoComHistorico } from '@/domain/medication-registration/registration';

import { materializarJanela, renovarJanelasAtivas, SEMANAS_JANELA_MAXIMA } from './janela-rolante';
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

describe('renovarJanela / renovarJanelasAtivas', () => {
  const cadastro = new Date(2026, 8, 7, 7, 0); // 07/09/2026
  const comuns = { nome: 'Losartana', dosagem: '50 mg', criticidade: 'comum' as const, quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };

  function dosesDoDia(db: TestDb, dia: Date) {
    return montarAgendaDoDia(db, dia).filter((item) => item.tipo === 'dose');
  }

  it('diário contínuo cadastrado há 35 dias volta a ter dose hoje e pelo menos 2 semanas à frente', () => {
    const db = createTestDb();
    cadastrarMedicamento(db, { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } }, cadastro);
    const hoje = addDays(cadastro, 35);
    expect(dosesDoDia(db, hoje)).toHaveLength(0);

    expect(renovarJanelasAtivas(db, hoje)).toBeGreaterThan(0);

    expect(dosesDoDia(db, hoje)).toHaveLength(1);
    expect(dosesDoDia(db, addDays(hoje, 14))).toHaveLength(1);
  });

  it('rodar duas vezes não duplica, e doses resolvidas ficam intactas', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } },
      cadastro,
    );
    const hoje = addDays(cadastro, 20);
    const resolvida = listarDosesPorEsquema(db, esquema.id)[0];
    resolverDose(db, resolvida.id, { status: 'tomada', dataHoraRegistro: resolvida.dataHoraPrevista! });

    renovarJanelasAtivas(db, hoje);
    const depoisDaPrimeira = listarDosesPorEsquema(db, esquema.id);
    expect(renovarJanelasAtivas(db, hoje)).toBe(0);
    const depoisDaSegunda = listarDosesPorEsquema(db, esquema.id);

    expect(depoisDaSegunda).toHaveLength(depoisDaPrimeira.length);
    const horarios = depoisDaSegunda.map((dose) => dose.dataHoraPrevista!.getTime());
    expect(new Set(horarios).size).toBe(horarios.length);
    expect(depoisDaSegunda.find((dose) => dose.id === resolvida.id)?.status).toBe('tomada');
  });

  it('não preenche dias passados que ficaram sem dose', () => {
    const db = createTestDb();
    cadastrarMedicamento(db, { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } }, cadastro);
    const hoje = addDays(cadastro, 35);
    renovarJanelasAtivas(db, hoje);
    expect(dosesDoDia(db, addDays(cadastro, 30))).toHaveLength(0);
  });

  it('tratamento de duração fixa já encerrado não gera doses', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 10 } } },
      cadastro,
    );
    const antes = listarDosesPorEsquema(db, esquema.id).length;
    expect(renovarJanelasAtivas(db, addDays(cadastro, 20))).toBe(0);
    expect(listarDosesPorEsquema(db, esquema.id)).toHaveLength(antes);
  });

  it('cíclico em espera e esquema removido são ignorados', () => {
    const db = createTestDb();
    cadastrarMedicamento(
      db,
      { comuns: { ...comuns, criticidade: 'especial' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' } },
      cadastro,
    );
    const { medicamento } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } },
      cadastro,
    );
    removerMedicamentoComHistorico(db, medicamento.id, cadastro);
    expect(renovarJanelasAtivas(db, addDays(cadastro, 35))).toBe(0);
  });
});
