import { addDays, startOfDay } from 'date-fns';

import { contarDosesRegistradasNoIntervalo, inserirDose, resolverDose } from '@/db/repositories/doses';
import type { AppDb } from '@/db/repositories/types';
import { registrarDoseSeNecessario } from '@/domain/dose-scheduling/se-necessario';
import type { EsquemaSeNecessario } from '@/domain/dose-scheduling/types';
import { decrementarEstoque } from '@/domain/medication-stock/estoque';

export interface RegistroDoseSeNecessario {
  dose: NonNullable<ReturnType<typeof resolverDose>>;
  avisoLimiteExcedido: boolean;
}

/**
 * Registra uma dose "se necessário" diretamente como um fato consumado: sem
 * `dataHoraPrevista` (nunca existiu um horário previsto para este tipo — ver
 * `specs/dose-scheduling`), com `dataHoraRegistro` = horário real do
 * registro, e sempre como `tomada` — nunca tomada com atraso nem perdida,
 * que não fazem sentido sem um horário previsto para comparar
 * (specs/adherence-history).
 *
 * O aviso de limite (`registrarDoseSeNecessario`, motor puro) nunca bloqueia
 * o registro — só informa.
 */
export function registrarDoseSeNecessarioNoBanco(
  db: AppDb,
  esquema: EsquemaSeNecessario,
  agora: Date,
): RegistroDoseSeNecessario {
  const inicioDoDia = startOfDay(agora);
  const fimDoDia = addDays(inicioDoDia, 1);
  const jaRegistradasHoje = contarDosesRegistradasNoIntervalo(db, esquema.id, inicioDoDia, fimDoDia);
  const aviso = registrarDoseSeNecessario(esquema, jaRegistradasHoje);

  const inserida = inserirDose(db, { esquemaId: esquema.id }, agora);
  const dose = resolverDose(db, inserida.id, { status: 'tomada', dataHoraRegistro: agora });
  decrementarEstoque(db, esquema.medicamentoId, agora);

  return { dose: dose!, avisoLimiteExcedido: aviso.avisoLimiteExcedido };
}
