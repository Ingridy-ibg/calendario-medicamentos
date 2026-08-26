import { and, eq, isNull } from 'drizzle-orm';

import { generateId } from '@/lib/id';

import { doses, type StatusDose } from '../schema';
import type { AppDb } from './types';

export interface NovaDose {
  esquemaId: string;
  dataHoraPrevista?: Date | null;
  status?: StatusDose;
  numeroNoCiclo?: number | null;
}

export function inserirDose(db: AppDb, dados: NovaDose, agora: Date = new Date()) {
  const registro = {
    id: generateId(),
    esquemaId: dados.esquemaId,
    dataHoraPrevista: dados.dataHoraPrevista ?? null,
    status: dados.status ?? ('pendente' as StatusDose),
    dataHoraRegistro: null as Date | null,
    notificacoesSemResposta: 0,
    numeroNoCiclo: dados.numeroNoCiclo ?? null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null as Date | null,
  };
  db.insert(doses).values(registro).run();
  return registro;
}

export function buscarDosePorId(db: AppDb, id: string) {
  return db.select().from(doses).where(eq(doses.id, id)).get();
}

export function listarDosesPorEsquema(db: AppDb, esquemaId: string) {
  return db.select().from(doses).where(eq(doses.esquemaId, esquemaId)).all();
}

export function resolverDose(
  db: AppDb,
  id: string,
  dados: { status: StatusDose; dataHoraRegistro: Date },
) {
  db.update(doses)
    .set({ status: dados.status, dataHoraRegistro: dados.dataHoraRegistro, updatedAt: new Date() })
    .where(eq(doses.id, id))
    .run();
  return buscarDosePorId(db, id);
}

/**
 * Regra de `design.md`/`adherence-history`: doses passadas (com
 * `dataHoraRegistro` preenchido) nunca são sobrescritas pelo motor de
 * agendamento — apenas doses futuras (ainda não resolvidas) podem ser
 * apagadas e regeneradas quando o esquema é editado.
 */
export function substituirDosesFuturas(db: AppDb, esquemaId: string, novasDoses: NovaDose[]) {
  db.delete(doses)
    .where(and(eq(doses.esquemaId, esquemaId), isNull(doses.dataHoraRegistro)))
    .run();

  return novasDoses.map((dose) => inserirDose(db, dose));
}
