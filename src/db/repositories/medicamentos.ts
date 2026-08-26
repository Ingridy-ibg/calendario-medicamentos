import { eq } from 'drizzle-orm';

import { generateId } from '@/lib/id';

import { type Criticidade, medicamentos } from '../schema';
import type { AppDb } from './types';

export interface NovoMedicamento {
  nome: string;
  dosagem: string;
  criticidade: Criticidade;
  quantidadeEmEstoque: number;
  quantidadePorEmbalagem: number;
  notificacoesAtivas?: boolean;
}

export function inserirMedicamento(db: AppDb, dados: NovoMedicamento) {
  const agora = new Date();
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
