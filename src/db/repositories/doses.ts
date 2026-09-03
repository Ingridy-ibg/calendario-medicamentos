import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, notInArray } from 'drizzle-orm';

import { LIMITE_NOTIFICACOES_COMUM } from '@/domain/dose-notifications/types';
import { generateId } from '@/lib/id';

import { doses, type StatusDose } from '../schema';
import type { AppDb } from './types';

/**
 * Status que ainda não chegaram a um resultado final — o oposto de "dose
 * passada"/"resolvida" (regra 2.5). Usado em vez de checar `dataHoraRegistro
 * IS NULL`, porque esse campo representa especificamente o horário real de
 * confirmação do usuário (specs/adherence-history) e uma dose perdida nunca
 * teve uma (ver `marcarDosePerdida`) — checar por ele para decidir o que é
 * "passado" trancaria uma perdida como se fosse futura/editável.
 */
export const STATUS_NAO_RESOLVIDOS: StatusDose[] = ['pendente', 'aguardando'];

export interface NovaDose {
  esquemaId: string;
  dataHoraPrevista?: Date | null;
  status?: StatusDose;
  numeroNoCiclo?: number | null;
}

/**
 * `proximaNotificacaoEm` começa igual a `dataHoraPrevista`: toda dose recém
 * materializada com horário previsto já nasce com seu disparo inicial
 * "agendado" do ponto de vista do domínio — cabe à camada de notificações
 * (src/notifications) decidir se de fato cria o alarme do SO a partir disso
 * (ver reconciliador em src/domain/dose-notifications).
 */
export function inserirDose(db: AppDb, dados: NovaDose, agora: Date = new Date()) {
  const registro = {
    id: generateId(),
    esquemaId: dados.esquemaId,
    dataHoraPrevista: dados.dataHoraPrevista ?? null,
    status: dados.status ?? ('pendente' as StatusDose),
    dataHoraRegistro: null as Date | null,
    notificacoesSemResposta: 0,
    numeroNoCiclo: dados.numeroNoCiclo ?? null,
    proximaNotificacaoEm: dados.dataHoraPrevista ?? null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null as Date | null,
  };
  db.insert(doses).values(registro).run();
  return registro;
}

export function buscarDosePorId(db: AppDb, id: string) {
  return db.select().from(doses).where(eq(doses.id, id)).get();
}

export function listarDosesPorEsquema(db: AppDb, esquemaId: string) {
  return db.select().from(doses).where(eq(doses.esquemaId, esquemaId)).all();
}

/**
 * Doses com `dataHoraPrevista` dentro de `[inicio, fim)` — a base da agenda
 * diária (src/domain/agenda-views/agenda-diaria.ts) e do histórico exibido
 * para dias passados no calendário mensal. Doses "se necessário" nunca têm
 * `dataHoraPrevista`, então nunca aparecem aqui (ver `agenda-diaria.ts` para
 * como elas são listadas em vez disso).
 */
export function listarDosesDoIntervalo(db: AppDb, inicio: Date, fim: Date) {
  return db
    .select()
    .from(doses)
    .where(
      and(
        isNull(doses.deletedAt),
        isNotNull(doses.dataHoraPrevista),
        gte(doses.dataHoraPrevista, inicio),
        lt(doses.dataHoraPrevista, fim),
      ),
    )
    .all();
}

/**
 * Resolve uma dose para um status final (tomada/tomada com atraso/pulada, e
 * também perdida — ver `marcarDosePerdida`). Sempre zera `proximaNotificacaoEm`:
 * uma dose resolvida nunca deve gerar mais notificações.
 */
export function resolverDose(
  db: AppDb,
  id: string,
  dados: { status: StatusDose; dataHoraRegistro: Date },
) {
  db.update(doses)
    .set({
      status: dados.status,
      dataHoraRegistro: dados.dataHoraRegistro,
      proximaNotificacaoEm: null,
      updatedAt: new Date(),
    })
    .where(eq(doses.id, id))
    .run();
  return buscarDosePorId(db, id);
}

/**
 * Uma dose comum perdida nunca foi de fato confirmada pelo usuário — por
 * isso, ao contrário de `resolverDose`, `dataHoraRegistro` permanece nulo
 * (specs/adherence-history: "horário real de confirmação, se houver"). O
 * status `perdida` por si só já é suficiente para travar a dose contra
 * regeneração pelo motor de agendamento (regra 2.5, ver `STATUS_NAO_RESOLVIDOS`).
 */
export function marcarDosePerdida(db: AppDb, id: string, agora: Date) {
  db.update(doses)
    .set({ status: 'perdida' as StatusDose, proximaNotificacaoEm: null, updatedAt: agora })
    .where(eq(doses.id, id))
    .run();
  return buscarDosePorId(db, id);
}

/** Avança o próximo disparo da cascata (reenvio silencioso ou "adiar") sem resolver a dose. */
export function reagendarProximaNotificacao(
  db: AppDb,
  id: string,
  dados: { proximaNotificacaoEm: Date; notificacoesSemResposta: number },
) {
  db.update(doses)
    .set({
      proximaNotificacaoEm: dados.proximaNotificacaoEm,
      notificacoesSemResposta: dados.notificacoesSemResposta,
      status: 'aguardando' as StatusDose,
      updatedAt: new Date(),
    })
    .where(eq(doses.id, id))
    .run();
  return buscarDosePorId(db, id);
}

/**
 * Doses ainda ativas (pendentes ou aguardando resposta) com um próximo
 * disparo de notificação definido — a entrada de dados do reconciliador
 * (src/domain/dose-notifications/reconciliador.ts). Doses "se necessário"
 * nunca aparecem aqui, pois nunca têm `proximaNotificacaoEm`.
 */
export function listarDosesAtivasComNotificacaoPendente(db: AppDb) {
  return db
    .select()
    .from(doses)
    .where(
      and(
        isNull(doses.deletedAt),
        inArray(doses.status, STATUS_NAO_RESOLVIDOS),
        isNotNull(doses.proximaNotificacaoEm),
      ),
    )
    .all();
}

/**
 * Candidatas comuns ao prazo de silêncio esgotado (`prazoDeSilencioExpirou`)
 * — já atingiram as 4 notificações e o prazo da última já passou. A
 * varredura preguiçosa (`fecharDosesVencidas`) ainda confere a criticidade
 * via join com `medicamentos`, já que um especial pode acumular contador
 * alto sem nunca ser candidato (ver `precisaDeProximoAlarme`).
 */
export function listarDosesAguardandoVencidas(db: AppDb, agora: Date) {
  return db
    .select()
    .from(doses)
    .where(
      and(
        eq(doses.status, 'aguardando' as StatusDose),
        isNull(doses.deletedAt),
        isNotNull(doses.proximaNotificacaoEm),
        lte(doses.proximaNotificacaoEm, agora),
        gte(doses.notificacoesSemResposta, LIMITE_NOTIFICACOES_COMUM),
      ),
    )
    .all();
}

/**
 * Todas as doses já resolvidas de um esquema (tomada, tomada com atraso,
 * pulada ou perdida) — a base da consulta de histórico
 * (src/domain/adherence-history/consulta.ts). Deliberadamente não filtra por
 * `deletedAt` de nada além da própria dose: o histórico sobrevive à remoção
 * do medicamento/esquema (specs/adherence-history).
 */
export function listarDosesResolvidasPorEsquema(db: AppDb, esquemaId: string) {
  return db
    .select()
    .from(doses)
    .where(and(eq(doses.esquemaId, esquemaId), isNull(doses.deletedAt), notInArray(doses.status, STATUS_NAO_RESOLVIDOS)))
    .all();
}

/**
 * Quantas doses de um esquema "se necessário" já foram registradas dentro de
 * `[inicioDoDia, fimDoDia)` — a entrada do limite diário (specs/dose-scheduling,
 * `registrarDoseSeNecessario`). Usa `dataHoraRegistro`, já que esse tipo nunca
 * tem `dataHoraPrevista`.
 */
export function contarDosesRegistradasNoIntervalo(
  db: AppDb,
  esquemaId: string,
  inicioDoDia: Date,
  fimDoDia: Date,
) {
  return db
    .select()
    .from(doses)
    .where(
      and(
        eq(doses.esquemaId, esquemaId),
        isNull(doses.deletedAt),
        isNotNull(doses.dataHoraRegistro),
        gte(doses.dataHoraRegistro, inicioDoDia),
        lt(doses.dataHoraRegistro, fimDoDia),
      ),
    )
    .all().length;
}

/**
 * A dose ainda não resolvida mais próxima de um esquema — para
 * INTERVALO_HORAS, que só tem no máximo uma por vez, é literalmente "a
 * próxima". Usada pelo calendário mensal (src/domain/agenda-views) como
 * âncora para estimar dias futuros desse tipo, já que seu horário real só é
 * conhecido dose a dose (ver design.md). Exige `dataHoraPrevista` não nulo —
 * do contrário, uma dose "se necessário" (que nunca tem horário previsto)
 * poderia ordenar antes das demais e ser escolhida por engano como "próxima".
 */
export function buscarProximaDoseAtiva(db: AppDb, esquemaId: string) {
  return db
    .select()
    .from(doses)
    .where(
      and(
        eq(doses.esquemaId, esquemaId),
        isNull(doses.deletedAt),
        isNotNull(doses.dataHoraPrevista),
        inArray(doses.status, STATUS_NAO_RESOLVIDOS),
      ),
    )
    .orderBy(asc(doses.dataHoraPrevista))
    .limit(1)
    .get();
}

/**
 * Regra de `design.md`/`adherence-history`: doses passadas (resolvidas —
 * tomada, tomada com atraso, pulada ou perdida) nunca são sobrescritas pelo
 * motor de agendamento — apenas doses futuras (ainda pendentes ou
 * aguardando resposta) podem ser apagadas e regeneradas quando o esquema é
 * editado.
 */
export function substituirDosesFuturas(db: AppDb, esquemaId: string, novasDoses: NovaDose[]) {
  db.delete(doses)
    .where(and(eq(doses.esquemaId, esquemaId), inArray(doses.status, STATUS_NAO_RESOLVIDOS)))
    .run();

  return novasDoses.map((dose) => inserirDose(db, dose));
}
