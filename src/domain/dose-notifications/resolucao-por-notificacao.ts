import { buscarEsquemaPorId } from '@/db/repositories/esquemas';
import { buscarDosePorId, listarDosesAguardandoVencidas, marcarDosePerdida, reagendarProximaNotificacao } from '@/db/repositories/doses';
import { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { Criticidade } from '@/db/schema';
import { confirmarDose, pularDose } from '@/domain/adherence-history/resolucao';
import { ehInicioDeCartelaPendente } from '@/domain/dose-scheduling/ciclico';
import { confirmarNovaCartelaCiclica } from '@/domain/dose-scheduling/resolucao';
import type { Esquema } from '@/domain/dose-scheduling/types';

import { adiarNotificacao, decidirAposEntrega } from './cascata';
import type { DecisaoEntrega } from './cascata';
import type { AcaoNotificacao } from './types';

function exigirDose(db: AppDb, doseId: string) {
  const dose = buscarDosePorId(db, doseId);
  if (!dose) {
    throw new Error(`Dose ${doseId} não encontrada`);
  }
  return dose;
}

export type ResultadoResposta =
  | { tipo: 'ignorada' }
  | { tipo: 'resolvida' }
  | { tipo: 'adiada'; proximaNotificacaoEm: Date };

/**
 * Aplica a ação tocada numa notificação de dose. Só age sobre dose ainda não
 * resolvida (`pendente`/`aguardando`): a mesma resposta pode chegar pela
 * tarefa de fundo e pelo ouvinte do app aberto, ou atrasada para uma dose já
 * resolvida na agenda — nesses casos nada muda, nem status nem estoque
 * (fix-permissoes-e-respostas). Especial só aceita "tomei agora"
 * (specs/dose-notifications): outra ação é ignorada, nunca aplicada.
 */
export function aplicarRespostaDeNotificacao(
  db: AppDb,
  esquema: Esquema,
  criticidade: Criticidade,
  doseId: string,
  acao: AcaoNotificacao,
  agora: Date,
): ResultadoResposta {
  const dose = buscarDosePorId(db, doseId);
  if (!dose || (dose.status !== 'pendente' && dose.status !== 'aguardando')) return { tipo: 'ignorada' };
  if (criticidade === 'especial' && acao !== 'tomei_agora') return { tipo: 'ignorada' };

  switch (acao) {
    case 'tomei_agora':
      // Dia 1 de uma nova cartela: confirmar inicia o ciclo (inicio-de-cartela).
      if (esquema.tipo === 'CICLICO' && ehInicioDeCartelaPendente(esquema, dose)) {
        confirmarNovaCartelaCiclica(db, esquema, agora);
      } else {
        confirmarDose(db, esquema, doseId, agora);
      }
      return { tipo: 'resolvida' };
    case 'nao_tomar':
      pularDose(db, esquema, doseId, agora);
      return { tipo: 'resolvida' };
    case 'adiar': {
      const adiada = adiarDoseViaNotificacao(db, doseId, agora);
      return adiada?.proximaNotificacaoEm
        ? { tipo: 'adiada', proximaNotificacaoEm: adiada.proximaNotificacaoEm }
        : { tipo: 'ignorada' };
    }
  }
}

/**
 * Ação "adiar" explícita — só existe para medicamentos comuns. Nunca conta no
 * limite de 4 notificações do comum (specs/dose-notifications): reagenda sem
 * tocar em `notificacoesSemResposta`.
 */
export function adiarDoseViaNotificacao(db: AppDb, doseId: string, agora: Date) {
  const dose = exigirDose(db, doseId);
  const decisao = adiarNotificacao(dose.notificacoesSemResposta, agora);
  return reagendarProximaNotificacao(db, doseId, decisao);
}

/**
 * Chamada exatamente uma vez a cada notificação de dose efetivamente
 * entregue (evento de recebimento do expo-notifications), com `agora` igual
 * ao horário real da entrega. Grava a entrega e decide se a cascata continua
 * — nunca marca perdida diretamente (ver `decidirAposEntrega`).
 */
export function registrarEntregaDeNotificacao(
  db: AppDb,
  criticidade: Criticidade,
  doseId: string,
  agora: Date,
): DecisaoEntrega {
  const dose = exigirDose(db, doseId);
  const decisao = decidirAposEntrega(criticidade, dose.notificacoesSemResposta, agora);
  reagendarProximaNotificacao(db, doseId, {
    proximaNotificacaoEm: decisao.proximaNotificacaoEm,
    notificacoesSemResposta: decisao.notificacoesSemResposta,
  });
  return decisao;
}

export interface DisparoDeAlarme {
  doseId: string;
  em: Date;
}

/**
 * Sincroniza o banco com os disparos que o alarme nativo fez com o app
 * fechado (alarme-tela-cheia, design.md, decisão 4): cada disparo conta como
 * uma entrega, na ordem em que ocorreram, para que `proximaNotificacaoEm`
 * alcance o rearme de +30 min que o nativo já armou. Disparos de dose já
 * resolvida ou removida são ignorados.
 */
export function aplicarDisparosDeAlarme(db: AppDb, disparos: DisparoDeAlarme[]): void {
  const ordenados = [...disparos].sort((a, b) => a.em.getTime() - b.em.getTime());
  for (const disparo of ordenados) {
    const dose = buscarDosePorId(db, disparo.doseId);
    if (!dose || (dose.status !== 'pendente' && dose.status !== 'aguardando')) continue;
    const esquemaRow = buscarEsquemaPorId(db, dose.esquemaId);
    const medicamento = esquemaRow ? buscarMedicamentoPorId(db, esquemaRow.medicamentoId) : undefined;
    if (!medicamento) continue;
    registrarEntregaDeNotificacao(db, medicamento.criticidade, disparo.doseId, disparo.em);
  }
}

/**
 * Varredura preguiçosa (chamada pelo reconciliador — a cada abertura do app e
 * periodicamente em segundo plano, ver `src/notifications/reconciliador.ts`):
 * fecha como perdida toda dose comum "aguardando" cujo prazo da 4ª
 * notificação já passou sem resposta. Nada no app roda exatamente no
 * instante em que esse prazo se esgota — daqui vem o atraso de detecção
 * (limitado pelo intervalo da tarefa em segundo plano, ou zero na próxima
 * abertura do app).
 */
export function fecharDosesVencidas(db: AppDb, agora: Date): string[] {
  const candidatas = listarDosesAguardandoVencidas(db, agora);
  const fechadas: string[] = [];

  for (const dose of candidatas) {
    const esquemaRow = buscarEsquemaPorId(db, dose.esquemaId);
    if (!esquemaRow) continue;
    const medicamento = buscarMedicamentoPorId(db, esquemaRow.medicamentoId);
    // Um especial nunca fica perdida — se o contador dele bateu no mesmo
    // limiar numérico do comum por coincidência, isso não significa nada.
    if (!medicamento || medicamento.criticidade !== 'comum') continue;

    marcarDosePerdida(db, dose.id, agora);
    fechadas.push(dose.id);
  }

  return fechadas;
}
