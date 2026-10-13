import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema, marcarDosePerdida, resolverDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId, inserirEsquema, paraEsquemaDominio } from '@/db/repositories/esquemas';
import {
  buscarMedicamentoPorId,
  inserirMedicamento,
  listarMedicamentosComEsquema,
  removerMedicamento,
} from '@/db/repositories/medicamentos';
import { doses } from '@/db/schema';
import { identificadorDose } from '@/domain/dose-notifications/reconciliador';
import type { Esquema, EsquemaCiclico } from '@/domain/dose-scheduling/types';
import { cadastrarMedicamento, editarMedicamento } from '@/domain/medication-registration/registration';
import { reporEstoque } from '@/domain/medication-stock/estoque';
import { listarAlvosDesejados } from '@/notifications/contexto';

import {
  adesaoUltimosDias,
  definirNotificacoesAtivas,
  preverFimDoEstoque,
  resumirEsquema,
  situacaoCiclo,
  textoSituacaoCiclo,
  validarQuantidadeCompra,
} from './gestao';

const comuns = { nome: 'Losartana', dosagem: '50 mg', criticidade: 'comum' as const, quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };
const diario = { tipo: 'DIARIO' as const, horarios: ['08:00'], duracao: { modo: 'continuo' as const } };

describe('compra (1.4)', () => {
  it.each(['0', '-3', 'abc', '', '2,5'])('"%s" é inválido', (texto) => {
    expect(validarQuantidadeCompra(texto).ok).toBe(false);
  });

  it('inteiro positivo é válido', () => {
    expect(validarQuantidadeCompra(' 30 ')).toEqual({ ok: true, quantidade: 30 });
  });

  it('reporEstoque soma (2 + 30 = 32) e rejeita quantidade ≤ 0', () => {
    const db = createTestDb();
    const id = inserirMedicamento(db, { ...comuns, quantidadeEmEstoque: 2 }).id;
    reporEstoque(db, id, 30);
    expect(buscarMedicamentoPorId(db, id)?.quantidadeEmEstoque).toBe(32);
    expect(() => reporEstoque(db, id, 0)).toThrow();
    expect(() => reporEstoque(db, id, -5)).toThrow();
    expect(buscarMedicamentoPorId(db, id)?.quantidadeEmEstoque).toBe(32);
  });
});

describe('notificações (1.5 e 1.8)', () => {
  it('silenciar tira as doses do medicamento dos alvos; reativar devolve', () => {
    const db = createTestDb();
    const agora = new Date(2026, 9, 12, 6);
    const { medicamento, esquema } = cadastrarMedicamento(db, { comuns, esquema: diario }, agora);
    const dose = listarDosesPorEsquema(db, esquema.id)[0];
    const alvoDaDose = (alvos: { identifier: string }[]) => alvos.some((a) => a.identifier === identificadorDose(dose.id));

    expect(alvoDaDose(listarAlvosDesejados(db, agora))).toBe(true);
    definirNotificacoesAtivas(db, medicamento.id, false, agora);
    expect(buscarMedicamentoPorId(db, medicamento.id)?.notificacoesAtivas).toBe(false);
    expect(alvoDaDose(listarAlvosDesejados(db, agora))).toBe(false);
    definirNotificacoesAtivas(db, medicamento.id, true, agora);
    expect(alvoDaDose(listarAlvosDesejados(db, agora))).toBe(true);
  });

  it('especial em reenvio editado para comum passa a seguir o limite do comum', () => {
    const db = createTestDb();
    const cadastro = new Date(2026, 9, 12, 6);
    const { medicamento, esquema } = cadastrarMedicamento(db, { comuns: { ...comuns, criticidade: 'especial' }, esquema: diario }, cadastro);
    const dose = listarDosesPorEsquema(db, esquema.id)[0];
    db.update(doses).set({ notificacoesSemResposta: 6, proximaNotificacaoEm: new Date(2026, 9, 12, 11) }).where(eq(doses.id, dose.id)).run();
    const temAlvo = () => listarAlvosDesejados(db, cadastro).some((a) => a.identifier === identificadorDose(dose.id));

    expect(temAlvo()).toBe(true);
    editarMedicamento(db, medicamento.id, { comuns: { ...comuns, criticidade: 'comum' }, esquema: diario }, new Date(2026, 9, 12, 10));
    expect(temAlvo()).toBe(false);
  });
});

describe('lista (1.6)', () => {
  it('ordem alfabética em pt-BR e removidos de fora', () => {
    const db = createTestDb();
    const agora = new Date(2026, 9, 12);
    cadastrarMedicamento(db, { comuns: { ...comuns, nome: 'vitamina D' }, esquema: diario }, agora);
    cadastrarMedicamento(db, { comuns: { ...comuns, nome: 'Ácido fólico' }, esquema: diario }, agora);
    const { medicamento } = cadastrarMedicamento(db, { comuns: { ...comuns, nome: 'Removido' }, esquema: diario }, agora);
    cadastrarMedicamento(db, { comuns: { ...comuns, nome: 'Losartana' }, esquema: diario }, agora);
    removerMedicamento(db, medicamento.id, agora);

    expect(listarMedicamentosComEsquema(db).map((item) => item.medicamento.nome)).toEqual([
      'Ácido fólico',
      'Losartana',
      'vitamina D',
    ]);
  });

  it('resume cada tipo de esquema', () => {
    const base = { id: 'e', medicamentoId: 'm', dataInicio: new Date(2026, 9, 1), duracaoDias: null };
    const casos: [Esquema, string][] = [
      [{ ...base, tipo: 'DIARIO', horarios: ['08:00', '20:00'] }, 'Diário · 08:00, 20:00'],
      [{ ...base, tipo: 'INTERVALO_HORAS', intervaloHoras: 8 }, 'A cada 8 h'],
      [{ ...base, tipo: 'DIAS_SEMANA', diasDaSemana: [5, 1, 3], horarios: ['08:00'] }, 'Seg, Qua, Sex · 08:00'],
      [
        { id: 'e', medicamentoId: 'm', tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horarios: ['22:00'], dataInicioCiclo: null },
        'Cíclico 21/7 · 22:00',
      ],
      [{ id: 'e', medicamentoId: 'm', tipo: 'SE_NECESSARIO', limiteDiario: 4 }, 'Se necessário · até 4 por dia'],
    ];
    for (const [esquema, texto] of casos) expect(resumirEsquema(esquema)).toBe(texto);
  });
});

describe('situação do ciclo (1.9)', () => {
  const ciclo = (inicio: Date | null): EsquemaCiclico => ({
    id: 'e',
    medicamentoId: 'm',
    tipo: 'CICLICO',
    diasAtivos: 21,
    diasPausa: 7,
    horarios: ['22:00'],
    dataInicioCiclo: inicio,
  });
  const inicio = new Date(2026, 9, 1, 22);

  it('dia ativo', () => {
    expect(textoSituacaoCiclo(situacaoCiclo(ciclo(inicio), new Date(2026, 9, 12)))).toBe('Dia 12 de 21');
  });

  it('5º dia de pausa: volta em 3 dias', () => {
    expect(textoSituacaoCiclo(situacaoCiclo(ciclo(inicio), new Date(2026, 9, 26)))).toBe('Em pausa · volta em 3 dias');
  });

  it('último dia de pausa: volta amanhã', () => {
    expect(textoSituacaoCiclo(situacaoCiclo(ciclo(inicio), new Date(2026, 9, 28)))).toBe('Em pausa · volta amanhã');
  });

  it('sem ciclo ou depois da pausa: aguardando nova cartela', () => {
    expect(situacaoCiclo(ciclo(null), new Date(2026, 9, 12))).toEqual({ tipo: 'aguardando_cartela' });
    expect(situacaoCiclo(ciclo(inicio), new Date(2026, 9, 29))).toEqual({ tipo: 'aguardando_cartela' });
  });
});

describe('adesão dos últimos 7 dias (1.10)', () => {
  function cenario(cadastroDia: number) {
    const db = createTestDb();
    const { medicamento, esquema } = cadastrarMedicamento(db, { comuns, esquema: diario }, new Date(2026, 9, cadastroDia, 6));
    const porDia = (dia: number) =>
      listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista?.getDate() === dia && d.dataHoraPrevista.getMonth() === 9)!;
    return { db, medicamentoId: medicamento.id, porDia };
  }

  it('semana com 6 tomadas e 1 perdida; pendente de hoje fora do total', () => {
    const { db, medicamentoId, porDia } = cenario(5);
    for (let dia = 6; dia <= 11; dia++) {
      const dose = porDia(dia);
      if (dia === 9) marcarDosePerdida(db, dose.id, dose.dataHoraPrevista!);
      else resolverDose(db, dose.id, { status: 'tomada', dataHoraRegistro: dose.dataHoraPrevista! });
    }
    // 12/10 (hoje) ainda pendente.
    const r = adesaoUltimosDias(db, medicamentoId, new Date(2026, 9, 12, 10));
    expect(r.dias.map((d) => d.pior)).toEqual(['tomada', 'tomada', 'tomada', 'perdida', 'tomada', 'tomada', null]);
    expect([r.tomadas, r.total]).toEqual([5, 6]);
  });

  it('cadastro recente: dias anteriores neutros e total só do que existe', () => {
    const { db, medicamentoId, porDia } = cenario(10);
    for (const dia of [10, 11, 12]) resolverDose(db, porDia(dia).id, { status: 'tomada', dataHoraRegistro: porDia(dia).dataHoraPrevista! });
    const r = adesaoUltimosDias(db, medicamentoId, new Date(2026, 9, 12, 10));
    expect(r.dias.map((d) => d.pior)).toEqual([null, null, null, null, 'tomada', 'tomada', 'tomada']);
    expect([r.tomadas, r.total]).toEqual([3, 3]);
  });
});

describe('previsão do estoque (1.11)', () => {
  const agora = new Date(2026, 9, 12, 10);
  const base = { id: 'e', medicamentoId: 'm', dataInicio: new Date(2026, 9, 1), duracaoDias: null };

  it('diário 08:00 com 12 unidades e a de hoje já tomada: dura até 24/10', () => {
    expect(preverFimDoEstoque({ ...base, tipo: 'DIARIO', horarios: ['08:00'] }, 12, agora)).toEqual({
      tipo: 'data',
      data: new Date(2026, 9, 24, 8),
      aproximada: false,
    });
  });

  it('dias da semana: só os dias configurados consomem', () => {
    // seg/qua/sex às 14:00 a partir de seg 12/10 10h: 12, 14, 16 → a 3ª é sex 16/10.
    expect(preverFimDoEstoque({ ...base, tipo: 'DIAS_SEMANA', diasDaSemana: [1, 3, 5], horarios: ['14:00'] }, 3, agora)).toMatchObject({
      tipo: 'data',
      data: new Date(2026, 9, 16, 14),
    });
  });

  it('cíclico atravessando a pausa cai num dia ativo do ciclo seguinte', () => {
    const esquema: EsquemaCiclico = {
      id: 'e',
      medicamentoId: 'm',
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['22:00'],
      dataInicioCiclo: new Date(2026, 9, 1, 22),
    };
    // Hoje 12/10 é o dia 12: restam 10 neste ciclo (12..21/10); a 11ª é o dia 1 do próximo (29/10).
    const previsao = preverFimDoEstoque(esquema, 11, agora);
    expect(previsao).toEqual({ tipo: 'data', data: new Date(2026, 9, 29, 22), aproximada: true });
  });

  it('intervalo em horas é aproximado', () => {
    const previsao = preverFimDoEstoque({ ...base, tipo: 'INTERVALO_HORAS', intervaloHoras: 8 }, 3, agora, new Date(2026, 9, 12, 14));
    expect(previsao).toEqual({ tipo: 'data', data: new Date(2026, 9, 13, 6), aproximada: true });
  });

  it('estoque zero acabou; se necessário e cíclico aguardando não têm previsão', () => {
    expect(preverFimDoEstoque({ ...base, tipo: 'DIARIO', horarios: ['08:00'] }, 0, agora)).toEqual({ tipo: 'acabou' });
    expect(preverFimDoEstoque({ id: 'e', medicamentoId: 'm', tipo: 'SE_NECESSARIO', limiteDiario: 4 }, 10, agora)).toBeNull();
    expect(
      preverFimDoEstoque(
        { id: 'e', medicamentoId: 'm', tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horarios: ['22:00'], dataInicioCiclo: null },
        10,
        agora,
      ),
    ).toBeNull();
  });

  it('limite de 2 anos e tratamento que termina antes do estoque', () => {
    expect(preverFimDoEstoque({ ...base, tipo: 'DIARIO', horarios: ['08:00'] }, 5000, agora)).toEqual({ tipo: 'mais_de_2_anos' });
    expect(preverFimDoEstoque({ ...base, tipo: 'DIARIO', horarios: ['08:00'], duracaoDias: 15 }, 100, agora)).toEqual({ tipo: 'sobra' });
  });
});

describe('integração com o banco', () => {
  it('cíclico do banco vira domínio para a situação do ciclo', () => {
    const db = createTestDb();
    const medicamentoId = inserirMedicamento(db, comuns).id;
    const id = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 9, 1, 22),
      horarios: ['22:00'],
    }).id;
    const esquema = paraEsquemaDominio(buscarEsquemaPorId(db, id)!) as EsquemaCiclico;
    expect(textoSituacaoCiclo(situacaoCiclo(esquema, new Date(2026, 9, 12)))).toBe('Dia 12 de 21');
  });
});
