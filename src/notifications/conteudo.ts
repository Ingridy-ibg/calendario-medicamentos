import { AndroidNotificationPriority, type NotificationContentInput } from 'expo-notifications';

import type { Criticidade } from '@/db/schema';
import { categoriaParaDose } from '@/domain/dose-notifications/types';

export interface DadosConteudoDose {
  nomeMedicamento: string;
  dosagem: string;
  criticidade: Criticidade;
  notificacoesSemResposta: number;
}

/**
 * Especial usa título/prioridade que reforçam o estilo crítico
 * (specs/dose-notifications: "estilo alarme, difícil de ignorar"), distinto
 * do padrão do comum. `data` carrega o id da dose para a tarefa de resposta
 * em segundo plano (`tarefas.ts`) saber o que resolver.
 */
export function conteudoDose(doseId: string, dados: DadosConteudoDose): NotificationContentInput {
  const ehReenvio = dados.notificacoesSemResposta > 0;
  const titulo =
    dados.criticidade === 'especial'
      ? `⏰ Hora de tomar ${dados.nomeMedicamento}`
      : `${ehReenvio ? 'Lembrete: ' : ''}Hora de tomar ${dados.nomeMedicamento}`;

  return {
    title: titulo,
    body: dados.dosagem,
    categoryIdentifier: categoriaParaDose(dados.criticidade),
    priority: dados.criticidade === 'especial' ? AndroidNotificationPriority.MAX : AndroidNotificationPriority.HIGH,
    sticky: false,
    data: { tipo: 'dose', doseId, criticidade: dados.criticidade },
  };
}

export function conteudoLembretePausa(nomeMedicamento: string): NotificationContentInput {
  return {
    title: `Dia de pausa: ${nomeMedicamento}`,
    body: 'Hoje é dia de pausa no ciclo — nenhuma dose a confirmar.',
    priority: AndroidNotificationPriority.DEFAULT,
    sticky: false,
    data: { tipo: 'pausa-ciclo' },
  };
}
