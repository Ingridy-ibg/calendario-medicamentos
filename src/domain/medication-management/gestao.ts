import { addDays, addHours, addYears, differenceInCalendarDays, isSameDay, startOfDay, subDays } from 'date-fns';

import { listarDosesPorEsquema } from '@/db/repositories/doses';
import { listarEsquemasPorMedicamento } from '@/db/repositories/esquemas';
import { atualizarMedicamento } from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import type { StatusDose } from '@/db/schema';
import { calcularStatusDoDia, gerarDosesCiclico } from '@/domain/dose-scheduling/ciclico';
import { gerarDosesDiario } from '@/domain/dose-scheduling/diario';
import { gerarDosesDiasSemana } from '@/domain/dose-scheduling/dias-semana';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import type { Esquema, EsquemaCiclico } from '@/domain/dose-scheduling/types';

// ---------------------------------------------------------------- compra

export type ResultadoQuantidadeCompra = { ok: true; quantidade: number } | { ok: false; erro: string };

/** specs/medication-stock: quantidade comprada é um inteiro positivo. */
export function validarQuantidadeCompra(texto: string): ResultadoQuantidadeCompra {
  const limpo = texto.trim();
  if (!/^\d+$/.test(limpo) || Number(limpo) <= 0) {
    return { ok: false, erro: 'Informe um número inteiro maior que zero.' };
  }
  return { ok: true, quantidade: Number(limpo) };
}

// ---------------------------------------------------------- notificações

/** Silencia ou reativa os lembretes de um medicamento (specs/dose-notifications). */
export function definirNotificacoesAtivas(db: AppDb, medicamentoId: string, ativas: boolean, agora: Date = new Date()) {
  return atualizarMedicamento(db, medicamentoId, { notificacoesAtivas: ativas }, agora);
}

// ------------------------------------------------------- textos do esquema

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function listar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

function textoDuracao(duracaoDias: number | null): string {
  return duracaoDias === null ? 'uso contínuo' : `por ${duracaoDias} ${duracaoDias === 1 ? 'dia' : 'dias'}`;
}

/** Resumo de uma linha para a lista (ex.: "Diário · 08:00, 20:00"). */
export function resumirEsquema(esquema: Esquema): string {
  switch (esquema.tipo) {
    case 'DIARIO':
      return `Diário · ${esquema.horarios.join(', ')}`;
    case 'INTERVALO_HORAS':
      return `A cada ${esquema.intervaloHoras} h`;
    case 'DIAS_SEMANA':
      return `${[...esquema.diasDaSemana].sort().map((d) => DIAS_CURTOS[d]).join(', ')} · ${esquema.horarios.join(', ')}`;
    case 'CICLICO':
      return `Cíclico ${esquema.diasAtivos}/${esquema.diasPausa}${esquema.horarios[0] ? ` · ${esquema.horarios[0]}` : ''}`;
    case 'SE_NECESSARIO':
      return `Se necessário · até ${esquema.limiteDiario} por dia`;
  }
}

/** Esquema por extenso para o detalhe: título e linha de apoio. */
export function descreverEsquema(esquema: Esquema): { titulo: string; subtitulo: string } {
  switch (esquema.tipo) {
    case 'DIARIO':
      return { titulo: `Todo dia às ${listar(esquema.horarios)}`, subtitulo: `Diário · ${textoDuracao(esquema.duracaoDias)}` };
    case 'INTERVALO_HORAS':
      return {
        titulo: `A cada ${esquema.intervaloHoras} horas`,
        subtitulo: `Conta a partir da última dose · ${textoDuracao(esquema.duracaoDias)}`,
      };
    case 'DIAS_SEMANA':
      return {
        titulo: `${listar([...esquema.diasDaSemana].sort().map((d) => DIAS_LONGOS[d]))} às ${listar(esquema.horarios)}`,
        subtitulo: `Dias da semana · ${textoDuracao(esquema.duracaoDias)}`,
      };
    case 'CICLICO':
      return {
        titulo: `${esquema.diasAtivos} dias tomando, ${esquema.diasPausa} de pausa`,
        subtitulo: `Cíclico${esquema.horarios[0] ? ` · todo dia ativo às ${esquema.horarios[0]}` : ''}`,
      };
    case 'SE_NECESSARIO':
      return { titulo: `Até ${esquema.limiteDiario} por dia`, subtitulo: 'Se necessário · sem lembretes' };
  }
}

// ------------------------------------------------------------ ciclo

export type SituacaoCiclo =
  | { tipo: 'ativo'; dia: number; total: number }
  | { tipo: 'pausa'; voltaEmDias: number }
  | { tipo: 'aguardando_cartela' };

/** Situação do cíclico hoje, para a lista (specs/medication-management). */
export function situacaoCiclo(esquema: EsquemaCiclico, hoje: Date): SituacaoCiclo {
  const status = calcularStatusDoDia(esquema, hoje);
  if (status.fase === 'ativo') return { tipo: 'ativo', dia: status.diaDoCiclo, total: status.totalDiasAtivos };
  if (status.fase === 'pausa' && esquema.dataInicioCiclo) {
    const fimDoCiclo = addDays(startOfDay(esquema.dataInicioCiclo), esquema.diasAtivos + esquema.diasPausa);
    return { tipo: 'pausa', voltaEmDias: differenceInCalendarDays(fimDoCiclo, startOfDay(hoje)) };
  }
  return { tipo: 'aguardando_cartela' };
}

export function textoSituacaoCiclo(situacao: SituacaoCiclo): string {
  if (situacao.tipo === 'ativo') return `Dia ${situacao.dia} de ${situacao.total}`;
  if (situacao.tipo === 'pausa') {
    return situacao.voltaEmDias <= 1 ? 'Em pausa · volta amanhã' : `Em pausa · volta em ${situacao.voltaEmDias} dias`;
  }
  return 'Aguardando nova cartela';
}

// -------------------------------------------------- adesão dos últimos dias

const ORDEM_PIOR: StatusDose[] = ['perdida', 'pulada', 'tomada_com_atraso', 'tomada'];

export interface AdesaoDias {
  dias: { dia: Date; pior: StatusDose | null }[];
  tomadas: number;
  total: number;
}

/**
 * Últimos `quantidade` dias (incluindo hoje) de um medicamento: o pior status
 * resolvido de cada dia e quantas doses resolvidas foram tomadas. Doses ainda
 * pendentes (como as de hoje) não contam; dias sem dose ficam neutros.
 */
export function adesaoUltimosDias(db: AppDb, medicamentoId: string, hoje: Date, quantidade = 7): AdesaoDias {
  const resolvidas = listarEsquemasPorMedicamento(db, medicamentoId)
    .flatMap((esquema) => listarDosesPorEsquema(db, esquema.id))
    .filter((dose) => dose.dataHoraPrevista !== null && ORDEM_PIOR.includes(dose.status));

  const dias = Array.from({ length: quantidade }, (_, indice) => startOfDay(subDays(hoje, quantidade - 1 - indice))).map((dia) => {
    const doDia = resolvidas.filter((dose) => isSameDay(dose.dataHoraPrevista!, dia));
    const pior = ORDEM_PIOR.find((status) => doDia.some((dose) => dose.status === status)) ?? null;
    return { dia, pior, doDia };
  });

  const doPeriodo = dias.flatMap((d) => d.doDia);
  return {
    dias: dias.map(({ dia, pior }) => ({ dia, pior })),
    tomadas: doPeriodo.filter((dose) => dose.status === 'tomada' || dose.status === 'tomada_com_atraso').length,
    total: doPeriodo.length,
  };
}

// ------------------------------------------------- previsão do estoque

export type PrevisaoEstoque =
  | { tipo: 'data'; data: Date; aproximada: boolean }
  | { tipo: 'acabou' }
  /** O tratamento de duração fixa termina antes de o estoque acabar. */
  | { tipo: 'sobra' }
  | { tipo: 'mais_de_2_anos' };

/**
 * Até quando o estoque dura (specs/medication-stock): cada dose prevista
 * depois de `agora` consome uma unidade; a data é a da dose que consome a
 * última. Usa os mesmos geradores da agenda/calendário. Intervalo em horas e
 * ciclos seguintes ao atual são estimativas (`aproximada`). `null` para "se
 * necessário" e cíclico aguardando nova cartela.
 */
export function preverFimDoEstoque(
  esquema: Esquema,
  estoque: number,
  agora: Date,
  proximaDoseIntervalo: Date | null = null,
): PrevisaoEstoque | null {
  if (esquema.tipo === 'SE_NECESSARIO') return null;
  if (esquema.tipo === 'CICLICO' && esquema.dataInicioCiclo === null) return null;
  if (estoque <= 0) return { tipo: 'acabou' };

  const limite = addYears(agora, 2);
  let futuras: { data: Date; aproximada: boolean }[];

  switch (esquema.tipo) {
    case 'DIARIO':
      futuras = gerarDosesDiario(esquema, agora, limite).map((d) => ({ data: d.dataHoraPrevista, aproximada: false }));
      break;
    case 'DIAS_SEMANA':
      futuras = gerarDosesDiasSemana(esquema, agora, limite).map((d) => ({ data: d.dataHoraPrevista, aproximada: false }));
      break;
    case 'CICLICO': {
      // O próximo ciclo só começa quando a nova cartela é confirmada; para a
      // previsão, supõe que começa logo depois da pausa (por isso aproximada).
      futuras = [];
      const duracaoCiclo = esquema.diasAtivos + esquema.diasPausa;
      let inicio = esquema.dataInicioCiclo!;
      for (let ciclo = 0; inicio <= limite; ciclo++, inicio = addDays(inicio, duracaoCiclo)) {
        const doCiclo = gerarDosesCiclico({ ...esquema, dataInicioCiclo: inicio }, agora, limite);
        futuras.push(...doCiclo.map((d) => ({ data: d.dataHoraPrevista, aproximada: ciclo > 0 })));
        if (futuras.filter((f) => f.data > agora).length >= estoque) break;
      }
      break;
    }
    case 'INTERVALO_HORAS': {
      futuras = [];
      for (
        let data = proximaDoseIntervalo ?? addHours(agora, esquema.intervaloHoras);
        data <= limite && estaDentroDaDuracao(esquema.dataInicio, esquema.duracaoDias, data);
        data = addHours(data, esquema.intervaloHoras)
      ) {
        futuras.push({ data, aproximada: true });
        if (futuras.length >= estoque) break;
      }
      break;
    }
  }

  const consumo = futuras.filter((f) => f.data > agora).sort((a, b) => a.data.getTime() - b.data.getTime());
  const ultima = consumo[estoque - 1];
  if (ultima) return { tipo: 'data', data: ultima.data, aproximada: ultima.aproximada };

  const temFim = esquema.tipo !== 'CICLICO' && esquema.duracaoDias !== null;
  return temFim ? { tipo: 'sobra' } : { tipo: 'mais_de_2_anos' };
}
