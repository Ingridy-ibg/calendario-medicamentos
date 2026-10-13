import { addDays } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { esquemas } from '@/db/schema';
import { listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId, inserirEsquema, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';

import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';
import { cadastrarMedicamento, editarEsquema, removerMedicamentoComHistorico } from '@/domain/medication-registration/registration';

import { definirInicioDosCiclicosSemData, materializarJanela, renovarJanela, renovarJanelasAtivas, SEMANAS_JANELA_MAXIMA } from './janela-rolante';
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

  it('cíclico em espera só ganha a dose de início, e esquema removido é ignorado', () => {
    const db = createTestDb();
    const { esquema: ciclico } = cadastrarMedicamento(
      db,
      { comuns: { ...comuns, criticidade: 'especial' }, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' } },
      cadastro,
    );
    const { medicamento, esquema: removido } = cadastrarMedicamento(
      db,
      { comuns, esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } } },
      cadastro,
    );
    removerMedicamentoComHistorico(db, medicamento.id, cadastro);
    const dosesDoRemovido = listarDosesPorEsquema(db, removido.id).length;

    renovarJanelasAtivas(db, addDays(cadastro, 35));

    expect(listarDosesPorEsquema(db, removido.id)).toHaveLength(dosesDoRemovido);
    // A cartela nunca foi iniciada: só a dose de início do dia do cadastro, ainda pendente, e nenhum dia 2+.
    expect(listarDosesPorEsquema(db, ciclico.id).map((d) => [d.numeroNoCiclo, d.status])).toEqual([[1, 'pendente']]);
  });
});

describe('dose de início de cartela na janela (inicio-de-cartela)', () => {
  let db: TestDb;
  let medicamentoId: string;

  beforeEach(() => {
    db = createTestDb();
    medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 100,
      quantidadePorEmbalagem: 28,
    }).id;
  });

  function cicloDe(dataInicioCiclo: Date | null, inicioCartelaPrevisto: Date | null = null) {
    const id = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo,
      inicioCartelaPrevisto,
      horarios: ['22:00'],
    }).id;
    return () => paraEsquemaDominio(buscarEsquemaPorId(db, id)!);
  }

  const previstas = (esquemaId: string) =>
    listarDosesPorEsquema(db, esquemaId)
      .map((dose) => ({ em: dose.dataHoraPrevista, numero: dose.numeroNoCiclo }))
      .sort((a, b) => a.em!.getTime() - b.em!.getTime());

  it('fim da pausa: a renovação cria só a dose de início, sem os dias 2 em diante', () => {
    const esquema = cicloDe(new Date(2026, 9, 1, 22, 5));
    const agora = new Date(2026, 9, 20, 10);

    renovarJanela(db, esquema(), agora);

    const doses = previstas(esquema().id);
    expect(doses.at(-1)).toEqual({ em: new Date(2026, 9, 29, 22, 0), numero: 1 });
    expect(doses.filter((dose) => dose.em! > new Date(2026, 9, 21, 23))).toHaveLength(1);
  });

  it('sem ciclo, com início gravado: materializa a dose de início no dia gravado', () => {
    const esquema = cicloDe(null, new Date(2026, 9, 14));

    materializarJanela(db, esquema(), new Date(2026, 9, 13, 23));

    expect(previstas(esquema().id)).toEqual([{ em: new Date(2026, 9, 14, 22, 0), numero: 1 }]);
  });

  it('início vencido sobrevive à renovação e, na edição, vira uma só dose no novo horário do mesmo dia', () => {
    const esquema = cicloDe(null, new Date(2026, 9, 14));
    materializarJanela(db, esquema(), new Date(2026, 9, 13, 23));
    const [inicio] = listarDosesPorEsquema(db, esquema().id);
    const doisDiasDepois = new Date(2026, 9, 16, 10);

    renovarJanela(db, esquema(), doisDiasDepois);
    expect(listarDosesPorEsquema(db, esquema().id).map((dose) => dose.id)).toEqual([inicio.id]);

    editarEsquema(db, esquema().id, { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '21:00' }, doisDiasDepois);
    expect(previstas(esquema().id)).toEqual([{ em: new Date(2026, 9, 14, 21, 0), numero: 1 }]);
  });

  it('horário editado durante a espera move a dose de início no mesmo dia', () => {
    const esquema = cicloDe(new Date(2026, 9, 1, 22, 5));
    renovarJanela(db, esquema(), new Date(2026, 9, 20, 10));

    editarEsquema(db, esquema().id, { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '21:00' }, new Date(2026, 9, 27, 10));

    const inicios = previstas(esquema().id).filter((dose) => dose.numero === 1 && dose.em! > new Date(2026, 9, 2));
    expect(inicios).toEqual([{ em: new Date(2026, 9, 29, 21, 0), numero: 1 }]);
  });

  it('cíclico aguardando sem data recebe hoje ou amanhã, uma vez só', () => {
    const antesDoHorario = cicloDe(null);
    const depoisDoHorario = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: null,
      horarios: ['08:00'],
    }).id;
    const agora = new Date(2026, 9, 13, 15, 0);

    definirInicioDosCiclicosSemData(db, agora);
    definirInicioDosCiclicosSemData(db, new Date(2026, 9, 14, 23, 0));

    expect(buscarEsquemaPorId(db, antesDoHorario().id)?.inicioCartelaPrevisto).toEqual(new Date(2026, 9, 13));
    expect(buscarEsquemaPorId(db, depoisDoHorario)?.inicioCartelaPrevisto).toEqual(new Date(2026, 9, 14));
  });

  it('a renovação da janela não faz mais a correção (roda uma vez só, fora daqui)', () => {
    const semData = cicloDe(null);
    renovarJanelasAtivas(db, new Date(2026, 9, 13, 15, 0));
    expect(buscarEsquemaPorId(db, semData().id)?.inicioCartelaPrevisto).toBeNull();
  });
});

describe('dose de início vencida (fix-revisao-inicio-de-cartela)', () => {
  let db: TestDb;
  let esquemaId: string;
  beforeEach(() => {
    db = createTestDb();
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 28,
      quantidadePorEmbalagem: 28,
    }).id;
    // Dia 1 em 01/08 às 22:00: pausa até 28/08, nova cartela prevista em 29/08 às 22:00.
    esquemaId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      horarios: ['22:00'],
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 7, 1, 22, 0),
    }).id;
  });
  const esquema = () => paraEsquemaDominio(buscarEsquemaPorId(db, esquemaId)!);
  const iniciosPendentes = () =>
    listarDosesPorEsquema(db, esquemaId).filter((d) => d.numeroNoCiclo === 1 && d.status === 'pendente');

  it('pausa terminada antes da atualização: a renovação cria a dose de 29/08 às 22:00, atrasada', () => {
    renovarJanela(db, esquema(), new Date(2026, 9, 13, 10));
    expect(iniciosPendentes().map((d) => d.dataHoraPrevista)).toEqual([new Date(2026, 7, 29, 22, 0)]);
    expect(montarAgendaDoDia(db, new Date(2026, 9, 13, 10))).toMatchObject([
      { tipo: 'aguardando_cartela', inicioPrevisto: new Date(2026, 7, 29, 22, 0), atrasada: true },
    ]);
  });

  it('renovar de novo não cria outra', () => {
    renovarJanela(db, esquema(), new Date(2026, 9, 13, 10));
    renovarJanela(db, esquema(), new Date(2026, 9, 14, 10));
    expect(iniciosPendentes()).toHaveLength(1);
  });

  it('app sem abrir durante o início previsto: uma única dose, no dia previsto', () => {
    // Ciclo de 01/10: a janela criada em 30/09 vai até 28/10 e não alcança o início (29/10 às 22:00).
    db.update(esquemas).set({ dataInicioCiclo: new Date(2026, 9, 1, 22, 0) }).run();
    materializarJanela(db, esquema(), new Date(2026, 8, 30, 10));
    expect(iniciosPendentes().map((d) => d.dataHoraPrevista)).toEqual([new Date(2026, 9, 1, 22, 0)]);

    renovarJanela(db, esquema(), new Date(2026, 10, 2, 10));
    const novaCartela = iniciosPendentes().filter((d) => d.dataHoraPrevista! > new Date(2026, 9, 2));
    expect(novaCartela.map((d) => d.dataHoraPrevista)).toEqual([new Date(2026, 9, 29, 22, 0)]);
  });

  it('horário editado depois do início previsto do dia: uma só dose de início, no novo horário', () => {
    // Sem ciclo, início previsto hoje (13/10) às 22:00; às 22:30 o horário muda para 23:00.
    db.update(esquemas).set({ dataInicioCiclo: null, inicioCartelaPrevisto: new Date(2026, 9, 13) }).run();
    materializarJanela(db, esquema(), new Date(2026, 9, 13, 10));
    editarEsquema(db, esquemaId, { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '23:00' }, new Date(2026, 9, 13, 22, 30));
    expect(iniciosPendentes().map((d) => d.dataHoraPrevista)).toEqual([new Date(2026, 9, 13, 23, 0)]);
  });

  it('horário editado com a cartela atrasada de dias anteriores: uma só dose, no dia previsto e no novo horário', () => {
    renovarJanela(db, esquema(), new Date(2026, 9, 13, 10));
    editarEsquema(db, esquemaId, { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '21:00' }, new Date(2026, 9, 13, 11));
    expect(iniciosPendentes().map((d) => d.dataHoraPrevista)).toEqual([new Date(2026, 7, 29, 21, 0)]);
  });
});
