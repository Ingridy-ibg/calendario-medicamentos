import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const CRITICIDADES = ['comum', 'especial'] as const;
export type Criticidade = (typeof CRITICIDADES)[number];

export const TIPOS_ESQUEMA = [
  'DIARIO',
  'INTERVALO_HORAS',
  'DIAS_SEMANA',
  'CICLICO',
  'SE_NECESSARIO',
] as const;
export type TipoEsquema = (typeof TIPOS_ESQUEMA)[number];

export const STATUS_DOSE = [
  'pendente',
  'aguardando',
  'tomada',
  'tomada_com_atraso',
  'pulada',
  'perdida',
] as const;
export type StatusDose = (typeof STATUS_DOSE)[number];

export const medicamentos = sqliteTable('medicamentos', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  dosagem: text('dosagem').notNull(),
  criticidade: text('criticidade', { enum: CRITICIDADES }).notNull(),
  quantidadeEmEstoque: integer('quantidade_em_estoque').notNull().default(0),
  quantidadePorEmbalagem: integer('quantidade_por_embalagem').notNull(),
  notificacoesAtivas: integer('notificacoes_ativas', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

/**
 * Colunas de parâmetro são nullable porque cada linha usa apenas o subconjunto
 * relevante ao seu `tipo` (ver design.md: "colunas dedicadas em vez de JSON genérico").
 */
export const esquemas = sqliteTable('esquemas', {
  id: text('id').primaryKey(),
  medicamentoId: text('medicamento_id')
    .notNull()
    .references(() => medicamentos.id),
  tipo: text('tipo', { enum: TIPOS_ESQUEMA }).notNull(),

  // DIARIO, DIAS_SEMANA: horários fixos do dia, ex: ["08:00", "20:00"] (JSON).
  horarios: text('horarios', { mode: 'json' }).$type<string[]>(),
  // INTERVALO_HORAS
  intervaloHoras: integer('intervalo_horas'),
  // DIAS_SEMANA: dias 0 (domingo) a 6 (sábado) (JSON).
  diasDaSemana: text('dias_da_semana', { mode: 'json' }).$type<number[]>(),
  // CICLICO
  diasAtivos: integer('dias_ativos'),
  diasPausa: integer('dias_pausa'),
  dataInicioCiclo: integer('data_inicio_ciclo', { mode: 'timestamp_ms' }),
  // DIARIO, INTERVALO_HORAS, DIAS_SEMANA: null = uso contínuo.
  duracaoDias: integer('duracao_dias'),
  // SE_NECESSARIO
  limiteDiario: integer('limite_diario'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const doses = sqliteTable('doses', {
  id: text('id').primaryKey(),
  esquemaId: text('esquema_id')
    .notNull()
    .references(() => esquemas.id),
  // Nulo para doses "se necessário", que não têm horário previsto.
  dataHoraPrevista: integer('data_hora_prevista', { mode: 'timestamp_ms' }),
  status: text('status', { enum: STATUS_DOSE }).notNull().default('pendente'),
  // Preenchido assim que a dose é resolvida (tomada/pulada); marca a dose como passada/imutável.
  dataHoraRegistro: integer('data_hora_registro', { mode: 'timestamp_ms' }),
  notificacoesSemResposta: integer('notificacoes_sem_resposta').notNull().default(0),
  numeroNoCiclo: integer('numero_no_ciclo'),
  // Horário em que a próxima notificação desta dose deve disparar (o passo
  // atual da cascata: disparo inicial, reenvio silencioso ou "adiar" — ver
  // src/domain/dose-notifications/cascata.ts). Nulo quando não há nada
  // pendente (dose resolvida, notificações desativadas, ou tipo sem
  // notificação agendada como SE_NECESSARIO). Não é sobrescrito por edição de
  // esquema em doses já resolvidas, pela mesma regra 2.5 acima.
  proximaNotificacaoEm: integer('proxima_notificacao_em', { mode: 'timestamp_ms' }),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
});

export const medicamentosRelations = relations(medicamentos, ({ many }) => ({
  esquemas: many(esquemas),
}));

export const esquemasRelations = relations(esquemas, ({ one, many }) => ({
  medicamento: one(medicamentos, {
    fields: [esquemas.medicamentoId],
    references: [medicamentos.id],
  }),
  doses: many(doses),
}));

export const dosesRelations = relations(doses, ({ one }) => ({
  esquema: one(esquemas, {
    fields: [doses.esquemaId],
    references: [esquemas.id],
  }),
}));
