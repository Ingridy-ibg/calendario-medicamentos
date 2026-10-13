import { readFileSync } from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';

import * as schema from '../schema';
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

describe('na agenda (agenda-membership 1.1)', () => {
  it('medicamento novo entra na agenda por padrão', () => {
    const db = createTestDb();
    const { id } = inserirMedicamento(db, { nome: 'X', dosagem: '1', criticidade: 'comum', quantidadeEmEstoque: 1, quantidadePorEmbalagem: 1 });
    expect(buscarMedicamentoPorId(db, id)?.naAgenda).toBe(true);
  });

  it('medicamento que já existia antes da migração fica na agenda', () => {
    const pasta = path.resolve(import.meta.dirname, '../../../drizzle');
    const { entries } = JSON.parse(readFileSync(path.join(pasta, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string }[] };
    const sqlite = new Database(':memory:');
    const aplicar = (tag: string) =>
      readFileSync(path.join(pasta, `${tag}.sql`), 'utf8')
        .split('--> statement-breakpoint')
        .forEach((comando) => sqlite.exec(comando));

    const antes = entries.slice(0, entries.findIndex((e) => e.tag.startsWith('0003')));
    antes.forEach((e) => aplicar(e.tag));
    sqlite.exec(
      `INSERT INTO medicamentos (id, nome, dosagem, criticidade, quantidade_em_estoque, quantidade_por_embalagem, created_at, updated_at)
       VALUES ('antigo', 'Losartana', '50mg', 'comum', 30, 30, 0, 0)`,
    );
    entries.slice(antes.length).forEach((e) => aplicar(e.tag));

    expect(buscarMedicamentoPorId(drizzle(sqlite, { schema }), 'antigo')?.naAgenda).toBe(true);
  });
});
