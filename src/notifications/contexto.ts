import { addWeeks } from 'date-fns';

import { buscarDosePorId, listarDosesAtivasComNotificacaoPendente } from '@/db/repositories/doses';
import {
  buscarEsquemaPorId,
  type EsquemaRow,
  listarEsquemasCiclicos,
  paraEsquemaDominio,
} from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import { construirAlvosDeDoses, construirAlvosDePausa } from '@/domain/dose-notifications/alvos';
import { type AlvoNotificacao } from '@/domain/dose-notifications/reconciliador';
import { SEMANAS_JANELA_MAXIMA } from '@/domain/dose-scheduling/janela-rolante';
import type { Esquema } from '@/domain/dose-scheduling/types';

export interface ContextoDose {
  esquema: Esquema;
  medicamento: NonNullable<ReturnType<typeof buscarMedicamentoPorId>>;
}

/** Junta dose → esquema → medicamento — usado tanto para agendar quanto ao processar uma resposta. */
export function buscarContextoDaDose(db: AppDb, doseId: string): ContextoDose | null {
  const dose = buscarDosePorId(db, doseId);
  if (!dose) return null;

  const esquemaRow = buscarEsquemaPorId(db, dose.esquemaId);
  if (!esquemaRow) return null;

  const medicamento = buscarMedicamentoPorId(db, esquemaRow.medicamentoId);
  if (!medicamento) return null;

  return { esquema: paraEsquemaDominio(esquemaRow), medicamento };
}

/** Medicamento dono de um esquema — usado para montar o conteúdo do lembrete de pausa de ciclo. */
export function buscarMedicamentoDoEsquema(db: AppDb, esquemaId: string) {
  const esquemaRow = buscarEsquemaPorId(db, esquemaId);
  if (!esquemaRow) return null;
  return buscarMedicamentoPorId(db, esquemaRow.medicamentoId) ?? null;
}

/**
 * Monta a lista completa de alvos desejados (doses + lembretes de pausa de
 * ciclo) a partir do estado atual do banco — a entrada do reconciliador
 * (5.3/5.13). N+1 é aceitável aqui: o número de doses ativas simultâneas é
 * sempre pequeno (janela de 2 a 4 semanas para poucos medicamentos).
 */
export function listarAlvosDesejados(db: AppDb, agora: Date): AlvoNotificacao[] {
  const dosesAtivas = listarDosesAtivasComNotificacaoPendente(db);

  const esquemasPorId = new Map<string, EsquemaRow>();
  const medicamentosPorId = new Map<string, NonNullable<ReturnType<typeof buscarMedicamentoPorId>>>();

  const dosesComContexto = dosesAtivas.flatMap((dose) => {
    let esquemaRow = esquemasPorId.get(dose.esquemaId);
    if (!esquemaRow) {
      const encontrado = buscarEsquemaPorId(db, dose.esquemaId);
      if (!encontrado || encontrado.deletedAt) return [];
      esquemaRow = encontrado;
      esquemasPorId.set(dose.esquemaId, esquemaRow);
    }

    let medicamento = medicamentosPorId.get(esquemaRow.medicamentoId);
    if (!medicamento) {
      const encontrado = buscarMedicamentoPorId(db, esquemaRow.medicamentoId);
      if (!encontrado || encontrado.deletedAt || !encontrado.naAgenda) return [];
      medicamento = encontrado;
      medicamentosPorId.set(esquemaRow.medicamentoId, medicamento);
    }

    return [
      {
        doseId: dose.id,
        proximaNotificacaoEm: dose.proximaNotificacaoEm!,
        criticidade: medicamento.criticidade,
        notificacoesSemResposta: dose.notificacoesSemResposta,
        notificacoesAtivas: medicamento.notificacoesAtivas,
      },
    ];
  });

  const ciclos = listarEsquemasCiclicos(db).flatMap((esquemaRow) => {
    let medicamento = medicamentosPorId.get(esquemaRow.medicamentoId);
    if (!medicamento) {
      const encontrado = buscarMedicamentoPorId(db, esquemaRow.medicamentoId);
      if (!encontrado || encontrado.deletedAt || !encontrado.naAgenda) return [];
      medicamento = encontrado;
      medicamentosPorId.set(esquemaRow.medicamentoId, medicamento);
    }
    const dominio = paraEsquemaDominio(esquemaRow);
    if (dominio.tipo !== 'CICLICO') return [];
    return [{ esquema: dominio, notificacoesAtivas: medicamento.notificacoesAtivas }];
  });

  const janelaFim = addWeeks(agora, SEMANAS_JANELA_MAXIMA);

  return [...construirAlvosDeDoses(dosesComContexto), ...construirAlvosDePausa(ciclos, agora, janelaFim)];
}
