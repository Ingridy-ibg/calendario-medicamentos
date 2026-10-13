import { addDays, addHours, addWeeks, differenceInCalendarDays, isSameDay, startOfDay, subDays } from 'date-fns';

import { gerarDosesCiclico } from '@/domain/dose-scheduling/ciclico';
import { gerarDosesDiario } from '@/domain/dose-scheduling/diario';
import { gerarDosesDiasSemana } from '@/domain/dose-scheduling/dias-semana';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import { combinarDataEHorario } from '@/domain/dose-scheduling/horario';
import { gerarPrimeiraDoseIntervalo } from '@/domain/dose-scheduling/intervalo-horas';
import type { Esquema } from '@/domain/dose-scheduling/types';
import { type PrevisaoEstoque, preverFimDoEstoque } from '@/domain/medication-management/gestao';

import type { DadosFormularioMedicamento } from './types';

/** O que vai para o banco — exatamente o que a confirmação mostra (design.md, decisão 2). */
export interface PlanoCadastro {
  /** Dia 1 do tratamento quando já estava em uso; `null` = o próprio cadastro. */
  dataInicio: Date | null;
  /** Âncora do ciclo atual do cíclico em uso; `null` = aguardando nova cartela. */
  dataInicioCiclo: Date | null;
  /** Primeira dose do intervalo em horas. */
  primeiraDoseIntervalo: Date | null;
  /** Doses de hoje (horário previsto) informadas como já tomadas. */
  dosesTomadasHoje: Date[];
}

export interface PreviaCadastro {
  agora: Date;
  /** Até 4 próximas doses agendadas depois de agora. */
  proximasDoses: Date[];
  /** Intervalo em horas cuja próxima dose já estava atrasada: horário em que estava prevista. */
  primeiraDosePrevistaOriginal: Date | null;
  tratamento: { diaAtual: number; totalDias: number; inicio: Date; dosesRestantes: number; ultimaDose: Date | null } | null;
  cartela: {
    fase: 'ativo' | 'pausa';
    dia: number;
    total: number;
    restantesNaCartela: number;
    ultimoDaCartela: Date;
    pausaDe: Date;
    pausaAte: Date;
    novaCartelaPrevista: Date;
  } | null;
  estoque: {
    quantidade: number;
    previsao: PrevisaoEstoque | null;
    /** Cartelas/embalagens fechadas além das doses restantes da cartela atual (cíclico). */
    cartelasFechadas: number | null;
    insuficiente: { dosesRestantes: number; faltam: number; acabaEm: Date } | null;
  };
  hoje: { tomadas: Date[]; aAgendar: Date[] };
  /** Dias antes do cadastro que ficam sem registro no histórico. */
  diasSemRegistro: { de: Date; ate: Date } | null;
  plano: PlanoCadastro;
}

/** Esquema de domínio montado só para calcular a prévia (o id real nasce no cadastro). */
function esquemaDaPrevia(dados: DadosFormularioMedicamento, plano: PlanoCadastro, agora: Date): Esquema {
  const base = { id: 'previa', medicamentoId: 'previa' };
  const inicio = plano.dataInicio ?? agora;
  const { esquema } = dados;
  switch (esquema.tipo) {
    case 'DIARIO':
      return { ...base, tipo: 'DIARIO', horarios: esquema.horarios, duracaoDias: duracao(esquema.duracao), dataInicio: inicio };
    case 'INTERVALO_HORAS':
      return { ...base, tipo: 'INTERVALO_HORAS', intervaloHoras: esquema.intervaloHoras, duracaoDias: duracao(esquema.duracao), dataInicio: inicio };
    case 'DIAS_SEMANA':
      return {
        ...base,
        tipo: 'DIAS_SEMANA',
        diasDaSemana: esquema.diasDaSemana,
        horarios: esquema.horarios,
        duracaoDias: duracao(esquema.duracao),
        dataInicio: inicio,
      };
    case 'CICLICO':
      return {
        ...base,
        tipo: 'CICLICO',
        diasAtivos: esquema.diasAtivos,
        diasPausa: esquema.diasPausa,
        horarios: [esquema.horario],
        dataInicioCiclo: plano.dataInicioCiclo,
      };
    case 'SE_NECESSARIO':
      return { ...base, tipo: 'SE_NECESSARIO', limiteDiario: esquema.limiteDiario };
  }
}

function duracao(modo: { modo: 'continuo' } | { modo: 'dias'; dias: number }): number | null {
  return modo.modo === 'continuo' ? null : modo.dias;
}

/** Doses de grade (diário, dias da semana, cíclico) num intervalo, já em ordem. */
function dosesDaGrade(esquema: Esquema, de: Date, ate: Date): Date[] {
  switch (esquema.tipo) {
    case 'DIARIO':
      return gerarDosesDiario(esquema, de, ate).map((d) => d.dataHoraPrevista);
    case 'DIAS_SEMANA':
      return gerarDosesDiasSemana(esquema, de, ate).map((d) => d.dataHoraPrevista);
    case 'CICLICO':
      return gerarDosesCiclico(esquema, de, ate).map((d) => d.dataHoraPrevista);
    default:
      return [];
  }
}

function serieIntervalo(esquema: Esquema, primeira: Date | null, limite: Date): Date[] {
  if (esquema.tipo !== 'INTERVALO_HORAS' || !primeira) return [];
  if (esquema.duracaoDias === null) return [primeira];
  const serie: Date[] = [];
  for (let dose = primeira; dose <= limite && estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, dose); dose = addHours(dose, esquema.intervaloHoras)) {
    serie.push(dose);
  }
  return serie;
}

function resolverPlano(dados: DadosFormularioMedicamento, agora: Date): PlanoCadastro {
  const emUso = dados.emUso?.dados;
  const hoje = startOfDay(agora);
  const plano: PlanoCadastro = { dataInicio: null, dataInicioCiclo: null, primeiraDoseIntervalo: null, dosesTomadasHoje: [] };

  if (emUso?.tipo === 'inicio') plano.dataInicio = startOfDay(emUso.dataInicio);
  if (emUso?.tipo === 'intervalo' && emUso.dataInicio) plano.dataInicio = startOfDay(emUso.dataInicio);
  if (emUso?.tipo === 'ciclo' && dados.esquema.tipo === 'CICLICO') {
    const recuo = emUso.fase === 'ativo' ? emUso.dia - 1 : dados.esquema.diasAtivos + emUso.dia - 1;
    plano.dataInicioCiclo = subDays(hoje, recuo);
  }

  if (dados.esquema.tipo === 'INTERVALO_HORAS') {
    const ultimaDose = emUso?.tipo === 'intervalo' ? emUso.ultimaDose : null;
    plano.primeiraDoseIntervalo = gerarPrimeiraDoseIntervalo(
      { id: 'previa', medicamentoId: 'previa', tipo: 'INTERVALO_HORAS', intervaloHoras: dados.esquema.intervaloHoras, duracaoDias: null, dataInicio: agora },
      { agora, ultimaDose },
    ).dataHoraPrevista;
    // A última dose informada, se foi hoje, entra no histórico como tomada.
    if (ultimaDose && isSameDay(ultimaDose, agora)) plano.dosesTomadasHoje = [ultimaDose];
  }

  return plano;
}

/**
 * Prévia do cadastro (register-ongoing-medication): tudo o que a tela "Confira
 * antes de salvar" mostra e o plano que `cadastrarMedicamento` grava. Pura:
 * só depende dos dados do formulário e de `agora`.
 */
export function montarPreviaCadastro(dados: DadosFormularioMedicamento, agora: Date): PreviaCadastro {
  const plano = resolverPlano(dados, agora);
  const esquema = esquemaDaPrevia(dados, plano, agora);
  const hoje = startOfDay(agora);
  const estoque = dados.comuns.quantidadeEmEstoque;

  // Doses de hoje cujo horário já passou: só ficam as marcadas como tomadas.
  if (esquema.tipo !== 'INTERVALO_HORAS') {
    const tomadas = new Set(dados.emUso?.dosesDeHojeTomadas ?? []);
    plano.dosesTomadasHoje = dosesDaGrade(esquema, hoje, hoje).filter(
      (dose) => dose <= agora && tomadas.has(`${String(dose.getHours()).padStart(2, '0')}:${String(dose.getMinutes()).padStart(2, '0')}`),
    );
  }

  // Doses futuras (horizonte de 2 anos só para contar o tratamento; a grade gravada continua na janela rolante).
  // Intervalo em horas: a série é estimada (cada dose real depende da anterior).
  const futuras =
    esquema.tipo === 'INTERVALO_HORAS'
      ? serieIntervalo(esquema, plano.primeiraDoseIntervalo, addWeeks(agora, 104))
      : dosesDaGrade(esquema, hoje, addWeeks(agora, 104)).filter((dose) => dose > agora);

  const primeiraDosePrevistaOriginal =
    esquema.tipo === 'INTERVALO_HORAS' && dados.emUso?.dados?.tipo === 'intervalo'
      ? (() => {
          const prevista = new Date(dados.emUso.dados.ultimaDose.getTime() + esquema.intervaloHoras * 3_600_000);
          return prevista < agora ? prevista : null;
        })()
      : null;

  const tratamento =
    'duracaoDias' in esquema && esquema.duracaoDias !== null
      ? {
          diaAtual: differenceInCalendarDays(agora, esquema.dataInicio) + 1,
          totalDias: esquema.duracaoDias,
          inicio: esquema.dataInicio,
          dosesRestantes: futuras.length,
          ultimaDose: futuras.at(-1) ?? null,
        }
      : null;

  const cartela =
    esquema.tipo === 'CICLICO' && plano.dataInicioCiclo && dados.emUso?.dados?.tipo === 'ciclo'
      ? (() => {
          const inicio = plano.dataInicioCiclo;
          const horario = esquema.horarios[0];
          const fimAtivo = addDays(inicio, esquema.diasAtivos - 1);
          return {
            fase: dados.emUso.dados.fase,
            dia: dados.emUso.dados.dia,
            total: dados.emUso.dados.fase === 'ativo' ? esquema.diasAtivos : esquema.diasPausa,
            restantesNaCartela: futuras.filter((dose) => dose <= combinarDataEHorario(fimAtivo, horario)).length,
            ultimoDaCartela: combinarDataEHorario(fimAtivo, horario),
            pausaDe: addDays(inicio, esquema.diasAtivos),
            pausaAte: addDays(inicio, esquema.diasAtivos + esquema.diasPausa - 1),
            novaCartelaPrevista: addDays(inicio, esquema.diasAtivos + esquema.diasPausa),
          };
        })()
      : null;

  const insuficiente =
    tratamento && estoque < tratamento.dosesRestantes
      ? { dosesRestantes: tratamento.dosesRestantes, faltam: tratamento.dosesRestantes - estoque, acabaEm: futuras[Math.max(estoque, 1) - 1] }
      : null;

  const inicioHistorico =
    plano.dataInicio ?? (cartela && cartela.fase === 'ativo' ? plano.dataInicioCiclo : null) ?? null;
  const diasSemRegistro =
    inicioHistorico && inicioHistorico < hoje ? { de: inicioHistorico, ate: subDays(hoje, 1) } : null;

  return {
    agora,
    proximasDoses: esquema.tipo === 'INTERVALO_HORAS' ? futuras.slice(0, 1) : futuras.slice(0, 4),
    primeiraDosePrevistaOriginal,
    tratamento,
    cartela,
    estoque: {
      quantidade: estoque,
      previsao: preverFimDoEstoque(esquema, estoque, agora, plano.primeiraDoseIntervalo),
      cartelasFechadas: cartela
        ? Math.floor(Math.max(0, estoque - cartela.restantesNaCartela) / Math.max(1, dados.comuns.quantidadePorEmbalagem))
        : null,
      insuficiente,
    },
    hoje: { tomadas: plano.dosesTomadasHoje, aAgendar: futuras.filter((dose) => isSameDay(dose, agora)) },
    diasSemRegistro,
    plano,
  };
}
