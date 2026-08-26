import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from './schema';

/**
 * Cria um banco SQLite em memória com as migrações do Drizzle aplicadas,
 * usando `better-sqlite3` (Node) em vez de `expo-sqlite` (nativo do RN) para
 * que a camada de dados seja testável sob Vitest, sem simulador — ambos os
 * drivers compilam o mesmo schema para o mesmo dialeto SQLite.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
  return db;
}

export type TestDb = ReturnType<typeof createTestDb>;
