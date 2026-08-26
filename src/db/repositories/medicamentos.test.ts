import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '../create-test-db';
import { buscarMedicamentoPorId, inserirMedicamento } from './medicamentos';

describe('repositório de medicamentos', () => {
  let db: TestDb;

  beforeEach(() => {
    db = createTestDb();
  });

  it('insere e lê um medicamento de volta', () => {
    const inserido = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    });

    const lido = buscarMedicamentoPorId(db, inserido.id);

    expect(lido).toMatchObject({
      id: inserido.id,
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
      notificacoesAtivas: true,
    });
    expect(lido?.deletedAt).toBeNull();
  });

  it('assume notificações ativas por padrão, mas permite desativar', () => {
    const inserido = inserirMedicamento(db, {
      nome: 'Insulina',
      dosagem: '10UI',
      criticidade: 'especial',
      quantidadeEmEstoque: 5,
      quantidadePorEmbalagem: 5,
      notificacoesAtivas: false,
    });

    const lido = buscarMedicamentoPorId(db, inserido.id);

    expect(lido?.notificacoesAtivas).toBe(false);
  });
});
