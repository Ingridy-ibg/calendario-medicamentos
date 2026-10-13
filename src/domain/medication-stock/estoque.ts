import { atualizarMedicamento, buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';

function exigirMedicamento(db: AppDb, medicamentoId: string) {
  const medicamento = buscarMedicamentoPorId(db, medicamentoId);
  if (!medicamento) {
    throw new Error(`Medicamento ${medicamentoId} não encontrado`);
  }
  return medicamento;
}

/**
 * specs/medication-stock: confirmar uma dose como tomada decrementa uma
 * unidade do estoque. Chamada pelos pontos que resolvem uma dose como
 * tomada/tomada com atraso — nunca para pulada ou perdida, que não
 * representam consumo real (ver `adherence-history/resolucao.ts`,
 * `adherence-history/se-necessario.ts` e `dose-scheduling/resolucao.ts`).
 * Nunca deixa o estoque negativo.
 */
export function decrementarEstoque(db: AppDb, medicamentoId: string, agora: Date = new Date()) {
  const medicamento = exigirMedicamento(db, medicamentoId);
  return atualizarMedicamento(
    db,
    medicamentoId,
    { quantidadeEmEstoque: Math.max(0, medicamento.quantidadeEmEstoque - 1) },
    agora,
  );
}

/** Reposição manual (ex: comprar uma nova embalagem) — soma ao estoque atual. */
export function reporEstoque(db: AppDb, medicamentoId: string, quantidade: number, agora: Date = new Date()) {
  // Defesa em profundidade: a tela já valida com `validarQuantidadeCompra`.
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error(`Quantidade de reposição inválida: ${quantidade}`);
  }
  const medicamento = exigirMedicamento(db, medicamentoId);
  return atualizarMedicamento(
    db,
    medicamentoId,
    { quantidadeEmEstoque: medicamento.quantidadeEmEstoque + quantidade },
    agora,
  );
}
