import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { buscarDosePorId, listarDosesPorEsquema } from '@/db/repositories/doses';
import { definirNotificacoesAtivas } from '@/domain/medication-management/gestao';
import { cadastrarMedicamento } from '@/domain/medication-registration/registration';

import { marcarPerdidasPorTempo } from './perdidas';

const as = (h: number, m = 0) => new Date(2026, 9, 12, h, m);
const diario = { tipo: 'DIARIO' as const, horarios: ['08:00'], duracao: { modo: 'continuo' as const } };
const comuns = { nome: 'X', dosagem: '1', criticidade: 'comum' as const, quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 };

function doseDas8(criticidade: 'comum' | 'especial', silenciado = false) {
  const db = createTestDb();
  const { medicamento, esquema } = cadastrarMedicamento(db, { comuns: { ...comuns, criticidade }, esquema: diario }, as(7));
  if (silenciado) definirNotificacoesAtivas(db, medicamento.id, false);
  const dose = listarDosesPorEsquema(db, esquema.id).find((d) => d.dataHoraPrevista!.getTime() === as(8).getTime())!;
  return { db, doseId: dose.id };
}

describe('marcarPerdidasPorTempo', () => {
  it('comum das 08:00 sem resposta: ainda pendente às 09:59, perdida às 10:01', () => {
    const { db, doseId } = doseDas8('comum');
    expect(marcarPerdidasPorTempo(db, as(9, 59))).toEqual([]);
    expect(marcarPerdidasPorTempo(db, as(10, 1))).toEqual([doseId]);
    expect(buscarDosePorId(db, doseId)?.status).toBe('perdida');
  });

  it('especial nunca vira perdida', () => {
    const { db, doseId } = doseDas8('especial');
    marcarPerdidasPorTempo(db, as(23));
    expect(buscarDosePorId(db, doseId)?.status).toBe('pendente');
  });

  it('silenciado segue a mesma regra', () => {
    const { db, doseId } = doseDas8('comum', true);
    marcarPerdidasPorTempo(db, as(10, 1));
    expect(buscarDosePorId(db, doseId)?.status).toBe('perdida');
  });

  it('rodar duas vezes não muda nada', () => {
    const { db } = doseDas8('comum');
    marcarPerdidasPorTempo(db, as(10, 1));
    expect(marcarPerdidasPorTempo(db, as(10, 2))).toEqual([]);
  });
});
