import { buscarProximaDoseAtiva, listarDosesPorEsquema, STATUS_NAO_RESOLVIDOS } from '@/db/repositories/doses';
import type { AppDb } from '@/db/repositories/types';
import type { Esquema } from '@/domain/dose-scheduling/types';

import { type AlertaEstoque, classificarEstoque } from './alerta';
import { contarDosesRestantesDoTratamento, temDuracaoFixa } from './doses-restantes';

/**
 * Doses do tratamento ainda não resolvidas, de agora ao fim, para um
 * medicamento já cadastrado: as previstas depois de agora mais as que já
 * passaram do horário sem resposta (ainda podem ser tomadas). `null` sem fim.
 */
export function dosesRestantesDoTratamento(db: AppDb, esquema: Esquema, agora: Date): number | null {
  if (!temDuracaoFixa(esquema)) return null;
  if (esquema.tipo === 'INTERVALO_HORAS') {
    // A série estimada parte da próxima dose não resolvida, mesmo que já atrasada.
    const proxima = buscarProximaDoseAtiva(db, esquema.id)?.dataHoraPrevista ?? null;
    return contarDosesRestantesDoTratamento(esquema, agora, proxima);
  }
  const atrasadas = listarDosesPorEsquema(db, esquema.id).filter(
    (dose) => dose.deletedAt === null && dose.dataHoraPrevista !== null && dose.dataHoraPrevista <= agora && STATUS_NAO_RESOLVIDOS.includes(dose.status),
  ).length;
  return (contarDosesRestantesDoTratamento(esquema, agora, null) ?? 0) + atrasadas;
}

/** `classificarEstoque` de um medicamento cadastrado, contando as doses restantes no banco; `null` fora da agenda. */
export function alertaEstoqueDoMedicamento(
  db: AppDb,
  esquema: Esquema,
  medicamento: { quantidadeEmEstoque: number; quantidadePorEmbalagem: number; naAgenda?: boolean },
  agora: Date,
): AlertaEstoque {
  // Fora da agenda não tem alertas de estoque (agenda-membership).
  if (medicamento.naAgenda === false) return null;
  return classificarEstoque(
    esquema,
    medicamento.quantidadeEmEstoque,
    medicamento.quantidadePorEmbalagem,
    dosesRestantesDoTratamento(db, esquema, agora),
  );
}
