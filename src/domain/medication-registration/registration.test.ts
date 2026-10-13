import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { buscarDosePorId, listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';

import {
  cadastrarMedicamento,
  editarEsquema,
  editarMedicamento,
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

  it('CICLICO: cadastra em espera, só com a dose de início de hoje, e força criticidade especial mesmo com "comum" selecionado', () => {
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { comuns: { ...comuns, criticidade: 'comum' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '08:00' } },
      new Date(2026, 7, 26),
    );

    expect(buscarMedicamentoPorId(db, medicamento.id)).toMatchObject({ criticidade: 'especial' });
    expect(buscarEsquemaPorId(db, esquema.id)?.dataInicioCiclo).toBeNull();
    expect(listarDosesPorEsquema(db, esquema.id)).toMatchObject([
      { dataHoraPrevista: new Date(2026, 7, 26, 8, 0), numeroNoCiclo: 1, status: 'pendente' },
    ]);
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

describe('editarEsquema — dose pendente de horário já passado (manage-medications, decisão 4)', () => {
  it('às 10:00, trocar 20:00 por 21:00 mantém a dose das 08:00 ainda pendente e só refaz as futuras', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } } },
      new Date(2026, 9, 12, 7, 0),
    );
    const as8 = new Date(2026, 9, 12, 8, 0).getTime();
    const doseDas8 = listarDosesPorEsquema(db, esquema.id).find((dose) => dose.dataHoraPrevista?.getTime() === as8)!;

    editarEsquema(
      db,
      esquema.id,
      { tipo: 'DIARIO', horarios: ['08:00', '21:00'], duracao: { modo: 'continuo' } },
      new Date(2026, 9, 12, 10, 0),
    );

    const deHoje = listarDosesPorEsquema(db, esquema.id)
      .filter((dose) => dose.dataHoraPrevista && dose.dataHoraPrevista.getDate() === 12 && dose.dataHoraPrevista.getMonth() === 9)
      .map((dose) => ({ id: dose.id, hora: dose.dataHoraPrevista!.getHours(), status: dose.status }));
    expect(deHoje.find((dose) => dose.hora === 8)).toEqual({ id: doseDas8.id, hora: 8, status: 'pendente' });
    expect(deHoje.map((dose) => dose.hora).sort((a, b) => a - b)).toEqual([8, 21]);
  });
});

describe('editarMedicamento', () => {
  const diario = { tipo: 'DIARIO' as const, horarios: ['08:00'], duracao: { modo: 'continuo' as const } };

  it('edita campos comuns, corrige o estoque e mantém o histórico', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, 10, 7));
    const tomada = listarDosesPorEsquema(db, esquema.id)[0];
    resolverDose(db, tomada.id, { status: 'tomada', dataHoraRegistro: tomada.dataHoraPrevista! });

    editarMedicamento(
      db,
      medicamento.id,
      { comuns: { ...comuns, nome: 'Losartana', quantidadeEmEstoque: 10 }, esquema: { ...diario, horarios: ['09:00'] } },
      new Date(2026, 9, 12, 7),
    );

    expect(buscarMedicamentoPorId(db, medicamento.id)).toMatchObject({ nome: 'Losartana', quantidadeEmEstoque: 10 });
    expect(buscarDosePorId(db, tomada.id)).toMatchObject({ status: 'tomada', dataHoraPrevista: tomada.dataHoraPrevista });
  });

  it('grava, troca e apaga a observação', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(
      db,
      { comuns: { ...comuns, observacoes: '  Tomar em jejum  ' }, esquema: diario },
      new Date(2026, 9, 10, 7),
    );
    expect(buscarMedicamentoPorId(db, medicamento.id)?.observacoes).toBe('Tomar em jejum');

    editarMedicamento(db, medicamento.id, { comuns: { ...comuns, observacoes: 'Com comida' }, esquema: diario }, new Date(2026, 9, 11));
    expect(buscarMedicamentoPorId(db, medicamento.id)?.observacoes).toBe('Com comida');

    editarMedicamento(db, medicamento.id, { comuns: { ...comuns, observacoes: '   ' }, esquema: diario }, new Date(2026, 9, 12));
    expect(buscarMedicamentoPorId(db, medicamento.id)?.observacoes).toBeNull();
  });

  it('cadastro sem observação grava nulo', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, 10, 7));
    expect(buscarMedicamentoPorId(db, medicamento.id)?.observacoes).toBeNull();
  });

  it('edição inválida não grava nada', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, 10, 7));

    expect(() =>
      editarMedicamento(db, medicamento.id, { comuns: { ...comuns, nome: '' }, esquema: diario }, new Date(2026, 9, 12)),
    ).toThrow(ErroValidacao);
    expect(buscarMedicamentoPorId(db, medicamento.id)?.nome).toBe(comuns.nome);
  });

  it('erro no esquema não deixa os campos comuns gravados pela metade', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, 10, 7));

    expect(() =>
      editarMedicamento(db, medicamento.id, { comuns: { ...comuns, nome: 'Outro' }, esquema: { ...diario, horarios: [] } }, new Date(2026, 9, 12)),
    ).toThrow(ErroValidacao);
    expect(buscarMedicamentoPorId(db, medicamento.id)?.nome).toBe(comuns.nome);
  });

  it('rejeita troca de tipo de esquema', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, 10, 7));

    expect(() =>
      editarMedicamento(db, medicamento.id, { comuns, esquema: { tipo: 'SE_NECESSARIO', limiteDiario: 3 } }, new Date(2026, 9, 12)),
    ).toThrow(ErroValidacao);
  });

  it('cíclico continua especial mesmo se a edição mandar comum', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' } },
      new Date(2026, 9, 10, 7),
    );
    editarMedicamento(
      db,
      medicamento.id,
      { comuns: { ...comuns, criticidade: 'comum' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '21:00' } },
      new Date(2026, 9, 12),
    );
    expect(buscarMedicamentoPorId(db, medicamento.id)?.criticidade).toBe('especial');
  });
});
