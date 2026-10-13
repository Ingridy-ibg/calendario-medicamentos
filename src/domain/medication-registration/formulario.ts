import type { buscarMedicamentoPorId } from '@/db/repositories/medicamentos';
import { type EsquemaRow, paraEsquemaDominio } from '@/db/repositories/esquemas';
import type { Criticidade, TipoEsquema } from '@/db/schema';
import { paraCamposDoFormulario, paraUnidades } from '@/domain/medication-stock/caixas';

import type { DadosEsquemaFormulario, DadosFormularioMedicamento, ModoDuracao } from './types';

/**
 * Estado do formulário de medicamento como a tela o guarda (textos dos
 * campos), compartilhado entre cadastro e edição (manage-medications,
 * decisão 2).
 */
export interface ValoresFormulario {
  nome: string;
  dosagem: string;
  criticidade: Criticidade;
  /** Estoque em caixas (stock-in-boxes): o domínio recebe o total em unidades. */
  caixasFechadas: string;
  /** Opcional; vazio = 0. */
  naCaixaEmUso: string;
  /** "Unidades por caixa" na tela. */
  quantidadePorEmbalagem: string;
  tipo: TipoEsquema;
  horarios: string[];
  duracao: ModoDuracao;
  intervaloHoras: string;
  diasDaSemana: number[];
  diasAtivos: string;
  diasPausa: string;
  horarioCiclico: string;
  limiteDiario: string;
  /** Texto livre; vazio = sem observação (identidade-e-observacoes). */
  observacoes: string;
}

export const VALORES_INICIAIS: ValoresFormulario = {
  nome: '',
  dosagem: '',
  criticidade: 'comum',
  caixasFechadas: '',
  naCaixaEmUso: '',
  quantidadePorEmbalagem: '',
  tipo: 'DIARIO',
  horarios: [],
  duracao: { modo: 'continuo' },
  intervaloHoras: '',
  diasDaSemana: [],
  diasAtivos: '',
  diasPausa: '',
  horarioCiclico: '',
  limiteDiario: '',
  observacoes: '',
};

function paraNumero(valor: string): number {
  return Number(valor.replace(',', '.'));
}

/** Medicamentos cíclicos são sempre especiais (specs/medication-registration). */
export function criticidadeEfetiva(valores: Pick<ValoresFormulario, 'tipo' | 'criticidade'>): Criticidade {
  return valores.tipo === 'CICLICO' ? 'especial' : valores.criticidade;
}

function paraDadosEsquema(v: ValoresFormulario): DadosEsquemaFormulario {
  switch (v.tipo) {
    case 'DIARIO':
      return { tipo: 'DIARIO', horarios: v.horarios, duracao: v.duracao };
    case 'INTERVALO_HORAS':
      return { tipo: 'INTERVALO_HORAS', intervaloHoras: paraNumero(v.intervaloHoras), duracao: v.duracao };
    case 'DIAS_SEMANA':
      return { tipo: 'DIAS_SEMANA', diasDaSemana: v.diasDaSemana, horarios: v.horarios, duracao: v.duracao };
    case 'CICLICO':
      return {
        tipo: 'CICLICO',
        diasAtivos: paraNumero(v.diasAtivos),
        diasPausa: paraNumero(v.diasPausa),
        horario: v.horarioCiclico.trim(),
      };
    case 'SE_NECESSARIO':
      return { tipo: 'SE_NECESSARIO', limiteDiario: paraNumero(v.limiteDiario) };
  }
}

/** Campo obrigatório vazio vira NaN para a validação acusar; o opcional vira 0. */
function paraNumeroObrigatorio(valor: string): number {
  return valor.trim() ? paraNumero(valor) : Number.NaN;
}

/** Valores da tela → dados que o domínio valida e grava. */
export function paraDadosFormulario(v: ValoresFormulario): DadosFormularioMedicamento {
  const emCaixas = { caixasFechadas: paraNumeroObrigatorio(v.caixasFechadas), naCaixaEmUso: v.naCaixaEmUso.trim() ? paraNumero(v.naCaixaEmUso) : 0 };
  const quantidadePorEmbalagem = paraNumeroObrigatorio(v.quantidadePorEmbalagem);
  return {
    comuns: {
      nome: v.nome,
      dosagem: v.dosagem,
      criticidade: criticidadeEfetiva(v),
      quantidadeEmEstoque: paraUnidades({ ...emCaixas, porCaixa: quantidadePorEmbalagem }),
      quantidadePorEmbalagem,
      emCaixas,
      observacoes: v.observacoes,
    },
    esquema: paraDadosEsquema(v),
  };
}

function camposDeEstoque(unidades: number, porCaixa: number): Pick<ValoresFormulario, 'caixasFechadas' | 'naCaixaEmUso'> {
  const { caixasFechadas, naCaixaEmUso } = paraCamposDoFormulario(unidades, porCaixa);
  return { caixasFechadas: String(caixasFechadas), naCaixaEmUso: naCaixaEmUso === 0 ? '' : String(naCaixaEmUso) };
}

type Medicamento = NonNullable<ReturnType<typeof buscarMedicamentoPorId>>;

/** Medicamento + esquema do banco → valores para abrir o formulário de edição já preenchido. */
export function paraValoresFormulario(medicamento: Medicamento, esquemaRow: EsquemaRow): ValoresFormulario {
  const base: ValoresFormulario = {
    ...VALORES_INICIAIS,
    nome: medicamento.nome,
    dosagem: medicamento.dosagem,
    criticidade: medicamento.criticidade,
    ...camposDeEstoque(medicamento.quantidadeEmEstoque, medicamento.quantidadePorEmbalagem),
    quantidadePorEmbalagem: String(medicamento.quantidadePorEmbalagem),
    tipo: esquemaRow.tipo,
    observacoes: medicamento.observacoes ?? '',
  };
  const esquema = paraEsquemaDominio(esquemaRow);
  const duracaoDe = (dias: number | null): ModoDuracao => (dias === null ? { modo: 'continuo' } : { modo: 'dias', dias });

  switch (esquema.tipo) {
    case 'DIARIO':
      return { ...base, horarios: [...esquema.horarios].sort(), duracao: duracaoDe(esquema.duracaoDias) };
    case 'INTERVALO_HORAS':
      return { ...base, intervaloHoras: String(esquema.intervaloHoras), duracao: duracaoDe(esquema.duracaoDias) };
    case 'DIAS_SEMANA':
      return {
        ...base,
        diasDaSemana: [...esquema.diasDaSemana].sort(),
        horarios: [...esquema.horarios].sort(),
        duracao: duracaoDe(esquema.duracaoDias),
      };
    case 'CICLICO':
      return {
        ...base,
        diasAtivos: String(esquema.diasAtivos),
        diasPausa: String(esquema.diasPausa),
        horarioCiclico: esquema.horarios[0] ?? '',
      };
    case 'SE_NECESSARIO':
      return { ...base, limiteDiario: String(esquema.limiteDiario) };
  }
}
