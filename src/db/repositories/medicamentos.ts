import { and, eq, isNull } from 'drizzle-orm';

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
    'nome' | 'dosagem' | 'criticidade' | 'quantidadeEmEstoque' | 'quantidadePorEmbalagem' | 'notificacoesAtivas'
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
 * Medicamentos não removidos com seu esquema ativo, em ordem alfabética
 * (aba Medicamentos — specs/medication-management).
 */
export function listarMedicamentosAtivosComEsquema(db: AppDb) {
  const ativos = db.select().from(medicamentos).where(isNull(medicamentos.deletedAt)).all();
  return ativos
    .flatMap((medicamento) => {
      const esquema = db
        .select()
        .from(esquemas)
        .where(and(eq(esquemas.medicamentoId, medicamento.id), isNull(esquemas.deletedAt)))
        .get();
      return esquema ? [{ medicamento, esquema }] : [];
    })
    .sort((a, b) => a.medicamento.nome.localeCompare(b.medicamento.nome, 'pt-BR', { sensitivity: 'base' }));
}
