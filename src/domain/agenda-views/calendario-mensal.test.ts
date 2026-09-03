import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { inserirMedicamento } from '@/db/repositories/medicamentos';
import { confirmarDose } from '@/domain/adherence-history/resolucao';
import type { EsquemaDiario } from '@/domain/dose-scheduling/types';

import { montarCalendarioMensal } from './calendario-mensal';

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
    // Confirmada com atraso, às 9h em vez de 8h.
    confirmarDose(db, esquema, dose.id, new Date(2026, 7, 10, 9, 30));

    const calendario = montarCalendarioMensal(db, HOJE, HOJE);
    const dia10 = encontrarDia(calendario, new Date(2026, 7, 10));

    expect(dia10?.itens).toEqual([
      { tipo: 'historico', medicamentoId, nome: 'Losartana', horario: new Date(2026, 7, 10, 8, 0), status: 'tomada' },
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

    // 14h + 8h = 22h (ainda hoje), +8h = 6h (16/8), +8h = 14h (16/8)...
    expect(encontrarDia(calendario, new Date(2026, 7, 15))?.itens).toEqual([
      { tipo: 'previsto', medicamentoId, nome: 'Analgésico forte', horario: new Date(2026, 7, 15, 14, 0), estimado: true },
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
