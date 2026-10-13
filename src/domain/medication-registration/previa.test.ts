import { startOfDay } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema } from '@/db/repositories/doses';
import { buscarEsquemaPorId, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { montarAgendaDoDia } from '@/domain/agenda-views/agenda-diaria';

import { montarPreviaCadastro } from './previa';
import { cadastrarMedicamento, ErroValidacao } from './registration';
import type { CamposComunsFormulario, DadosFormularioMedicamento } from './types';
import { validarEmUso } from './validation';

const as = (dia: number, h: number, m = 0) => new Date(2026, 9, dia, h, m); // outubro de 2026; 12/10 é segunda
const comuns: CamposComunsFormulario = { nome: 'X', dosagem: '1', criticidade: 'comum', quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };

const amoxicilina: DadosFormularioMedicamento = {
  comuns: { ...comuns, nome: 'Amoxicilina', quantidadeEmEstoque: 8 },
  esquema: { tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracao: { modo: 'dias', dias: 10 } },
  emUso: { dados: { tipo: 'inicio', dataInicio: as(8, 0) }, dosesDeHojeTomadas: ['08:00'] },
};

const anticoncepcional = (fase: 'ativo' | 'pausa', dia: number, estoque = 31): DadosFormularioMedicamento => ({
  comuns: { ...comuns, nome: 'Anticoncepcional', criticidade: 'especial', quantidadeEmEstoque: estoque, quantidadePorEmbalagem: 21 },
  esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' },
  emUso: { dados: { tipo: 'ciclo', fase, dia }, dosesDeHojeTomadas: [] },
});

const intervalo = (ultimaDose: Date): DadosFormularioMedicamento => ({
  comuns,
  esquema: { tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracao: { modo: 'continuo' } },
  emUso: { dados: { tipo: 'intervalo', ultimaDose }, dosesDeHojeTomadas: [] },
});

describe('duração fixa conta a partir do início informado (1.2)', () => {
  it('diário de 10 dias iniciado em 08/10 e cadastrado em 12/10 termina em 17/10', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, amoxicilina, as(12, 10));
    const datas = listarDosesPorEsquema(db, esquema.id).map((d) => d.dataHoraPrevista!);
    expect(Math.max(...datas.map((d) => d.getTime()))).toBe(as(17, 20).getTime());
    expect(datas.some((d) => d >= as(18, 0))).toBe(false);
    expect(paraEsquemaDominio(buscarEsquemaPorId(db, esquema.id)!)).toMatchObject({ dataInicio: as(8, 0) });
  });
});

describe('primeira dose do intervalo a partir da última (1.3)', () => {
  it('última às 06:00, cadastro às 10:00: primeira às 14:00', () => {
    const previa = montarPreviaCadastro(intervalo(as(12, 6)), as(12, 10));
    expect(previa.proximasDoses).toEqual([as(12, 14)]);
    expect(previa.primeiraDosePrevistaOriginal).toBeNull();
  });

  it('cadastro às 16:00: primeira agora, informando que estava prevista às 14:00', () => {
    const previa = montarPreviaCadastro(intervalo(as(12, 6)), as(12, 16));
    expect(previa.proximasDoses).toEqual([as(12, 16)]);
    expect(previa.primeiraDosePrevistaOriginal).toEqual(as(12, 14));
  });
});

describe('cíclico já em andamento (1.4)', () => {
  it('dia 12 de 21: doses de 12/10 a 21/10, pausa 22–28/10, nova cartela prevista 29/10', () => {
    const db = createTestDb();
    const { esquema, previa } = cadastrarMedicamento(db, anticoncepcional('ativo', 12), as(12, 10));
    const doses = listarDosesPorEsquema(db, esquema.id).sort((a, b) => a.dataHoraPrevista!.getTime() - b.dataHoraPrevista!.getTime());
    expect(doses.map((d) => [d.dataHoraPrevista!.getDate(), d.numeroNoCiclo])).toEqual(
      Array.from({ length: 10 }, (_, i) => [12 + i, 12 + i]),
    );
    expect(previa.cartela).toMatchObject({
      restantesNaCartela: 10,
      ultimoDaCartela: as(21, 22),
      pausaDe: startOfDay(as(22, 0)),
      pausaAte: startOfDay(as(28, 0)),
      novaCartelaPrevista: startOfDay(as(29, 0)),
    });
    expect(montarAgendaDoDia(db, as(29, 9))).toMatchObject([{ tipo: 'aguardando_cartela' }]);
  });

  it('dia 3 da pausa: nenhuma dose, pausa até 16/10, aguardando a partir de 17/10', () => {
    const db = createTestDb();
    const { esquema, previa } = cadastrarMedicamento(db, anticoncepcional('pausa', 3), as(12, 10));
    expect(listarDosesPorEsquema(db, esquema.id)).toEqual([]);
    expect(previa.cartela).toMatchObject({ pausaAte: startOfDay(as(16, 0)), novaCartelaPrevista: startOfDay(as(17, 0)) });
    expect(montarAgendaDoDia(db, as(16, 9))).toEqual([]);
    expect(montarAgendaDoDia(db, as(17, 9))).toMatchObject([{ tipo: 'aguardando_cartela' }]);
  });
});

describe('horário de hoje já passado num cadastro novo (1.5)', () => {
  it('às 15:00 de segunda, seg/qua/sex às 14:00: nenhuma dose hoje, próxima qua 14:00', () => {
    const db = createTestDb();
    const dados: DadosFormularioMedicamento = {
      comuns,
      esquema: { tipo: 'DIAS_SEMANA', diasDaSemana: [1, 3, 5], horarios: ['14:00'], duracao: { modo: 'continuo' } },
    };
    const { esquema, previa } = cadastrarMedicamento(db, dados, as(12, 15));
    expect(listarDosesPorEsquema(db, esquema.id).some((d) => d.dataHoraPrevista!.getDate() === 12)).toBe(false);
    expect(previa.proximasDoses[0]).toEqual(as(14, 14));
  });
});

describe('validarEmUso (2.1)', () => {
  const agora = as(12, 10);
  it('início no futuro', () => {
    expect(validarEmUso({ ...amoxicilina, emUso: { dados: { tipo: 'inicio', dataInicio: as(13, 0) }, dosesDeHojeTomadas: [] } }, agora)).toHaveProperty('dataInicio');
  });
  it('tratamento já terminou', () => {
    const dados: DadosFormularioMedicamento = {
      ...amoxicilina,
      esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'dias', dias: 7 } },
      emUso: { dados: { tipo: 'inicio', dataInicio: as(2, 0) }, dosesDeHojeTomadas: [] },
    };
    expect(validarEmUso(dados, agora)).toEqual({ dataInicio: 'Esse tratamento já terminou.' });
  });
  it('última dose no futuro', () => {
    expect(validarEmUso(intervalo(as(12, 11)), agora)).toHaveProperty('ultimaDose');
  });
  it('dia da cartela fora da faixa', () => {
    expect(validarEmUso(anticoncepcional('ativo', 25), agora)).toHaveProperty('diaCiclo');
    expect(validarEmUso(anticoncepcional('pausa', 8), agora)).toHaveProperty('diaCiclo');
    expect(validarEmUso(anticoncepcional('ativo', 21), agora)).toEqual({});
  });
  it('o cadastro recusa e não grava nada', () => {
    const db = createTestDb();
    expect(() => cadastrarMedicamento(db, anticoncepcional('ativo', 25), agora)).toThrow(ErroValidacao);
  });
});

describe('prévia (2.2)', () => {
  it('tratamento dia 5 de 10 com 8 unidades: faltam 11 doses, acaba em 16/10 08:00, faltam 3', () => {
    const previa = montarPreviaCadastro(amoxicilina, as(12, 10));
    expect(previa.tratamento).toMatchObject({ diaAtual: 5, totalDias: 10, dosesRestantes: 11, ultimaDose: as(17, 20) });
    expect(previa.estoque.insuficiente).toEqual({ dosesRestantes: 11, faltam: 3, acabaEm: as(16, 8) });
    expect(previa.hoje).toEqual({ tomadas: [as(12, 8)], aAgendar: [as(12, 20)] });
    expect(previa.diasSemRegistro).toEqual({ de: startOfDay(as(8, 0)), ate: startOfDay(as(11, 0)) });
  });

  it('cíclico dia 12 com 31 unidades: esta cartela + 1 fechada, dura até 18/11', () => {
    const previa = montarPreviaCadastro(anticoncepcional('ativo', 12), as(12, 10));
    expect(previa.estoque.cartelasFechadas).toBe(1);
    expect(previa.estoque.previsao).toEqual({ tipo: 'data', data: new Date(2026, 10, 18, 22), aproximada: true });
    expect(previa.diasSemRegistro).toEqual({ de: startOfDay(as(1, 0)), ate: startOfDay(as(11, 0)) });
  });

  it('medicamento novo sem "já estava tomando": sem dias sem registro nem tratamento', () => {
    const previa = montarPreviaCadastro({ comuns, esquema: { tipo: 'DIARIO', horarios: ['20:00'], duracao: { modo: 'continuo' } } }, as(12, 10));
    expect(previa.diasSemRegistro).toBeNull();
    expect(previa.tratamento).toBeNull();
    expect(previa.proximasDoses[0]).toEqual(as(12, 20));
  });
});

describe('gravação a partir da prévia (2.3)', () => {
  it('dose de hoje marcada vira tomada sem descontar estoque; não marcada some; dias anteriores sem registro', () => {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, amoxicilina, as(12, 10));
    const doses = listarDosesPorEsquema(db, esquema.id);
    expect(doses.find((d) => d.dataHoraPrevista!.getTime() === as(12, 8).getTime())).toMatchObject({
      status: 'tomada',
      dataHoraRegistro: as(12, 8),
    });
    expect(doses.find((d) => d.dataHoraPrevista!.getTime() === as(12, 20).getTime())?.status).toBe('pendente');
    expect(doses.some((d) => d.dataHoraPrevista! < startOfDay(as(12, 0)))).toBe(false);
    expect(buscarMedicamentoPorId(db, medicamento.id)?.quantidadeEmEstoque).toBe(8);
  });

  it('dose de hoje não marcada não fica pendente nem perdida', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, { ...amoxicilina, emUso: { ...amoxicilina.emUso!, dosesDeHojeTomadas: [] } }, as(12, 10));
    expect(listarDosesPorEsquema(db, esquema.id).some((d) => d.dataHoraPrevista!.getTime() === as(12, 8).getTime())).toBe(false);
  });

  it('intervalo: a última dose de hoje entra no histórico como tomada', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, intervalo(as(12, 6)), as(12, 10));
    const doses = listarDosesPorEsquema(db, esquema.id).map((d) => [d.dataHoraPrevista!.getHours(), d.status]);
    expect(doses).toEqual(expect.arrayContaining([[6, 'tomada'], [14, 'pendente']]));
  });
});
