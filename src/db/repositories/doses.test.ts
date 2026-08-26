import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../create-test-db';
import {
  buscarDosePorId,
  inserirDose,
  listarDosesPorEsquema,
  resolverDose,
  substituirDosesFuturas,
} from './doses';
import { inserirEsquema } from './esquemas';
import { inserirMedicamento } from './medicamentos';

describe('repositório de doses', () => {
  let db: TestDb;
  let esquemaId: string;

  beforeEach(() => {
    db = createTestDb();
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Medicamento de teste',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 10,
      quantidadePorEmbalagem: 10,
    }).id;
    esquemaId = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00'],
    }).id;
  });

  it('insere, lê e atualiza uma dose', () => {
    const dataHoraPrevista = new Date('2026-08-26T08:00:00.000Z');
    const inserida = inserirDose(db, { esquemaId, dataHoraPrevista });

    expect(buscarDosePorId(db, inserida.id)).toMatchObject({
      status: 'pendente',
      dataHoraRegistro: null,
    });

    const dataHoraRegistro = new Date('2026-08-26T08:05:00.000Z');
    const resolvida = resolverDose(db, inserida.id, { status: 'tomada', dataHoraRegistro });

    expect(resolvida).toMatchObject({ status: 'tomada' });
    expect(resolvida?.dataHoraRegistro).toEqual(dataHoraRegistro);
  });

  it('regra 2.5: substituirDosesFuturas nunca apaga uma dose já registrada', () => {
    const doseResolvida = inserirDose(db, {
      esquemaId,
      dataHoraPrevista: new Date('2026-08-25T08:00:00.000Z'),
    });
    resolverDose(db, doseResolvida.id, {
      status: 'tomada',
      dataHoraRegistro: new Date('2026-08-25T08:02:00.000Z'),
    });

    const dosePendenteAntiga = inserirDose(db, {
      esquemaId,
      dataHoraPrevista: new Date('2026-08-27T08:00:00.000Z'),
    });

    substituirDosesFuturas(db, esquemaId, [
      { esquemaId, dataHoraPrevista: new Date('2026-08-27T09:00:00.000Z') },
    ]);

    const dosesRestantes = listarDosesPorEsquema(db, esquemaId);

    // A dose já tomada permanece intacta.
    const resolvidaAinda = dosesRestantes.find((dose) => dose.id === doseResolvida.id);
    expect(resolvidaAinda).toMatchObject({ status: 'tomada' });

    // A dose futura antiga (nunca resolvida) foi apagada...
    expect(dosesRestantes.some((dose) => dose.id === dosePendenteAntiga.id)).toBe(false);

    // ...e substituída pela nova dose gerada.
    const novaDose = dosesRestantes.find((dose) => dose.id !== doseResolvida.id);
    expect(novaDose?.dataHoraPrevista).toEqual(new Date('2026-08-27T09:00:00.000Z'));
    expect(dosesRestantes).toHaveLength(2);
  });
});
