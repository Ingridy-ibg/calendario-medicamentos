import type { Criticidade } from '@/db/schema';

export type ModoDuracao = { modo: 'continuo' } | { modo: 'dias'; dias: number };

export interface CamposComunsFormulario {
  nome: string;
  dosagem: string;
  criticidade: Criticidade;
  quantidadeEmEstoque: number;
  quantidadePorEmbalagem: number;
}

export type DadosEsquemaFormulario =
  | { tipo: 'DIARIO'; horarios: string[]; duracao: ModoDuracao }
  | { tipo: 'INTERVALO_HORAS'; intervaloHoras: number; duracao: ModoDuracao }
  | { tipo: 'DIAS_SEMANA'; diasDaSemana: number[]; horarios: string[]; duracao: ModoDuracao }
  | { tipo: 'CICLICO'; diasAtivos: number; diasPausa: number; horario: string }
  | { tipo: 'SE_NECESSARIO'; limiteDiario: number };

export interface DadosFormularioMedicamento {
  comuns: CamposComunsFormulario;
  esquema: DadosEsquemaFormulario;
}
