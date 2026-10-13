import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { inserirDose, listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';
import { montarCalendarioMensal } from '@/domain/agenda-views/calendario-mensal';
import { renovarJanelasAtivas } from '@/domain/dose-scheduling/janela-rolante';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';
import { listarAlvosDesejados } from '@/notifications/contexto';

import { adicionarAAgenda, cadastrarMedicamento, editarMedicamento, ErroValidacao, prepararCadastro, prepararVoltaAAgenda, retirarDaAgenda } from './registration';
import type { DadosEsquemaFormulario, DadosFormularioMedicamento } from './types';

const as = (dia: number, h: number, m = 0) => new Date(2026, 9, dia, h, m); // outubro de 2026
const comuns = { nome: 'X', dosagem: '1', criticidade: 'comum' as const, quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };
const dados = (esquema: DadosEsquemaFormulario): DadosFormularioMedicamento => ({ comuns, esquema });
const diario: DadosEsquemaFormulario = { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } };

/** Como a confirmação faz: prévia da volta e, com ela, a volta. */
function voltar(db: ReturnType<typeof createTestDb>, medicamentoId: string, agora: Date) {
  return adicionarAAgenda(db, medicamentoId, prepararVoltaAAgenda(db, medicamentoId, agora).previa);
}

function datasDoEsquema(db: ReturnType<typeof createTestDb>, esquemaId: string) {
  return listarDosesPorEsquema(db, esquemaId)
    .map((dose) => ({ data: dose.dataHoraPrevista!, status: dose.status }))
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

describe('fora da agenda some de agenda, calendário futuro, renovação e lembretes (1.2)', () => {
  it('"se necessário" fora da agenda não aparece na agenda de hoje', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, dados({ tipo: 'SE_NECESSARIO', limiteDiario: 3 }), as(12, 7));
    retirarDaAgenda(db, medicamento.id, as(12, 7));
    expect(montarAgendaDoDia(db, as(12, 9))).toEqual([]);
  });

  it('agenda de hoje mantém a dose já tomada de um medicamento retirado, sem pendentes nem alerta', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { comuns: { ...comuns, quantidadeEmEstoque: 5 }, esquema: { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } } },
      as(12, 7),
    );
    const das8 = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(12, 8).getTime())!;
    resolverDose(db, das8.id, { status: 'tomada', dataHoraRegistro: as(12, 8) });
    retirarDaAgenda(db, medicamento.id, as(12, 9));

    const agenda = montarAgendaDoDia(db, as(12, 9));
    expect(agenda).toMatchObject([{ tipo: 'dose', horario: as(12, 8), status: 'tomada', alertaEstoque: null }]);
    expect(agenda).toHaveLength(1);
    const hoje = montarCalendarioMensal(db, as(1, 0), as(12, 9)).find((d) => d.dia.getDate() === 12)!;
    expect(hoje.itens).toHaveLength(1);
  });

  it('agenda de hoje descarta dose pendente de um medicamento fora da agenda, mantendo a tomada', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      dados({ tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } }),
      as(12, 7),
    );
    const das8 = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(12, 8).getTime())!;
    resolverDose(db, das8.id, { status: 'tomada', dataHoraRegistro: as(12, 8) });
    retirarDaAgenda(db, medicamento.id, as(12, 9));
    // Pendente que não deveria existir (ex.: corrida com uma notificação).
    inserirDose(db, { esquemaId: esquema.id, dataHoraPrevista: as(12, 20) });

    const agenda = montarAgendaDoDia(db, as(12, 9));
    expect(agenda).toMatchObject([{ tipo: 'dose', horario: as(12, 8), status: 'tomada' }]);
    expect(agenda).toHaveLength(1);
  });

  it('calendário mantém o histórico passado e não projeta o futuro', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(5, 7));
    const dose = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(6, 8).getTime())!;
    resolverDose(db, dose.id, { status: 'tomada', dataHoraRegistro: as(6, 8) });
    retirarDaAgenda(db, medicamento.id, as(12, 9));

    const calendario = montarCalendarioMensal(db, as(1, 0), as(12, 9));
    const itensDoDia = (dia: number) => calendario.find((d) => d.dia.getDate() === dia)!.itens;
    expect(itensDoDia(6)).toMatchObject([{ tipo: 'historico', status: 'tomada' }]);
    expect(itensDoDia(20)).toEqual([]);
  });

  it('renovação da janela não cria doses e o reconciliador não tem alvos', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(12, 7));
    retirarDaAgenda(db, medicamento.id, as(12, 7));
    expect(renovarJanelasAtivas(db, as(20, 7))).toBe(0);
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
    expect(listarAlvosDesejados(db, as(20, 7))).toEqual([]);
  });

  it('cíclico fora da agenda não tem lembretes de pausa', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(
      db,
      { ...dados({ tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' }), emUso: { dados: { tipo: 'ciclo', fase: 'pausa', dia: 2 }, dosesDeHojeTomadas: [] } },
      as(12, 7),
    );
    expect(listarAlvosDesejados(db, as(12, 7)).length).toBeGreaterThan(0);
    retirarDaAgenda(db, medicamento.id, as(12, 7));
    expect(listarAlvosDesejados(db, as(12, 7))).toEqual([]);
  });
});

describe('retirarDaAgenda e adicionarAAgenda (1.3)', () => {
  it('retirar apaga as pendentes e mantém as resolvidas', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(10, 7));
    const primeira = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(10, 8).getTime())!;
    resolverDose(db, primeira.id, { status: 'tomada', dataHoraRegistro: as(10, 8) });

    retirarDaAgenda(db, medicamento.id, as(12, 9));

    expect(buscarMedicamentoPorId(db, medicamento.id)?.naAgenda).toBe(false);
    expect(datasDoEsquema(db, esquema.id)).toEqual([{ data: as(10, 8), status: 'tomada' }]);
  });

  it('tratamento de 7 dias iniciado há 20 dias volta em 12/10 com doses de 12/10 a 18/10', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      dados({ tipo: 'DIARIO', horarios: ['20:00'], duracao: { modo: 'dias', dias: 7 } }),
      new Date(2026, 8, 22, 7),
    );
    retirarDaAgenda(db, medicamento.id, new Date(2026, 8, 25, 7));

    voltar(db, medicamento.id, as(12, 10));

    const futuras = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente').map((d) => d.data);
    expect(futuras).toEqual(Array.from({ length: 7 }, (_, i) => as(12 + i, 20)));
    expect(buscarMedicamentoPorId(db, medicamento.id)?.naAgenda).toBe(true);
  });

  it('voltar às 10:00 não cria a dose das 08:00 de hoje', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(1, 7));
    retirarDaAgenda(db, medicamento.id, as(2, 7));

    voltar(db, medicamento.id, as(12, 10));

    const pendentes = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente');
    expect(pendentes[0].data).toEqual(as(13, 8));
  });

  it('intervalo em horas com última dose antiga volta com a primeira dose agora', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { ...dados({ tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } }), emUso: { dados: { tipo: 'intervalo', ultimaDose: as(1, 6) }, dosesDeHojeTomadas: [] } },
      as(1, 7),
    );
    retirarDaAgenda(db, medicamento.id, as(2, 7));

    voltar(db, medicamento.id, as(12, 10));

    expect(datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente').map((d) => d.data)).toEqual([as(12, 10)]);
  });

  it('cíclico volta aguardando nova cartela', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { ...dados({ tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' }), emUso: { dados: { tipo: 'ciclo', fase: 'ativo', dia: 5 }, dosesDeHojeTomadas: [] } },
      as(1, 7),
    );
    retirarDaAgenda(db, medicamento.id, as(3, 7));

    voltar(db, medicamento.id, as(12, 10));

    expect(buscarEsquemaPorId(db, esquema.id)?.dataInicioCiclo).toBeNull();
    expect(montarAgendaDoDia(db, as(12, 10))).toMatchObject([{ tipo: 'aguardando_cartela' }]);
  });

  it('dose de hoje tomada adiantada antes de retirar não volta como pendente', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      dados({ tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } }),
      as(12, 7),
    );
    const das20 = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(12, 20).getTime())!;
    resolverDose(db, das20.id, { status: 'tomada', dataHoraRegistro: as(12, 19) });
    retirarDaAgenda(db, medicamento.id, as(12, 19, 30));

    const { previa } = prepararVoltaAAgenda(db, medicamento.id, as(12, 19, 45));
    expect(previa.hoje).toEqual({ tomadas: [as(12, 20)], aAgendar: [] });
    expect(previa.proximasDoses[0]).toEqual(as(13, 8));
    adicionarAAgenda(db, medicamento.id, previa);

    const de20 = datasDoEsquema(db, esquema.id).filter((d) => d.data.getTime() === as(12, 20).getTime());
    expect(de20).toEqual([{ data: as(12, 20), status: 'tomada' }]);
    const pendentes = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente').map((d) => d.data);
    expect(pendentes.slice(0, 4)).toEqual(previa.proximasDoses);
  });

  it('horário editado fora da agenda não ganha dose hoje se a dose da noite já foi tomada', () => {
    const db = createTestDb();
    const duasVezes: DadosEsquemaFormulario = { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'continuo' } };
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(duasVezes), as(12, 7));
    const das20 = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(12, 20).getTime())!;
    resolverDose(db, das20.id, { status: 'tomada', dataHoraRegistro: as(12, 19) });
    retirarDaAgenda(db, medicamento.id, as(12, 19, 30));
    editarMedicamento(db, medicamento.id, dados({ ...duasVezes, horarios: ['08:00', '20:30'] }), as(12, 19, 35));

    const { previa } = prepararVoltaAAgenda(db, medicamento.id, as(12, 19, 45));
    expect(previa.hoje.aAgendar).toEqual([]);
    expect(previa.proximasDoses[0]).toEqual(as(13, 8));
    adicionarAAgenda(db, medicamento.id, previa);

    const deHoje = datasDoEsquema(db, esquema.id).filter((d) => d.data.getDate() === 12);
    expect(deHoje).toEqual([{ data: as(12, 20), status: 'tomada' }]);
    const pendentes = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente').map((d) => d.data);
    expect(pendentes.slice(0, 4)).toEqual(previa.proximasDoses);
  });

  it('horário novo da grade sem dose correspondente entra hoje', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(12, 7));
    const das8 = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(12, 8).getTime())!;
    resolverDose(db, das8.id, { status: 'tomada', dataHoraRegistro: as(12, 8) });
    retirarDaAgenda(db, medicamento.id, as(12, 9));
    editarMedicamento(db, medicamento.id, dados({ ...diario, horarios: ['08:00', '14:00'] }), as(12, 9, 30));

    const { previa } = prepararVoltaAAgenda(db, medicamento.id, as(12, 10));
    expect(previa.hoje.aAgendar).toEqual([as(12, 14)]);
    expect(previa.proximasDoses[0]).toEqual(as(12, 14));
    adicionarAAgenda(db, medicamento.id, previa);

    expect(datasDoEsquema(db, esquema.id).filter((d) => d.data.getDate() === 12)).toEqual([
      { data: as(12, 8), status: 'tomada' },
      { data: as(12, 14), status: 'pendente' },
    ]);
  });

  it('intervalo em horas volta contando da última dose tomada', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      dados({ tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } }),
      as(12, 9),
    );
    const primeira = listarDosesPorEsquema(db, esquema.id)[0];
    resolverDose(db, primeira.id, { status: 'tomada', dataHoraRegistro: as(12, 9) });
    retirarDaAgenda(db, medicamento.id, as(12, 9, 30));

    const { previa } = prepararVoltaAAgenda(db, medicamento.id, as(12, 10));
    expect(previa.proximasDoses).toEqual([as(12, 17)]);
    adicionarAAgenda(db, medicamento.id, previa);

    expect(datasDoEsquema(db, esquema.id)).toEqual([
      { data: as(12, 9), status: 'tomada' },
      { data: as(12, 17), status: 'pendente' },
    ]);
  });

  it('intervalo em horas pula a próxima dose já pulada ao voltar', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      dados({ tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } }),
      as(12, 9),
    );
    const primeira = listarDosesPorEsquema(db, esquema.id)[0];
    resolverDose(db, primeira.id, { status: 'tomada', dataHoraRegistro: as(12, 9) });
    const das17 = inserirDose(db, { esquemaId: esquema.id, dataHoraPrevista: as(12, 17) });
    resolverDose(db, das17.id, { status: 'pulada', dataHoraRegistro: as(12, 10) });
    retirarDaAgenda(db, medicamento.id, as(12, 10, 30));

    const { previa } = prepararVoltaAAgenda(db, medicamento.id, as(12, 11));
    expect(previa.proximasDoses).toEqual([as(13, 1)]);
    adicionarAAgenda(db, medicamento.id, previa);

    expect(datasDoEsquema(db, esquema.id)).toEqual([
      { data: as(12, 9), status: 'tomada' },
      { data: as(12, 17), status: 'pulada' },
      { data: as(13, 1), status: 'pendente' },
    ]);
  });

  it('edição fora da agenda é salva e não gera doses', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(12, 7));
    retirarDaAgenda(db, medicamento.id, as(12, 7));

    editarMedicamento(db, medicamento.id, dados({ ...diario, horarios: ['09:00', '21:00'] }), as(12, 8));

    expect(paraEsquemaDominio(buscarEsquemaPorId(db, esquema.id)!)).toMatchObject({ horarios: ['09:00', '21:00'] });
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
  });
});

describe('cadastrar sem adicionar à agenda (1.4)', () => {
  it('fica fora da agenda, sem doses, ignorando "Já estava tomando"', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      {
        ...dados({ tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 10 } }),
        emUso: { dados: { tipo: 'inicio', dataInicio: as(8, 0) }, dosesDeHojeTomadas: ['08:00'] },
      },
      as(12, 10),
      { naAgenda: false },
    );

    expect(buscarMedicamentoPorId(db, medicamento.id)?.naAgenda).toBe(false);
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
    expect(buscarEsquemaPorId(db, esquema.id)?.dataInicio).toBeNull();
    expect(montarAgendaDoDia(db, as(12, 10))).toEqual([]);
  });
  it('"Já estava tomando" que deixou de valer não impede só cadastrar', () => {
    const db = createTestDb();
    const terminado: DadosFormularioMedicamento = {
      ...dados({ tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 7 } }),
      emUso: { dados: { tipo: 'inicio', dataInicio: as(6, 8) }, dosesDeHojeTomadas: [] },
    };
    // Aberta em 12/10 às 23:59 (dia 7 de 7), confirmada depois da meia-noite.
    expect(() => prepararCadastro(terminado, as(13, 0, 1))).toThrow(ErroValidacao);
    expect(() => prepararCadastro({ ...terminado, emUso: undefined }, as(13, 0, 1))).not.toThrow();

    const { medicamento, esquema } = cadastrarMedicamento(db, terminado, as(13, 0, 1), { naAgenda: false });
    expect(buscarMedicamentoPorId(db, medicamento.id)?.naAgenda).toBe(false);
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
  });

  it('"Já estava tomando" que deixou de valer com a agenda ligada traz a mensagem que a confirmação mostra', () => {
    const terminado: DadosFormularioMedicamento = {
      ...dados({ tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 7 } }),
      emUso: { dados: { tipo: 'inicio', dataInicio: as(6, 8) }, dosesDeHojeTomadas: [] },
    };
    let erro: unknown;
    try {
      prepararCadastro(terminado, as(13, 0, 1));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroValidacao);
    expect(Object.values((erro as ErroValidacao).erros)).toContain('Esse tratamento já terminou.');
  });
});

describe('alertas de estoque fora da agenda', () => {
  it('uso contínuo na última caixa fora da agenda não tem alerta', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, { comuns: { ...comuns, quantidadeEmEstoque: 5 }, esquema: diario }, as(12, 7));
    const dominio = paraEsquemaDominio(buscarEsquemaPorId(db, esquema.id)!);
    expect(alertaEstoqueDoMedicamento(db, dominio, buscarMedicamentoPorId(db, medicamento.id)!, as(12, 7))).toEqual({ tipo: 'baixo' });
    retirarDaAgenda(db, medicamento.id, as(12, 7));
    expect(alertaEstoqueDoMedicamento(db, dominio, buscarMedicamentoPorId(db, medicamento.id)!, as(12, 7))).toBeNull();
  });
});

describe('volta à agenda de um cíclico (inicio-de-cartela, 6.2)', () => {
  const ciclico: DadosFormularioMedicamento = {
    comuns: { ...comuns, nome: 'Anticoncepcional', criticidade: 'especial', quantidadeEmEstoque: 28, quantidadePorEmbalagem: 28 },
    esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' },
  };

  it('voltando às 15:00: aguarda a nova cartela com a dose de início hoje às 22:00', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, ciclico, as(10, 9), { naAgenda: false });
    voltar(db, medicamento.id, as(12, 15));

    expect(buscarEsquemaPorId(db, esquema.id)).toMatchObject({ dataInicioCiclo: null, inicioCartelaPrevisto: as(12, 0) });
    expect(listarDosesPorEsquema(db, esquema.id)).toMatchObject([{ dataHoraPrevista: as(12, 22), numeroNoCiclo: 1, status: 'pendente' }]);
    expect(montarAgendaDoDia(db, as(12, 15))).toMatchObject([{ tipo: 'aguardando_cartela', inicioPrevisto: as(12, 22) }]);
  });

  it('voltando às 23:00 sem escolha não salva; com "Começo amanhã" a dose de início é amanhã', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, ciclico, as(10, 9), { naAgenda: false });
    expect(() => voltar(db, medicamento.id, as(12, 23))).toThrow(ErroValidacao);

    adicionarAAgenda(db, medicamento.id, prepararVoltaAAgenda(db, medicamento.id, as(12, 23), 'amanha').previa);
    expect(listarDosesPorEsquema(db, esquema.id)).toMatchObject([{ dataHoraPrevista: as(13, 22), numeroNoCiclo: 1 }]);
  });
});

describe('"Só cadastrar" de um cíclico (fix-revisao-inicio-de-cartela)', () => {
  const ciclico: DadosFormularioMedicamento = {
    comuns: { ...comuns, nome: 'Anticoncepcional', criticidade: 'especial', quantidadeEmEstoque: 28, quantidadePorEmbalagem: 28 },
    esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' },
  };

  it('respondeu "Já tomei hoje" e escolheu só cadastrar: fora da agenda, sem ciclo, sem início e sem doses', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, { ...ciclico, inicioCartela: 'ja_tomei' }, as(12, 23), { naAgenda: false });
    expect(buscarEsquemaPorId(db, esquema.id)).toMatchObject({ dataInicioCiclo: null, inicioCartelaPrevisto: null });
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
  });

  it('com o horário ainda por vir, só cadastrar também não grava início previsto', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, ciclico, as(12, 15), { naAgenda: false });
    expect(buscarEsquemaPorId(db, esquema.id)?.inicioCartelaPrevisto).toBeNull();
  });

  it('volta à agenda depois: "Nova cartela: hoje às 22:00", como um cíclico cadastrado agora', () => {
    const db = createTestDb();
    const { medicamento } = cadastrarMedicamento(db, { ...ciclico, inicioCartela: 'ja_tomei' }, as(12, 23), { naAgenda: false });
    expect(prepararVoltaAAgenda(db, medicamento.id, as(14, 15)).previa.novaCartela).toMatchObject({ pergunta: false, inicio: as(14, 22) });
  });
});
