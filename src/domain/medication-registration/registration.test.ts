import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { buscarDosePorId, listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';

import {
  cadastrarMedicamento,
  editarEsquema,
  ErroValidacao,
  removerMedicamentoComHistorico,
} from './registration';
import type { CamposComunsFormulario } from './types';

const comuns: CamposComunsFormulario = {
  nome: 'Medicamento de teste',
  dosagem: '1 comprimido',
  criticidade: 'comum',
  quantidadeEmEstoque: 100,
  quantidadePorEmbalagem: 100,
};

describe('cadastrarMedicamento', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('lança ErroValidacao quando os dados são inválidos e não grava nada', () => {
    expect(() =>
      cadastrarMedicamento(
        db,
        { comuns: { ...comuns, nome: '' }, esquema: { tipo: 'SE_NECESSARIO', limiteDiario: 4 } },
        new Date(2026, 7, 26),
      ),
    ).toThrow(ErroValidacao);
  });

  it('DIARIO: cadastra e materializa a grade de doses futuras', () => {
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } } },
      new Date(2026, 7, 26),
    );

    expect(buscarMedicamentoPorId(db, medicamento.id)).toMatchObject({ criticidade: 'comum' });
    expect(listarDosesPorEsquema(db, esquema.id).length).toBeGreaterThan(0);
  });

  it('INTERVALO_HORAS: cadastra e materializa só a primeira dose, ancorada em agora', () => {
    const agora = new Date(2026, 7, 26, 14, 0);
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } } },
      agora,
    );

    const doses = listarDosesPorEsquema(db, esquema.id);
    expect(doses).toHaveLength(1);
    expect(doses[0].dataHoraPrevista).toEqual(agora);
  });

  it('DIAS_SEMANA: cadastra e materializa a grade nos dias configurados', () => {
    const { esquema } = cadastrarMedicamento(
      db,
      {
        comuns,
        esquema: { tipo: 'DIAS_SEMANA', diasDaSemana: [3], horarios: ['09:00'], duracao: { modo: 'continuo' } },
      },
      new Date(2026, 7, 26), // quarta-feira
    );

    expect(listarDosesPorEsquema(db, esquema.id).length).toBeGreaterThan(0);
  });

  it('CICLICO: cadastra em espera (sem nenhuma dose) e força criticidade especial mesmo com "comum" selecionado', () => {
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { comuns: { ...comuns, criticidade: 'comum' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '08:00' } },
      new Date(2026, 7, 26),
    );

    expect(buscarMedicamentoPorId(db, medicamento.id)).toMatchObject({ criticidade: 'especial' });
    expect(buscarEsquemaPorId(db, esquema.id)?.dataInicioCiclo).toBeNull();
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
  });

  it('SE_NECESSARIO: cadastra sem nenhuma dose pré-gerada', () => {
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'SE_NECESSARIO', limiteDiario: 4 } },
      new Date(2026, 7, 26),
    );

    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
  });
});

describe('editarEsquema (4.7)', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('editar o intervalo usa o novo valor nas próximas doses, sem alterar o histórico já registrado', () => {
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } } },
      new Date(2026, 7, 26, 8, 0),
    );
    const doseInicial = listarDosesPorEsquema(db, esquema.id)[0];
    const historico = resolverDose(db, doseInicial.id, {
      status: 'tomada',
      dataHoraRegistro: new Date(2026, 7, 26, 8, 2),
    });

    const agoraDaEdicao = new Date(2026, 7, 26, 12, 0);
    editarEsquema(db, esquema.id, { tipo: 'INTERVALO_HORAS', intervaloHoras: 6, duracao: { modo: 'continuo' } }, agoraDaEdicao);

    // O histórico já registrado permanece intacto.
    expect(buscarDosePorId(db, doseInicial.id)).toMatchObject(historico!);

    // A nova dose usa o intervalo editado (6h) a partir do momento da edição.
    const dosesFinais = listarDosesPorEsquema(db, esquema.id);
    const novaDose = dosesFinais.find((dose) => dose.id !== doseInicial.id);
    expect(novaDose?.dataHoraPrevista).toEqual(new Date(2026, 7, 26, 18, 0));
  });

  it('editar um esquema DIARIO regenera a grade futura sem tocar em doses já resolvidas', () => {
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } },
      new Date(2026, 7, 26),
    );
    const doseDeHoje = listarDosesPorEsquema(db, esquema.id).find(
      (dose) => dose.dataHoraPrevista?.getTime() === new Date(2026, 7, 26, 8, 0).getTime(),
    )!;
    resolverDose(db, doseDeHoje.id, { status: 'tomada', dataHoraRegistro: new Date(2026, 7, 26, 8, 1) });

    editarEsquema(db, esquema.id, { tipo: 'DIARIO', horarios: ['10:00'], duracao: { modo: 'continuo' } }, new Date(2026, 7, 26));

    const dosesFinais = listarDosesPorEsquema(db, esquema.id);
    expect(dosesFinais.find((dose) => dose.id === doseDeHoje.id)).toMatchObject({ status: 'tomada' });
    expect(dosesFinais.filter((dose) => dose.id !== doseDeHoje.id).every((dose) => dose.dataHoraPrevista?.getHours() === 10)).toBe(true);
  });
});

describe('removerMedicamentoComHistorico (4.8)', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('para a geração futura e apaga doses pendentes, mas preserva o histórico já registrado', () => {
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } },
      new Date(2026, 7, 26),
    );
    const doseDeHoje = listarDosesPorEsquema(db, esquema.id).find(
      (dose) => dose.dataHoraPrevista?.getTime() === new Date(2026, 7, 26, 8, 0).getTime(),
    )!;
    resolverDose(db, doseDeHoje.id, { status: 'tomada', dataHoraRegistro: new Date(2026, 7, 26, 8, 1) });
    const totalAntes = listarDosesPorEsquema(db, esquema.id).length;
    expect(totalAntes).toBeGreaterThan(1);

    removerMedicamentoComHistorico(db, medicamento.id, new Date(2026, 7, 27));

    expect(buscarMedicamentoPorId(db, medicamento.id)?.deletedAt).toEqual(new Date(2026, 7, 27));
    expect(buscarEsquemaPorId(db, esquema.id)?.deletedAt).toEqual(new Date(2026, 7, 27));

    // O histórico (dose já tomada) continua acessível...
    const dosesRestantes = listarDosesPorEsquema(db, esquema.id);
    expect(dosesRestantes).toHaveLength(1);
    expect(dosesRestantes[0]).toMatchObject({ id: doseDeHoje.id, status: 'tomada' });
  });
});
