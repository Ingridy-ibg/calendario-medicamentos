import type { Criticidade } from '@/db/schema';

export type ModoDuracao = { modo: 'continuo' } | { modo: 'dias'; dias: number };

export interface CamposComunsFormulario {
  nome: string;
  dosagem: string;
  criticidade: Criticidade;
  quantidadeEmEstoque: number;
  quantidadePorEmbalagem: number;
  /** Texto livre como digitado (identidade-e-observacoes); normalizado ao gravar. */
  observacoes?: string;
  /** Como a tela informou o estoque (stock-in-boxes); presente, os erros caem nesses campos. */
  emCaixas?: { caixasFechadas: number; naCaixaEmUso: number };
}

export type DadosEsquemaFormulario =
  | { tipo: 'DIARIO'; horarios: string[]; duracao: ModoDuracao }
  | { tipo: 'INTERVALO_HORAS'; intervaloHoras: number; duracao: ModoDuracao }
  | { tipo: 'DIAS_SEMANA'; diasDaSemana: number[]; horarios: string[]; duracao: ModoDuracao }
  | { tipo: 'CICLICO'; diasAtivos: number; diasPausa: number; horario: string }
  | { tipo: 'SE_NECESSARIO'; limiteDiario: number };

/** Respostas de "Já estava tomando" conforme o tipo (register-ongoing-medication). */
export type DadosEmUso =
  /** Diário / dias da semana com duração fixa. */
  | { tipo: 'inicio'; dataInicio: Date }
  /** A cada X horas: última dose e, com duração fixa, o início. */
  | { tipo: 'intervalo'; ultimaDose: Date; dataInicio?: Date }
  /** Cíclico: dia atual da cartela ou da pausa. */
  | { tipo: 'ciclo'; fase: 'ativo' | 'pausa'; dia: number };

export interface EmUsoFormulario {
  /** Ausente para diário/dias da semana de uso contínuo (nada a perguntar além de hoje). */
  dados?: DadosEmUso;
  /** Horários de hoje ("HH:mm") já passados que o usuário marcou como tomados. */
  dosesDeHojeTomadas: string[];
}

export interface DadosFormularioMedicamento {
  comuns: CamposComunsFormulario;
  esquema: DadosEsquemaFormulario;
  /** Presente quando "Já estava tomando" está ligado. */
  emUso?: EmUsoFormulario;
  /**
   * Cíclico novo (ou de volta à agenda) cujo horário de hoje já passou: a
   * resposta a "Você já tomou o 1º comprimido hoje?" (inicio-de-cartela).
   */
  inicioCartela?: EscolhaInicioCartela;
}

export type EscolhaInicioCartela = 'ja_tomei' | 'amanha';
