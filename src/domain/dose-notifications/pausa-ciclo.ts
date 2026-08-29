import { addDays, formatISO, startOfDay } from 'date-fns';

import { calcularStatusDoDia } from '@/domain/dose-scheduling/ciclico';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';
import type { EsquemaCiclico } from '@/domain/dose-scheduling/types';

import { type AlvoNotificacao, identificadorPausaCiclo } from './reconciliador';

/**
 * Dias de pausa não têm linha em `doses` (ver `gerarDosesCiclico`) — não há
 * nada para confirmar. O lembrete leve e sem ação (specs/dose-notifications)
 * é, por isso, derivado diretamente do esquema a cada execução do
 * reconciliador, e não persistido.
 */
export function gerarLembretesDePausa(esquema: EsquemaCiclico, de: Date, ate: Date): AlvoNotificacao[] {
  if (esquema.dataInicioCiclo === null) {
    return [];
  }

  const alvos: AlvoNotificacao[] = [];
  const [horario] = esquema.horarios;
  const fim = startOfDay(ate);
  let dia = startOfDay(de);

  while (dia <= fim) {
    if (calcularStatusDoDia(esquema, dia).fase === 'pausa') {
      alvos.push({
        identifier: identificadorPausaCiclo(esquema.id, formatISO(dia, { representation: 'date' })),
        tipo: 'pausa-ciclo',
        dataHora: combinarDataEHorario(dia, horario),
      });
    }
    dia = addDays(dia, 1);
  }

  return alvos;
}
