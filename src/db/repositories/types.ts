import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from '../schema';

/**
 * Tipo compartilhado pelo cliente real (`drizzle-orm/expo-sqlite`) e pelo
 * cliente de teste (`drizzle-orm/better-sqlite3`) — ambos rodam em modo
 * 'sync' sobre o mesmo schema, então os repositórios funcionam com os dois.
 */
export type AppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
