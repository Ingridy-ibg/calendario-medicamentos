import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';
import { montarCalendarioMensal } from '@/domain/agenda-views/calendario-mensal';
import { renovarJanelasAtivas } from '@/domain/dose-scheduling/janela-rolante';
import { alertaEstoqueDoMedicamento } from '@/domain/medication-stock/situacao';
import { listarAlvosDesejados } from '@/notifications/contexto';

import { adicionarAAgenda, cadastrarMedicamento, editarMedicamento, retirarDaAgenda } from './registration';
import type { DadosEsquemaFormulario, DadosFormularioMedicamento } from './types';

const as = (dia: number, h: number, m = 0) => new Date(2026, 9, dia, h, m); // outubro de 2026
const comuns = { nome: 'X', dosagem: '1', criticidade: 'comum' as const, quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };
const dados = (esquema: DadosEsquemaFormulario): DadosFormularioMedicamento => ({ comuns, esquema });
const diario: DadosEsquemaFormulario = { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } };

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

    adicionarAAgenda(db, medicamento.id, as(12, 10));

    const futuras = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente').map((d) => d.data);
    expect(futuras).toEqual(Array.from({ length: 7 }, (_, i) => as(12 + i, 20)));
    expect(buscarMedicamentoPorId(db, medicamento.id)?.naAgenda).toBe(true);
  });

  it('voltar às 10:00 não cria a dose das 08:00 de hoje', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, dados(diario), as(1, 7));
    retirarDaAgenda(db, medicamento.id, as(2, 7));

    adicionarAAgenda(db, medicamento.id, as(12, 10));

    const pendentes = datasDoEsquema(db, esquema.id).filter((d) => d.status === 'pendente');
    expect(pendentes[0].data).toEqual(as(13, 8));
  });

  it('intervalo em horas volta com a primeira dose agora', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(
      db,
      { ...dados({ tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } }), emUso: { dados: { tipo: 'intervalo', ultimaDose: as(1, 6) }, dosesDeHojeTomadas: [] } },
      as(1, 7),
    );
    retirarDaAgenda(db, medicamento.id, as(2, 7));

    adicionarAAgenda(db, medicamento.id, as(12, 10));

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

    adicionarAAgenda(db, medicamento.id, as(12, 10));

    expect(buscarEsquemaPorId(db, esquema.id)?.dataInicioCiclo).toBeNull();
    expect(montarAgendaDoDia(db, as(12, 10))).toMatchObject([{ tipo: 'aguardando_cartela' }]);
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
