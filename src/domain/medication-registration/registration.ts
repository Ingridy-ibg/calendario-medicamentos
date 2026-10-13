import { addHours, isSameDay, startOfDay } from 'date-fns';

import {
  apagarDoseNaoResolvida,
  inserirDose,
  listarDosesPorEsquema,
  listarDosesResolvidasPorEsquema,
  resolverDose,
  substituirDosesFuturas,
} from '@/db/repositories/doses';
import {
  atualizarEsquema,
  buscarEsquemaPorId,
  type EsquemaRow,
  inserirEsquema,
  listarEsquemasPorMedicamento,
  type NovoEsquema,
  paraEsquemaDominio,
  reiniciarEsquema,
  removerEsquema,
} from '@/db/repositories/esquemas';
import {
  atualizarMedicamento,
  buscarMedicamentoPorId,
  inserirMedicamento,
  removerMedicamento,
} from '@/db/repositories/medicamentos';
import type { AppDb } from '@/db/repositories/types';
import { estaDentroDaDuracao } from '@/domain/dose-scheduling/duracao';
import { gerarPrimeiraDoseIntervalo } from '@/domain/dose-scheduling/intervalo-horas';
import { materializarJanela, rematerializarJanelaAposEdicao } from '@/domain/dose-scheduling/janela-rolante';

import { paraDadosFormulario, paraValoresFormulario } from './formulario';
import type { DadosEsquemaFormulario, DadosFormularioMedicamento, ModoDuracao } from './types';
import { type HistoricoDaVolta, montarPreviaCadastro, type PlanoCadastro, type PreviaCadastro } from './previa';
import { validarEmUso, validarEsquema, validarFormulario } from './validation';

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
function paraNovoEsquema(
  medicamentoId: string,
  esquema: DadosEsquemaFormulario,
  plano: Pick<PlanoCadastro, 'dataInicio' | 'dataInicioCiclo'> = { dataInicio: null, dataInicioCiclo: null },
): NovoEsquema {
  switch (esquema.tipo) {
    case 'DIARIO':
      return {
        tipo: 'DIARIO',
        medicamentoId,
        horarios: esquema.horarios,
        duracaoDias: duracaoParaDias(esquema.duracao),
        dataInicio: plano.dataInicio,
      };
    case 'INTERVALO_HORAS':
      return {
        tipo: 'INTERVALO_HORAS',
        medicamentoId,
        intervaloHoras: esquema.intervaloHoras,
        duracaoDias: duracaoParaDias(esquema.duracao),
        dataInicio: plano.dataInicio,
      };
    case 'DIAS_SEMANA':
      return {
        tipo: 'DIAS_SEMANA',
        medicamentoId,
        diasDaSemana: esquema.diasDaSemana,
        horarios: esquema.horarios,
        duracaoDias: duracaoParaDias(esquema.duracao),
        dataInicio: plano.dataInicio,
      };
    case 'CICLICO':
      return {
        tipo: 'CICLICO',
        medicamentoId,
        diasAtivos: esquema.diasAtivos,
        diasPausa: esquema.diasPausa,
        dataInicioCiclo: plano.dataInicioCiclo,
        horarios: [esquema.horario],
      };
    case 'SE_NECESSARIO':
      return { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: esquema.limiteDiario };
  }
}

/**
 * Materializa as primeiras doses de um esquema recém-criado conforme o plano
 * da prévia (register-ongoing-medication): doses de hoje de horário já
 * passado só ficam se informadas como tomadas — aí entram no histórico como
 * tomadas, sem descontar estoque (o estoque informado já é o de agora).
 */
function materializarDosesIniciais(db: AppDb, esquemaRow: EsquemaRow, plano: PlanoCadastro, agora: Date) {
  const dominio = paraEsquemaDominio(esquemaRow);
  const tomadasHoje = new Set(plano.dosesTomadasHoje.map((data) => data.getTime()));
  // Volta à agenda: horário que já tem dose resolvida não ganha outra (fix-agenda-membership-review).
  const jaResolvidos = new Set(plano.horariosJaResolvidos.map((data) => data.getTime()));

  switch (dominio.tipo) {
    case 'DIARIO':
    case 'DIAS_SEMANA':
    case 'CICLICO': {
      // Cíclico sem âncora fica aguardando a nova cartela: nada a gerar.
      materializarJanela(db, dominio, agora);
      for (const dose of listarDosesPorEsquema(db, dominio.id)) {
        if (!dose.dataHoraPrevista) continue;
        if (jaResolvidos.has(dose.dataHoraPrevista.getTime())) {
          apagarDoseNaoResolvida(db, dose.id);
          continue;
        }
        if (!isSameDay(dose.dataHoraPrevista, agora) || dose.dataHoraPrevista > agora) continue;
        if (tomadasHoje.has(dose.dataHoraPrevista.getTime())) {
          resolverDose(db, dose.id, { status: 'tomada', dataHoraRegistro: dose.dataHoraPrevista });
        } else {
          apagarDoseNaoResolvida(db, dose.id);
        }
      }
      return;
    }
    case 'INTERVALO_HORAS': {
      for (const tomada of plano.dosesTomadasHoje) {
        const dose = inserirDose(db, { esquemaId: dominio.id, dataHoraPrevista: tomada });
        resolverDose(db, dose.id, { status: 'tomada', dataHoraRegistro: tomada });
      }
      const primeira = gerarPrimeiraDoseIntervalo(dominio, { agora });
      inserirDose(db, { esquemaId: dominio.id, dataHoraPrevista: plano.primeiraDoseIntervalo ?? primeira.dataHoraPrevista });
      return;
    }
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
/**
 * Valida o cadastro sem gravar e devolve a prévia para "Confira antes de
 * salvar". Lança `ErroValidacao` com os erros dos campos.
 */
export function prepararCadastro(dados: DadosFormularioMedicamento, agora: Date) {
  const erros = { ...validarFormulario(dados), ...validarEmUso(dados, agora) };
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(erros);
  }
  return montarPreviaCadastro(dados, agora);
}

export interface OpcoesCadastro {
  /** `false` = só cadastrar, fora da agenda: sem doses e ignorando "Já estava tomando" (agenda-membership). */
  naAgenda?: boolean;
}

export function cadastrarMedicamento(db: AppDb, dadosInformados: DadosFormularioMedicamento, agora: Date, { naAgenda = true }: OpcoesCadastro = {}) {
  const dados = naAgenda ? dadosInformados : { ...dadosInformados, emUso: undefined };
  prepararCadastro(dados, agora);

  // A mesma prévia que a tela de confirmação mostra decide o que é gravado.
  const previa = montarPreviaCadastro(dados, agora);

  // Medicamentos cíclicos são sempre especiais, independentemente do valor
  // selecionado pelo usuário no controle de criticidade.
  const criticidade = dados.esquema.tipo === 'CICLICO' ? 'especial' : dados.comuns.criticidade;
  // `emCaixas` é só como a tela informou; o banco guarda unidades.
  const { emCaixas: _emCaixas, ...comuns } = dados.comuns;

  return db.transaction((tx) => {
    const medicamento = inserirMedicamento(tx, { ...comuns, criticidade, naAgenda }, agora);
    const esquema = inserirEsquema(tx, paraNovoEsquema(medicamento.id, dados.esquema, previa.plano), agora);
    if (naAgenda) materializarDosesIniciais(tx, buscarEsquemaPorId(tx, esquema.id)!, previa.plano, agora);
    return { medicamento, esquema, previa };
  });
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
  // Fora da agenda não gera doses; a volta à agenda recomeça o esquema.
  if (buscarMedicamentoPorId(db, esquemaAtualizado.medicamentoId)?.naAgenda) {
    materializarDosesFuturasAposEdicao(db, esquemaAtualizado, agora);
  }
  return esquemaAtualizado;
}

/**
 * Edita um medicamento inteiro a partir do formulário (manage-medications,
 * decisão 3): campos comuns — inclusive a correção da quantidade em estoque —
 * e parâmetros do esquema, numa transação. O tipo de esquema não pode mudar
 * (specs/medication-registration); para isso é preciso remover e recadastrar.
 */
export function editarMedicamento(db: AppDb, medicamentoId: string, dados: DadosFormularioMedicamento, agora: Date) {
  const erros = validarFormulario(dados);
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(erros);
  }

  const esquemaAtual = listarEsquemasPorMedicamento(db, medicamentoId).find((esquema) => esquema.deletedAt === null);
  if (!esquemaAtual) {
    throw new Error(`Medicamento ${medicamentoId} sem esquema ativo`);
  }
  if (esquemaAtual.tipo !== dados.esquema.tipo) {
    throw new ErroValidacao({ tipo: 'O tipo de esquema não pode ser trocado. Remova e cadastre de novo.' });
  }

  // Medicamentos cíclicos são sempre especiais, como no cadastro.
  const criticidade = dados.esquema.tipo === 'CICLICO' ? 'especial' : dados.comuns.criticidade;
  const { emCaixas: _emCaixas, ...comuns } = dados.comuns;

  return db.transaction((tx) => {
    const medicamento = atualizarMedicamento(tx, medicamentoId, { ...comuns, criticidade }, agora);
    const esquema = editarEsquema(tx, esquemaAtual.id, dados.esquema, agora);
    return { medicamento, esquema };
  });
}

function materializarDosesFuturasAposEdicao(db: AppDb, esquemaRow: EsquemaRow, agora: Date) {
  const dominio = paraEsquemaDominio(esquemaRow);
  switch (dominio.tipo) {
    case 'DIARIO':
    case 'DIAS_SEMANA':
    case 'CICLICO':
      // Só as doses depois de agora: uma pendente de horário já passado
      // continua a mesma (manage-medications, decisão 4).
      rematerializarJanelaAposEdicao(db, dominio, agora);
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

// ------------------------------------------------- na agenda / fora da agenda

function esquemaAtivoDe(db: AppDb, medicamentoId: string) {
  const esquema = listarEsquemasPorMedicamento(db, medicamentoId).find((linha) => linha.deletedAt === null);
  if (!esquema) throw new Error(`Medicamento ${medicamentoId} sem esquema ativo`);
  return esquema;
}

/**
 * Retira da agenda (agenda-membership, decisão 3): apaga as doses ainda não
 * resolvidas e mantém o histórico. Quem chama reconcilia as notificações.
 */
export function retirarDaAgenda(db: AppDb, medicamentoId: string, agora: Date) {
  db.transaction((tx) => {
    atualizarMedicamento(tx, medicamentoId, { naAgenda: false }, agora);
    substituirDosesFuturas(tx, esquemaAtivoDe(tx, medicamentoId).id, []);
  });
}

/** Doses resolvidas de hoje em diante e a última tomada — o que a volta à agenda não pode duplicar nem ignorar. */
function historicoDaVolta(db: AppDb, esquemaId: string, agora: Date): HistoricoDaVolta {
  const resolvidas = listarDosesResolvidasPorEsquema(db, esquemaId);
  const tomadas = resolvidas.filter((dose) => dose.status === 'tomada' || dose.status === 'tomada_com_atraso');
  const ultimaTomada = tomadas.reduce<Date | null>((ultima, dose) => {
    const quando = dose.dataHoraRegistro ?? dose.dataHoraPrevista;
    return quando && (ultima === null || quando > ultima) ? quando : ultima;
  }, null);
  return {
    resolvidas: resolvidas.flatMap((dose) =>
      dose.dataHoraPrevista && dose.dataHoraPrevista >= startOfDay(agora)
        ? [{ previsto: dose.dataHoraPrevista, tomada: dose.status === 'tomada' || dose.status === 'tomada_com_atraso' }]
        : [],
    ),
    ultimaTomada,
  };
}

/**
 * Dados e prévia da volta à agenda — o medicamento como se fosse cadastrado
 * agora, sem "Já estava tomando", mas sem repetir horários já resolvidos e,
 * no intervalo em horas, contando a partir da última dose tomada. É o que a
 * confirmação mostra e o que `adicionarAAgenda` grava.
 */
export function prepararVoltaAAgenda(db: AppDb, medicamentoId: string, agora: Date): { dados: DadosFormularioMedicamento; previa: PreviaCadastro } {
  const medicamento = buscarMedicamentoPorId(db, medicamentoId);
  if (!medicamento) throw new Error(`Medicamento ${medicamentoId} não encontrado`);
  const esquema = esquemaAtivoDe(db, medicamentoId);
  const dados = paraDadosFormulario(paraValoresFormulario(medicamento, esquema));
  return { dados, previa: montarPreviaCadastro(dados, agora, historicoDaVolta(db, esquema.id, agora)) };
}

/**
 * Volta à agenda com a prévia já conferida (de `prepararVoltaAAgenda`): o
 * esquema recomeça em `previa.agora` (duração a partir de hoje, cíclico
 * aguardando a nova cartela) e as doses saem do plano — horários de hoje já
 * passados ou já resolvidos não geram dose. Quem chama reconcilia as
 * notificações.
 */
export function adicionarAAgenda(db: AppDb, medicamentoId: string, previa: PreviaCadastro) {
  const { agora } = previa;
  return db.transaction((tx) => {
    const esquema = esquemaAtivoDe(tx, medicamentoId);
    atualizarMedicamento(tx, medicamentoId, { naAgenda: true }, agora);
    substituirDosesFuturas(tx, esquema.id, []);
    const reiniciado = reiniciarEsquema(tx, esquema.id, agora, agora)!;
    materializarDosesIniciais(tx, reiniciado, previa.plano, agora);
    return previa;
  });
}
