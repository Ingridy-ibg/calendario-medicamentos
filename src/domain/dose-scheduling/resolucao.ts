import { inserirDose, resolverDose } from '@/db/repositories/doses';
import { definirInicioCiclo } from '@/db/repositories/esquemas';
import type { AppDb } from '@/db/repositories/types';
import { decrementarEstoque } from '@/domain/medication-stock/estoque';

import { confirmarPrimeiraDoseCiclo } from './ciclico';
import { gerarProximaDoseIntervalo } from './intervalo-horas';
import { materializarJanela } from './janela-rolante';
import type { Esquema, EsquemaCiclico } from './types';

export interface ResolucaoDose {
  status: 'tomada' | 'tomada_com_atraso' | 'pulada';
  dataHoraRegistro: Date;
}

/**
 * Resolve uma dose pendente (comum/agendada) e, quando o tipo de esquema
 * exigir, agenda a próxima. DIARIO, DIAS_SEMANA e CICLICO já têm sua grade
 * futura pré-materializada pela janela rolante — resolver uma dose não
 * precisa gerar a próxima aqui. Só INTERVALO_HORAS depende do horário real
 * de resolução para saber quando é a próxima (ver design.md).
 *
 * SE_NECESSARIO não passa por este fluxo — cada dose é criada diretamente
 * pelo registro manual (ver `registrarDoseSeNecessario`), sem uma linha
 * pendente prévia para resolver.
 */
export function resolverDoseEAgendarProxima(db: AppDb, esquema: Esquema, doseId: string, resolucao: ResolucaoDose) {
  const doseResolvida = resolverDose(db, doseId, resolucao);
  if (!doseResolvida) {
    throw new Error(`Dose ${doseId} não encontrada`);
  }

  if (esquema.tipo === 'INTERVALO_HORAS') {
    if (doseResolvida.dataHoraPrevista === null) {
      throw new Error(`Dose ${doseId} de esquema INTERVALO_HORAS sem dataHoraPrevista`);
    }
    const proxima = gerarProximaDoseIntervalo(esquema, {
      dataHoraPrevista: doseResolvida.dataHoraPrevista,
      dataHoraRegistro: doseResolvida.dataHoraRegistro,
      status: resolucao.status,
    });
    if (proxima) {
      inserirDose(db, { esquemaId: esquema.id, dataHoraPrevista: proxima.dataHoraPrevista });
    }
  }

  return doseResolvida;
}

/**
 * Fluxo específico de CICLICO para confirmar a primeira dose de uma nova
 * cartela: define a nova âncora de dia 1, materializa a janela futura a
 * partir dela (que passa a incluir a dose de hoje) e resolve essa dose como
 * tomada — decrementando o estoque em uma unidade (specs/medication-stock),
 * como qualquer outra dose confirmada.
 */
export function confirmarNovaCartelaCiclica(db: AppDb, esquema: EsquemaCiclico, agora: Date) {
  const novoEsquema = confirmarPrimeiraDoseCiclo(esquema, agora);
  db.transaction((tx) => {
    // A âncora precisa ir para o banco: é dela que a agenda, o calendário, os
    // lembretes e a renovação da janela recalculam o ciclo depois.
    definirInicioCiclo(tx, esquema.id, agora, agora);
    const dosesInseridas = materializarJanela(tx, novoEsquema, agora);

    const primeiraDose = dosesInseridas.find((dose) => dose.numeroNoCiclo === 1);
    if (primeiraDose) {
      resolverDose(tx, primeiraDose.id, { status: 'tomada', dataHoraRegistro: agora });
      decrementarEstoque(tx, novoEsquema.medicamentoId, agora);
    }
  });

  return novoEsquema;
}
