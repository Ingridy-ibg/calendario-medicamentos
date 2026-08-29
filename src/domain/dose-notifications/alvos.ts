import type { Criticidade } from '@/db/schema';
import type { EsquemaCiclico } from '@/domain/dose-scheduling/types';

import { precisaDeProximoAlarme } from './cascata';
import { gerarLembretesDePausa } from './pausa-ciclo';
import { type AlvoNotificacao, identificadorDose } from './reconciliador';

export interface DoseComContexto {
  doseId: string;
  proximaNotificacaoEm: Date;
  criticidade: Criticidade;
  notificacoesSemResposta: number;
  /** `medicamentos.notificacoesAtivas` do medicamento dono desta dose (via esquema). */
  notificacoesAtivas: boolean;
}

/**
 * Doses "se necessário" nunca chegam aqui (nunca têm `proximaNotificacaoEm`,
 * ver `inserirDose`). Medicamentos com notificações desativadas (5.12)
 * simplesmente não entram nos alvos desejados — o reconciliador então cancela
 * qualquer alarme deles que ainda esteja agendado no SO. Um comum que já
 * atingiu o limite de 4 também fica de fora (`precisaDeProximoAlarme`): seu
 * `proximaNotificacaoEm` nesse ponto é só o prazo da varredura preguiçosa de
 * perdida (`fecharDosesVencidas`), não um alarme de verdade a agendar.
 */
export function construirAlvosDeDoses(doses: DoseComContexto[]): AlvoNotificacao[] {
  return doses
    .filter((dose) => dose.notificacoesAtivas && precisaDeProximoAlarme(dose.criticidade, dose.notificacoesSemResposta))
    .map((dose) => ({
      identifier: identificadorDose(dose.doseId),
      tipo: 'dose' as const,
      dataHora: dose.proximaNotificacaoEm,
    }));
}

export interface CicloComContexto {
  esquema: EsquemaCiclico;
  notificacoesAtivas: boolean;
}

export function construirAlvosDePausa(ciclos: CicloComContexto[], de: Date, ate: Date): AlvoNotificacao[] {
  return ciclos
    .filter((ciclo) => ciclo.notificacoesAtivas)
    .flatMap((ciclo) => gerarLembretesDePausa(ciclo.esquema, de, ate));
}
