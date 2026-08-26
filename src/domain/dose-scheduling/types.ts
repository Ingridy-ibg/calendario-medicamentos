interface EsquemaBase {
  id: string;
  medicamentoId: string;
}

/**
 * `dataInicio` é o dia 1 do curso — usado apenas para contar `duracaoDias`
 * (`null` = uso contínuo, sem data de término).
 */
export interface EsquemaDiario extends EsquemaBase {
  tipo: 'DIARIO';
  horarios: string[];
  duracaoDias: number | null;
  dataInicio: Date;
}

export interface EsquemaIntervaloHoras extends EsquemaBase {
  tipo: 'INTERVALO_HORAS';
  intervaloHoras: number;
  duracaoDias: number | null;
  dataInicio: Date;
}

export interface EsquemaDiasSemana extends EsquemaBase {
  tipo: 'DIAS_SEMANA';
  /** 0 (domingo) a 6 (sábado). */
  diasDaSemana: number[];
  horarios: string[];
  duracaoDias: number | null;
  dataInicio: Date;
}

/**
 * `dataInicioCiclo` é o dia 1 do ciclo *atual*, definido apenas quando a
 * primeira dose de uma cartela é confirmada (ver `confirmarPrimeiraDoseCiclo`).
 * `null` significa que o esquema está em espera de início — nunca houve
 * confirmação, ou a pausa da cartela anterior terminou sem uma nova.
 */
export interface EsquemaCiclico extends EsquemaBase {
  tipo: 'CICLICO';
  diasAtivos: number;
  diasPausa: number;
  /** Horário diário único do ciclo (array de 1 elemento, por consistência com o schema). */
  horarios: string[];
  dataInicioCiclo: Date | null;
}

export interface EsquemaSeNecessario extends EsquemaBase {
  tipo: 'SE_NECESSARIO';
  limiteDiario: number;
}

export type Esquema =
  | EsquemaDiario
  | EsquemaIntervaloHoras
  | EsquemaDiasSemana
  | EsquemaCiclico
  | EsquemaSeNecessario;

export interface DoseGerada {
  dataHoraPrevista: Date;
  numeroNoCiclo?: number;
}
