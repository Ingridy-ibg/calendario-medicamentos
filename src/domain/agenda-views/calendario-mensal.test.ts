import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose, listarDosesPorEsquema } from '@/db/repositories/doses';
import { buscarEsquemaPorId, inserirEsquema, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';
import { confirmarDose } from '@/domain/adherence-history/resolucao';
import type { EsquemaDiario } from '@/domain/dose-scheduling/types';
import { cadastrarMedicamento } from '@/domain/medication-registration/registration';

import { montarCalendarioMensal } from './calendario-mensal';
import { marcadorDoDia } from './marcador-dia';

// Agosto de 2026 inteiro tem 31 dias.
const HOJE = new Date(2026, 7, 15, 9, 0);

function encontrarDia(calendario: ReturnType<typeof montarCalendarioMensal>, dia: Date) {
  return calendario.find((d) => d.dia.getTime() === new Date(dia.getFullYear(), dia.getMonth(), dia.getDate()).getTime());
}

describe('montarCalendarioMensal', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('enumera todos os dias do mês, mesmo os sem nenhum item', () => {
    const calendario = montarCalendarioMensal(db, HOJE, HOJE);
    expect(calendario).toHaveLength(31);
    expect(calendario[0].dia).toEqual(new Date(2026, 7, 1));
    expect(calendario[30].dia).toEqual(new Date(2026, 7, 31));
  });

  it('dia passado mostra o histórico real registrado, não uma grade reestimada', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: new Date(2026, 7, 10),
    };
    const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 10, 8, 0) });
    // Confirmada com atraso, às 9h30 em vez de 8h (mais de 30 min depois).
    confirmarDose(db, esquema, dose.id, new Date(2026, 7, 10, 9, 30));

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);
    const dia10 = encontrarDia(calendario, new Date(2026, 7, 10));

    expect(dia10?.itens).toEqual([
      {
        tipo: 'historico',
        medicamentoId,
        nome: 'Losartana',
        horario: new Date(2026, 7, 10, 8, 0),
        status: 'tomada_com_atraso',
        atrasada: false,
      },
    ]);
  });

  it('dia futuro de um esquema diário mostra o horário definitivo', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Metformina',
      dosagem: '850mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 60,
      quantidadePorEmbalagem: 60,
    }).id;
    inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00', '20:00'] });

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);
    const dia20 = encontrarDia(calendario, new Date(2026, 7, 20));

    expect(dia20?.itens).toEqual([
      { tipo: 'previsto', medicamentoId, nome: 'Metformina', horario: new Date(2026, 7, 20, 8, 0), estimado: false },
      { tipo: 'previsto', medicamentoId, nome: 'Metformina', horario: new Date(2026, 7, 20, 20, 0), estimado: false },
    ]);
  });

  it('dia futuro ativo de um cíclico mostra o horário definitivo; dia de pausa mostra o lembrete leve', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 7, 1),
      horarios: ['08:00'],
    });

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);

    // Ativo: 1..21/8. Pausa: 22..28/8.
    expect(encontrarDia(calendario, new Date(2026, 7, 20))?.itens).toEqual([
      { tipo: 'previsto', medicamentoId, nome: 'Anticoncepcional', horario: new Date(2026, 7, 20, 8, 0), estimado: false },
    ]);
    expect(encontrarDia(calendario, new Date(2026, 7, 25))?.itens).toEqual([
      { tipo: 'pausa-ciclo', medicamentoId, nome: 'Anticoncepcional' },
    ]);
  });

  it('dia futuro de intervalo em horas mostra uma estimativa, não um horário garantido', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico forte',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 40,
      quantidadePorEmbalagem: 40,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'INTERVALO_HORAS', medicamentoId, intervaloHoras: 8 }).id;
    // Âncora real: próxima dose pendente, hoje às 14h.
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 15, 14, 0) });

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);

    // Hoje: a dose real das 14h (pendente) + a estimada das 22h; depois 6h, 14h, 22h (16/8)...
    expect(encontrarDia(calendario, new Date(2026, 7, 15))?.itens).toEqual([
      {
        tipo: 'historico',
        medicamentoId,
        nome: 'Analgésico forte',
        horario: new Date(2026, 7, 15, 14, 0),
        status: 'pendente',
        atrasada: false,
      },
      { tipo: 'previsto', medicamentoId, nome: 'Analgésico forte', horario: new Date(2026, 7, 15, 22, 0), estimado: true },
    ]);
    expect(encontrarDia(calendario, new Date(2026, 7, 16))?.itens).toEqual([
      { tipo: 'previsto', medicamentoId, nome: 'Analgésico forte', horario: new Date(2026, 7, 16, 6, 0), estimado: true },
      { tipo: 'previsto', medicamentoId, nome: 'Analgésico forte', horario: new Date(2026, 7, 16, 14, 0), estimado: true },
      { tipo: 'previsto', medicamentoId, nome: 'Analgésico forte', horario: new Date(2026, 7, 16, 22, 0), estimado: true },
    ]);
  });

  it('"se necessário" nunca aparece com doses previstas em dias futuros', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 20,
      quantidadePorEmbalagem: 20,
    }).id;
    inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 4 });

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);

    expect(calendario.every((dia) => dia.itens.length === 0)).toBe(true);
  });
});

describe('montarCalendarioMensal — hoje com as doses reais e atrasadas', () => {
  const comuns = { nome: 'L', dosagem: '1', quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };
  const diario = { tipo: 'DIARIO' as const, horarios: ['08:00'], duracao: { modo: 'continuo' as const } };
  const diaDe = (dias: ReturnType<typeof montarCalendarioMensal>, n: number) => dias.find((d) => d.dia.getDate() === n)!;

  it('dose de hoje tomada às 08:05: histórico tomada e ponto cheio de tomada', () => {
    const db = createTestDb();
    const { esquema } = cadastrarMedicamento(db, { comuns: { ...comuns, criticidade: 'comum' }, esquema: diario }, new Date(2026, 9, 12, 7));
    const dominio = paraEsquemaDominio(buscarEsquemaPorId(db, esquema.id)!);
    const dose = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getDate() === 12)!;
    confirmarDose(db, dominio, dose.id, new Date(2026, 9, 12, 8, 5));

    const hoje = diaDe(montarCalendarioMensal(db, new Date(2026, 9, 1), new Date(2026, 9, 12, 10)), 12);
    expect(hoje.itens).toMatchObject([{ tipo: 'historico', status: 'tomada', atrasada: false }]);
    expect(marcadorDoDia(hoje.itens)).toEqual({ token: 'statusTomada', estilo: 'cheio' });
  });

  it('às 07:00 a dose de hoje aparece pendente, em contorno', () => {
    const db = createTestDb();
    cadastrarMedicamento(db, { comuns: { ...comuns, criticidade: 'comum' }, esquema: diario }, new Date(2026, 9, 12, 6));
    const hoje = diaDe(montarCalendarioMensal(db, new Date(2026, 9, 1), new Date(2026, 9, 12, 7)), 12);
    expect(hoje.itens).toMatchObject([{ tipo: 'historico', status: 'pendente', atrasada: false }]);
    expect(marcadorDoDia(hoje.itens)).toEqual({ token: 'accent', estilo: 'contorno' });
  });

  it('especial de ontem sem resposta: atrasada, contorno âmbar', () => {
    const db = createTestDb();
    cadastrarMedicamento(db, { comuns: { ...comuns, criticidade: 'especial' }, esquema: diario }, new Date(2026, 9, 11, 7));
    const ontem = diaDe(montarCalendarioMensal(db, new Date(2026, 9, 1), new Date(2026, 9, 12, 10)), 11);
    expect(ontem.itens).toMatchObject([{ tipo: 'historico', status: 'pendente', atrasada: true }]);
    expect(marcadorDoDia(ontem.itens)).toEqual({ token: 'statusAtraso', estilo: 'contorno' });
  });
});
