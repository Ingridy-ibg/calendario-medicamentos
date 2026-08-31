import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { listarDosesPorEsquema } from '@/db/repositories/doses';
import { inserirEsquema } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId, inserirMedicamento } from '@/db/repositories/medicamentos';
import type { EsquemaSeNecessario } from '@/domain/dose-scheduling/types';

import { registrarDoseSeNecessarioNoBanco } from './se-necessario';

function criarEsquema(db: TestDb, limiteDiario: number): EsquemaSeNecessario {
  const medicamentoId = inserirMedicamento(db, {
    nome: 'Analgésico',
    dosagem: '1 comprimido',
    criticidade: 'comum',
    quantidadeEmEstoque: 20,
    quantidadePorEmbalagem: 20,
  }).id;
  const esquemaId = inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario }).id;
  return { id: esquemaId, medicamentoId, tipo: 'SE_NECESSARIO', limiteDiario };
}

describe('registrarDoseSeNecessarioNoBanco', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('grava a dose sem horário previsto, com o horário real do registro e status tomada', () => {
    const esquema = criarEsquema(db, 4);
    const agora = new Date(2026, 0, 10, 14, 30);

    const { dose, avisoLimiteExcedido } = registrarDoseSeNecessarioNoBanco(db, esquema, agora);

    expect(dose.dataHoraPrevista).toBeNull();
    expect(dose.dataHoraRegistro).toEqual(agora);
    expect(dose.status).toBe('tomada');
    expect(avisoLimiteExcedido).toBe(false);
  });

  it('não avisa enquanto o total do dia está abaixo do limite, e avisa ao ultrapassar — sem bloquear', () => {
    const esquema = criarEsquema(db, 2);
    const dia = (hora: number) => new Date(2026, 0, 10, hora);

    expect(registrarDoseSeNecessarioNoBanco(db, esquema, dia(8)).avisoLimiteExcedido).toBe(false);
    expect(registrarDoseSeNecessarioNoBanco(db, esquema, dia(12)).avisoLimiteExcedido).toBe(false);
    // 3ª do dia, limite é 2 — ultrapassa, mas ainda registra.
    expect(registrarDoseSeNecessarioNoBanco(db, esquema, dia(18)).avisoLimiteExcedido).toBe(true);

    expect(listarDosesPorEsquema(db, esquema.id)).toHaveLength(3);
  });

  it('conta só as doses do mesmo dia — o limite reseta a cada dia', () => {
    const esquema = criarEsquema(db, 1);

    expect(registrarDoseSeNecessarioNoBanco(db, esquema, new Date(2026, 0, 10, 23, 0)).avisoLimiteExcedido).toBe(
      false,
    );
    // Dia seguinte: mesmo esquema, contador reiniciado.
    expect(registrarDoseSeNecessarioNoBanco(db, esquema, new Date(2026, 0, 11, 0, 30)).avisoLimiteExcedido).toBe(
      false,
    );
  });

  it('nunca produz tomada com atraso ou perdida', () => {
    const esquema = criarEsquema(db, 1);
    const { dose } = registrarDoseSeNecessarioNoBanco(db, esquema, new Date(2026, 0, 10, 8, 0));
    expect(dose.status).toBe('tomada');
  });

  it('decrementa o estoque do medicamento em uma unidade a cada registro (specs/medication-stock)', () => {
    const esquema = criarEsquema(db, 4);
    registrarDoseSeNecessarioNoBanco(db, esquema, new Date(2026, 0, 10, 8, 0));
    registrarDoseSeNecessarioNoBanco(db, esquema, new Date(2026, 0, 10, 14, 0));
    expect(buscarMedicamentoPorId(db, esquema.medicamentoId)?.quantidadeEmEstoque).toBe(18);
  });
});
