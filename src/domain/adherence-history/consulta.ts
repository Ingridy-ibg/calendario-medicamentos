import { listarDosesResolvidasPorEsquema } from '@/db/repositories/doses';
import { listarEsquemasPorMedicamento } from '@/db/repositories/esquemas';
import type { AppDb } from '@/db/repositories/types';

export interface FiltroHistorico {
  medicamentoId: string;
  de?: Date;
  ate?: Date;
}

export type RegistroHistorico = ReturnType<typeof listarDosesResolvidasPorEsquema>[number];

/** Doses "se necessário" não têm `dataHoraPrevista` — usa `dataHoraRegistro` como a data efetiva do registro. */
function dataEfetiva(dose: RegistroHistorico): Date | null {
  return dose.dataHoraPrevista ?? dose.dataHoraRegistro;
}

/**
 * Histórico de adesão de um medicamento: todas as doses já resolvidas
 * (tomada, tomada com atraso, pulada ou perdida — nunca pendente/aguardando),
 * opcionalmente restrito a um intervalo de datas, ordenado do mais antigo
 * para o mais recente.
 *
 * Lê só o que já está persistido em `doses`/`esquemas` — nunca recalcula nem
 * é afetado por uma edição ou remoção posterior do medicamento
 * (specs/adherence-history: "o histórico persiste independentemente do
 * horário atual ou da existência do medicamento").
 */
export function listarHistoricoPorMedicamento(db: AppDb, filtro: FiltroHistorico): RegistroHistorico[] {
  const esquemas = listarEsquemasPorMedicamento(db, filtro.medicamentoId);
  const doses = esquemas.flatMap((esquema) => listarDosesResolvidasPorEsquema(db, esquema.id));

  return doses
    .filter((dose) => {
      const data = dataEfetiva(dose);
      if (!data) return false;
      if (filtro.de && data < filtro.de) return false;
      if (filtro.ate && data > filtro.ate) return false;
      return true;
    })
    .sort((a, b) => dataEfetiva(a)!.getTime() - dataEfetiva(b)!.getTime());
}
