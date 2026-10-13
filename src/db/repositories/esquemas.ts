import { and, eq, isNull } from 'drizzle-orm';

import type { Esquema } from '@/domain/dose-scheduling/types';
import { generateId } from '@/lib/id';

import { esquemas, medicamentos } from '../schema';
import type { AppDb } from './types';

interface CamposComuns {
  medicamentoId: string;
  duracaoDias?: number | null;
  /** Dia 1 do tratamento quando já estava em uso antes do cadastro; ausente = `createdAt`. */
  dataInicio?: Date | null;
}

export type NovoEsquema =
  | (CamposComuns & { tipo: 'DIARIO'; horarios: string[] })
  | (CamposComuns & { tipo: 'INTERVALO_HORAS'; intervaloHoras: number })
  | (CamposComuns & { tipo: 'DIAS_SEMANA'; diasDaSemana: number[]; horarios: string[] })
  | (Omit<CamposComuns, 'duracaoDias'> & {
      tipo: 'CICLICO';
      diasAtivos: number;
      diasPausa: number;
      /**
       * `null` = esquema em espera de início (ver design.md, Open Questions):
       * um medicamento cíclico recém-cadastrado nunca começa "agora mesmo" —
       * só existe um ciclo ativo quando a primeira dose é confirmada
       * (`confirmarPrimeiraDoseCiclo`/`confirmarNovaCartelaCiclica`).
       */
      dataInicioCiclo: Date | null;
      horarios: string[];
    })
  | (Omit<CamposComuns, 'duracaoDias'> & { tipo: 'SE_NECESSARIO'; limiteDiario: number });

export function inserirEsquema(db: AppDb, dados: NovoEsquema, agora: Date = new Date()) {
  const base = {
    id: generateId(),
    medicamentoId: dados.medicamentoId,
    tipo: dados.tipo,
    horarios: null as string[] | null,
    intervaloHoras: null as number | null,
    diasDaSemana: null as number[] | null,
    diasAtivos: null as number | null,
    diasPausa: null as number | null,
    dataInicioCiclo: null as Date | null,
    duracaoDias: null as number | null,
    dataInicio: null as Date | null,
    limiteDiario: null as number | null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null as Date | null,
  };

  const registro = (() => {
    switch (dados.tipo) {
      case 'DIARIO':
        return { ...base, horarios: dados.horarios, duracaoDias: dados.duracaoDias ?? null, dataInicio: dados.dataInicio ?? null };
      case 'INTERVALO_HORAS':
        return {
          ...base,
          intervaloHoras: dados.intervaloHoras,
          duracaoDias: dados.duracaoDias ?? null,
          dataInicio: dados.dataInicio ?? null,
        };
      case 'DIAS_SEMANA':
        return {
          ...base,
          diasDaSemana: dados.diasDaSemana,
          horarios: dados.horarios,
          duracaoDias: dados.duracaoDias ?? null,
          dataInicio: dados.dataInicio ?? null,
        };
      case 'CICLICO':
        return {
          ...base,
          diasAtivos: dados.diasAtivos,
          diasPausa: dados.diasPausa,
          dataInicioCiclo: dados.dataInicioCiclo,
          horarios: dados.horarios,
        };
      case 'SE_NECESSARIO':
        return { ...base, limiteDiario: dados.limiteDiario };
    }
  })();

  db.insert(esquemas).values(registro).run();
  return registro;
}

export function buscarEsquemaPorId(db: AppDb, id: string) {
  return db.select().from(esquemas).where(eq(esquemas.id, id)).get();
}

export function listarEsquemasPorMedicamento(db: AppDb, medicamentoId: string) {
  return db.select().from(esquemas).where(eq(esquemas.medicamentoId, medicamentoId)).all();
}

/**
 * Todo esquema cíclico não removido — usado pelo reconciliador de
 * notificações (src/notifications/contexto.ts) para derivar os lembretes de
 * dia de pausa, que não têm linha em `doses` e por isso não seriam
 * descobertos partindo apenas das doses ativas.
 */
export function listarEsquemasCiclicos(db: AppDb) {
  return listarEsquemasAtivos(db).filter((esquema) => esquema.tipo === 'CICLICO');
}

/**
 * Todo esquema não removido, de qualquer tipo — usado pelas telas de agenda
 * (src/domain/agenda-views) para: (a) achar os "se necessário" (que nunca
 * têm linha em `doses` a listar) e (b) projetar dias futuros do calendário
 * mensal direto a partir da definição do esquema, sem depender do que já foi
 * materializado na janela rolante.
 */
export function listarEsquemasAtivos(db: AppDb) {
  // Fora da agenda (agenda-membership, decisão 2): sem doses, lembretes nem
  // projeção — agenda, calendário futuro, renovação e reconciliador partem daqui.
  return db
    .select({ esquema: esquemas })
    .from(esquemas)
    .innerJoin(medicamentos, eq(medicamentos.id, esquemas.medicamentoId))
    .where(and(isNull(esquemas.deletedAt), isNull(medicamentos.deletedAt), eq(medicamentos.naAgenda, true)))
    .all()
    .map((linha) => linha.esquema);
}

/**
 * Todo esquema não removido, inclusive de medicamentos fora da agenda — para
 * o histórico de dias passados do calendário, que continua aparecendo.
 */
export function listarEsquemasNaoRemovidos(db: AppDb) {
  return db.select().from(esquemas).where(isNull(esquemas.deletedAt)).all();
}

export type EsquemaRow = NonNullable<ReturnType<typeof buscarEsquemaPorId>>;

type PatchEsquema = Partial<
  Pick<
    EsquemaRow,
    | 'horarios'
    | 'intervaloHoras'
    | 'diasDaSemana'
    | 'diasAtivos'
    | 'diasPausa'
    | 'duracaoDias'
    | 'limiteDiario'
  >
>;

/**
 * Edita os campos de parâmetro de um esquema. Nunca toca `dataInicioCiclo`
 * (o chamador decide isso separadamente) nem `tipo` — trocar o tipo de
 * esquema de um medicamento existente não é suportado, é preciso remover e
 * recadastrar.
 */
export function atualizarEsquema(db: AppDb, id: string, patch: PatchEsquema, agora: Date = new Date()) {
  db.update(esquemas)
    .set({ ...patch, updatedAt: agora })
    .where(eq(esquemas.id, id))
    .run();
  return buscarEsquemaPorId(db, id);
}

/**
 * Grava o dia 1 do ciclo atual de um esquema CICLICO — só chamado quando o
 * primeiro comprimido de uma nova cartela é confirmado (ver
 * `confirmarNovaCartelaCiclica`). Separado de `atualizarEsquema` para que
 * editar os parâmetros nunca reinicie o ciclo.
 */
export function definirInicioCiclo(db: AppDb, id: string, dataInicioCiclo: Date, agora: Date = new Date()) {
  db.update(esquemas).set({ dataInicioCiclo, updatedAt: agora }).where(eq(esquemas.id, id)).run();
  return buscarEsquemaPorId(db, id);
}

/**
 * Volta à agenda (agenda-membership, decisão 3): o esquema recomeça como num
 * cadastro feito agora — duração conta a partir de `dataInicio` e o cíclico
 * volta a aguardar a nova cartela.
 */
export function reiniciarEsquema(db: AppDb, id: string, dataInicio: Date, agora: Date = new Date()) {
  db.update(esquemas).set({ dataInicio, dataInicioCiclo: null, updatedAt: agora }).where(eq(esquemas.id, id)).run();
  return buscarEsquemaPorId(db, id);
}

export function removerEsquema(db: AppDb, id: string, agora: Date) {
  db.update(esquemas).set({ deletedAt: agora, updatedAt: agora }).where(eq(esquemas.id, id)).run();
}

/**
 * Converte uma linha do banco para o tipo de domínio usado pelo motor de
 * agendamento (`src/domain/dose-scheduling`). `dataInicio` (dia 1 do curso,
 * usado só para contar duração) é `data_inicio` quando informado no cadastro
 * em uso, senão a própria `createdAt` do esquema — ver
 * decisão em `src/domain/dose-scheduling/types.ts`.
 */
export function paraEsquemaDominio(linha: EsquemaRow): Esquema {
  switch (linha.tipo) {
    case 'DIARIO':
      return {
        id: linha.id,
        medicamentoId: linha.medicamentoId,
        tipo: 'DIARIO',
        horarios: linha.horarios ?? [],
        duracaoDias: linha.duracaoDias,
        dataInicio: linha.dataInicio ?? linha.createdAt,
      };
    case 'INTERVALO_HORAS':
      return {
        id: linha.id,
        medicamentoId: linha.medicamentoId,
        tipo: 'INTERVALO_HORAS',
        intervaloHoras: linha.intervaloHoras ?? 0,
        duracaoDias: linha.duracaoDias,
        dataInicio: linha.dataInicio ?? linha.createdAt,
      };
    case 'DIAS_SEMANA':
      return {
        id: linha.id,
        medicamentoId: linha.medicamentoId,
        tipo: 'DIAS_SEMANA',
        diasDaSemana: linha.diasDaSemana ?? [],
        horarios: linha.horarios ?? [],
        duracaoDias: linha.duracaoDias,
        dataInicio: linha.dataInicio ?? linha.createdAt,
      };
    case 'CICLICO':
      return {
        id: linha.id,
        medicamentoId: linha.medicamentoId,
        tipo: 'CICLICO',
        diasAtivos: linha.diasAtivos ?? 0,
        diasPausa: linha.diasPausa ?? 0,
        horarios: linha.horarios ?? [],
        dataInicioCiclo: linha.dataInicioCiclo,
      };
    case 'SE_NECESSARIO':
      return {
        id: linha.id,
        medicamentoId: linha.medicamentoId,
        tipo: 'SE_NECESSARIO',
        limiteDiario: linha.limiteDiario ?? 0,
      };
  }
}
