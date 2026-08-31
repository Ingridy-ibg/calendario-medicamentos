import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirMedicamento } from '@/db/repositories/medicamentos';

import { decrementarEstoque, reporEstoque } from './estoque';

describe('decrementarEstoque', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('reduz o estoque em uma unidade', () => {
    const medicamento = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 10,
      quantidadePorEmbalagem: 30,
    });

    const atualizado = decrementarEstoque(db, medicamento.id, new Date());

    expect(atualizado?.quantidadeEmEstoque).toBe(9);
  });

  it('nunca deixa o estoque negativo', () => {
    const medicamento = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 0,
      quantidadePorEmbalagem: 30,
    });

    const atualizado = decrementarEstoque(db, medicamento.id, new Date());

    expect(atualizado?.quantidadeEmEstoque).toBe(0);
  });
});

describe('reporEstoque', () => {
  it('soma a quantidade informada ao estoque atual', () => {
    const db = createTestDb();
    const medicamento = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 2,
      quantidadePorEmbalagem: 30,
    });

    const atualizado = reporEstoque(db, medicamento.id, 30, new Date());

    expect(atualizado?.quantidadeEmEstoque).toBe(32);
  });
});
