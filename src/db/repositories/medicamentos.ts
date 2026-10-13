import { and, count, eq, isNull, sql } from 'drizzle-orm';

import { generateId } from '@/lib/id';

import { type Criticidade, esquemas, medicamentos } from '../schema';
import type { AppDb } from './types';

export interface NovoMedicamento {
  nome: string;
  dosagem: string;
  criticidade: Criticidade;
  quantidadeEmEstoque: number;
  quantidadePorEmbalagem: number;
  notificacoesAtivas?: boolean;
  /** Padrão `true`; `false` = cadastrado fora da agenda (agenda-membership). */
  naAgenda?: boolean;
}

export function inserirMedicamento(db: AppDb, dados: NovoMedicamento, agora: Date = new Date()) {
  const registro = {
    id: generateId(),
    nome: dados.nome,
    dosagem: dados.dosagem,
    criticidade: dados.criticidade,
    quantidadeEmEstoque: dados.quantidadeEmEstoque,
    quantidadePorEmbalagem: dados.quantidadePorEmbalagem,
    notificacoesAtivas: dados.notificacoesAtivas ?? true,
    naAgenda: dados.naAgenda ?? true,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
  };
  db.insert(medicamentos).values(registro).run();
  return registro;
}

export function buscarMedicamentoPorId(db: AppDb, id: string) {
  return db.select().from(medicamentos).where(eq(medicamentos.id, id)).get();
}

type PatchMedicamento = Partial<
  Pick<
    NovoMedicamento,
    'nome' | 'dosagem' | 'criticidade' | 'quantidadeEmEstoque' | 'quantidadePorEmbalagem' | 'notificacoesAtivas' | 'naAgenda'
  >
>;

export function atualizarMedicamento(db: AppDb, id: string, patch: PatchMedicamento, agora: Date = new Date()) {
  db.update(medicamentos)
    .set({ ...patch, updatedAt: agora })
    .where(eq(medicamentos.id, id))
    .run();
  return buscarMedicamentoPorId(db, id);
}

export function removerMedicamento(db: AppDb, id: string, agora: Date) {
  db.update(medicamentos).set({ deletedAt: agora, updatedAt: agora }).where(eq(medicamentos.id, id)).run();
}

/**
 * Uma página dos medicamentos não removidos com seu esquema ativo (aba
 * Medicamentos — specs/medication-management): os da agenda primeiro, os
 * fora da agenda por último, cada grupo em ordem alfabética (agenda-membership,
 * decisão 5). `naAgenda` filtra; sem ele, vêm todos. Uma consulta só, com o
 * filtro no SQL; a ordem fica em JS porque o SQLite não ordena acentos como o
 * português ("Ácido" antes de "Amoxicilina") — fix-agenda-membership-review.
 */
export function listarMedicamentosComEsquema(
  db: AppDb,
  { naAgenda, limite, deslocamento = 0 }: { naAgenda?: boolean; limite?: number; deslocamento?: number } = {},
) {
  const condicoes = [isNull(medicamentos.deletedAt), isNull(esquemas.deletedAt)];
  if (naAgenda !== undefined) condicoes.push(eq(medicamentos.naAgenda, naAgenda));
  const ordenados = db
    .select({ medicamento: medicamentos, esquema: esquemas })
    .from(medicamentos)
    .innerJoin(esquemas, eq(esquemas.medicamentoId, medicamentos.id))
    .where(and(...condicoes))
    .all()
    .sort(
      (a, b) =>
        Number(b.medicamento.naAgenda) - Number(a.medicamento.naAgenda) ||
        a.medicamento.nome.localeCompare(b.medicamento.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  return ordenados.slice(deslocamento, limite === undefined ? undefined : deslocamento + limite);
}

/** Quantos medicamentos não removidos existem e quantos estão na agenda (cabeçalho e estado vazio da aba). */
export function contarMedicamentos(db: AppDb): { total: number; naAgenda: number } {
  const linha = db
    .select({ total: count(), naAgenda: sql<number>`coalesce(sum(${medicamentos.naAgenda}), 0)` })
    .from(medicamentos)
    .where(isNull(medicamentos.deletedAt))
    .get();
  return { total: linha?.total ?? 0, naAgenda: Number(linha?.naAgenda ?? 0) };
}
