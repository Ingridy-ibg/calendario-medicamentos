import { addHours } from 'date-fns';

import { inserirDose, substituirDosesFuturas } from '@/db/repositories/doses';
import {
  atualizarEsquema,
  buscarEsquemaPorId,
  type EsquemaRow,
  inserirEsquema,
  listarEsquemasPorMedicamento,
  type NovoEsquema,
  paraEsquemaDominio,
  removerEsquema,
} from '@/db/repositories/esquemas';
import {
  buscarMedicamentoPorId,
  inserirMedicamento,
  removerMedicamento,
} from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import { gerarPrimeiraDoseIntervalo } from '@/domain/dose-scheduling/intervalo-horas';
import { materializarJanela } from '@/domain/dose-scheduling/janela-rolante';

import type { DadosEsquemaFormulario, DadosFormularioMedicamento, ModoDuracao } from './types';
import { validarEsquema, validarFormulario } from './validation';

export class ErroValidacao extends Error {
  constructor(public readonly erros: Record<string, string>) {
    super('Formulário inválido');
    this.name = 'ErroValidacao';
  }
}

function duracaoParaDias(duracao: ModoDuracao): number | null {
  return duracao.modo === 'continuo' ? null : duracao.dias;
}

/**
 * Um medicamento cíclico recém-cadastrado começa `dataInicioCiclo: null`
 * (em espera) — nunca "agora mesmo" — porque um novo ciclo só existe quando
 * a primeira dose é confirmada explicitamente (ver specs/dose-scheduling e
 * o Open Question correspondente em design.md).
 */
function paraNovoEsquema(medicamentoId: string, esquema: DadosEsquemaFormulario): NovoEsquema {
  switch (esquema.tipo) {
    case 'DIARIO':
      return {
        tipo: 'DIARIO',
        medicamentoId,
        horarios: esquema.horarios,
        duracaoDias: duracaoParaDias(esquema.duracao),
      };
    case 'INTERVALO_HORAS':
      return {
        tipo: 'INTERVALO_HORAS',
        medicamentoId,
        intervaloHoras: esquema.intervaloHoras,
        duracaoDias: duracaoParaDias(esquema.duracao),
      };
    case 'DIAS_SEMANA':
      return {
        tipo: 'DIAS_SEMANA',
        medicamentoId,
        diasDaSemana: esquema.diasDaSemana,
        horarios: esquema.horarios,
        duracaoDias: duracaoParaDias(esquema.duracao),
      };
    case 'CICLICO':
      return {
        tipo: 'CICLICO',
        medicamentoId,
        diasAtivos: esquema.diasAtivos,
        diasPausa: esquema.diasPausa,
        dataInicioCiclo: null,
        horarios: [esquema.horario],
      };
    case 'SE_NECESSARIO':
      return { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: esquema.limiteDiario };
  }
}

/** Materializa a(s) primeira(s) dose(s) de um esquema recém-criado, conforme seu tipo. */
function materializarDosesIniciais(db: AppDb, esquemaRow: EsquemaRow, agora: Date) {
  const dominio = paraEsquemaDominio(esquemaRow);
  switch (dominio.tipo) {
    case 'DIARIO':
    case 'DIAS_SEMANA':
      materializarJanela(db, dominio, agora);
      return;
    case 'INTERVALO_HORAS': {
      const primeira = gerarPrimeiraDoseIntervalo(dominio);
      inserirDose(db, { esquemaId: dominio.id, dataHoraPrevista: primeira.dataHoraPrevista });
      return;
    }
    case 'CICLICO':
      // Em espera até a primeira confirmação — nada a materializar ainda.
      return;
    case 'SE_NECESSARIO':
      // Nunca pré-gera doses.
      return;
  }
}

/**
 * Cadastra um medicamento com seu esquema e materializa suas doses
 * iniciais. Lança `ErroValidacao` se os dados não passarem na validação
 * (specs/medication-registration).
 */
export function cadastrarMedicamento(db: AppDb, dados: DadosFormularioMedicamento, agora: Date) {
  const erros = validarFormulario(dados);
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(erros);
  }

  // Medicamentos cíclicos são sempre especiais, independentemente do valor
  // selecionado pelo usuário no controle de criticidade.
  const criticidade = dados.esquema.tipo === 'CICLICO' ? 'especial' : dados.comuns.criticidade;

  const medicamento = inserirMedicamento(db, { ...dados.comuns, criticidade }, agora);
  const esquema = inserirEsquema(db, paraNovoEsquema(medicamento.id, dados.esquema), agora);

  materializarDosesIniciais(db, buscarEsquemaPorId(db, esquema.id)!, agora);

  return { medicamento, esquema };
}

/**
 * Edita os parâmetros de um esquema existente. Só afeta a geração de doses
 * futuras — nunca reescreve linhas de `doses` já resolvidas (ver 2.5 e
 * "Edição de um medicamento" em specs/medication-registration).
 */
export function editarEsquema(db: AppDb, esquemaId: string, novosDados: DadosEsquemaFormulario, agora: Date) {
  const erros = validarEsquema(novosDados);
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(erros);
  }

  const esquemaAtual = buscarEsquemaPorId(db, esquemaId);
  if (!esquemaAtual) {
    throw new Error(`Esquema ${esquemaId} não encontrado`);
  }

  const novo = paraNovoEsquema(esquemaAtual.medicamentoId, novosDados);
  // dataInicioCiclo nunca faz parte do patch: editar campos de um ciclo em
  // andamento não deve reiniciar sua âncora de dia 1.
  const patch = {
    horarios: null as string[] | null,
    intervaloHoras: null as number | null,
    diasDaSemana: null as number[] | null,
    diasAtivos: null as number | null,
    diasPausa: null as number | null,
    duracaoDias: null as number | null,
    limiteDiario: null as number | null,
  };
  switch (novo.tipo) {
    case 'DIARIO':
      patch.horarios = novo.horarios;
      patch.duracaoDias = novo.duracaoDias ?? null;
      break;
    case 'INTERVALO_HORAS':
      patch.intervaloHoras = novo.intervaloHoras;
      patch.duracaoDias = novo.duracaoDias ?? null;
      break;
    case 'DIAS_SEMANA':
      patch.diasDaSemana = novo.diasDaSemana;
      patch.horarios = novo.horarios;
      patch.duracaoDias = novo.duracaoDias ?? null;
      break;
    case 'CICLICO':
      patch.diasAtivos = novo.diasAtivos;
      patch.diasPausa = novo.diasPausa;
      patch.horarios = novo.horarios;
      break;
    case 'SE_NECESSARIO':
      patch.limiteDiario = novo.limiteDiario;
      break;
  }
  atualizarEsquema(db, esquemaId, patch, agora);

  const esquemaAtualizado = buscarEsquemaPorId(db, esquemaId)!;
  materializarDosesFuturasAposEdicao(db, esquemaAtualizado, agora);
  return esquemaAtualizado;
}

function materializarDosesFuturasAposEdicao(db: AppDb, esquemaRow: EsquemaRow, agora: Date) {
  const dominio = paraEsquemaDominio(esquemaRow);
  switch (dominio.tipo) {
    case 'DIARIO':
    case 'DIAS_SEMANA':
    case 'CICLICO':
      materializarJanela(db, dominio, agora);
      return;
    case 'INTERVALO_HORAS': {
      // Não existe uma grade futura pré-computada para este tipo (só a
      // próxima dose pendente, ver design.md) — ela é recalculada a partir
      // de agora com o novo intervalo, sem tocar em doses já resolvidas.
      substituirDosesFuturas(db, dominio.id, []);
      const dataHoraPrevista = addHours(agora, dominio.intervaloHoras);
      if (estaDentroDaDuracao(dominio.dataInicio, dominio.duracaoDias, dataHoraPrevista)) {
        inserirDose(db, { esquemaId: dominio.id, dataHoraPrevista });
      }
      return;
    }
    case 'SE_NECESSARIO':
      return;
  }
}

/**
 * Remove um medicamento: para a geração de doses futuras e apaga as doses
 * futuras ainda pendentes (nunca as já resolvidas), preservando o histórico
 * de adesão acessível (ver "Remoção de um medicamento" em
 * specs/medication-registration).
 */
export function removerMedicamentoComHistorico(db: AppDb, medicamentoId: string, agora: Date) {
  const medicamento = buscarMedicamentoPorId(db, medicamentoId);
  if (!medicamento) {
    throw new Error(`Medicamento ${medicamentoId} não encontrado`);
  }

  removerMedicamento(db, medicamentoId, agora);

  for (const esquema of listarEsquemasPorMedicamento(db, medicamentoId)) {
    removerEsquema(db, esquema.id, agora);
    substituirDosesFuturas(db, esquema.id, []);
  }
}
