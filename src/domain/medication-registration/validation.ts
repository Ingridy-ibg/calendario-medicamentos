import { differenceInCalendarDays, startOfDay } from 'date-fns';

import type { CamposComunsFormulario, DadosEsquemaFormulario, DadosFormularioMedicamento, ModoDuracao } from './types';

export type ErrosValidacao = Record<string, string>;

export function validarCamposComuns(comuns: CamposComunsFormulario): ErrosValidacao {
  const erros: ErrosValidacao = {};
  if (!comuns.nome.trim()) {
    erros.nome = 'Informe o nome do medicamento.';
  }
  if (!comuns.dosagem.trim()) {
    erros.dosagem = 'Informe a dose.';
  }
  const porEmbalagemValida = Number.isFinite(comuns.quantidadePorEmbalagem) && comuns.quantidadePorEmbalagem > 0;
  if (!porEmbalagemValida) {
    erros.quantidadePorEmbalagem = comuns.emCaixas ? 'Informe as unidades por caixa.' : 'Informe a quantidade por embalagem.';
  }
  if (comuns.emCaixas) {
    const { caixasFechadas, naCaixaEmUso } = comuns.emCaixas;
    if (!Number.isInteger(caixasFechadas) || caixasFechadas < 0) {
      erros.caixasFechadas = 'Informe quantas caixas fechadas há em casa.';
    }
    if (!Number.isInteger(naCaixaEmUso) || naCaixaEmUso < 0) {
      erros.naCaixaEmUso = 'Informe quantas unidades restam na caixa em uso.';
    } else if (porEmbalagemValida && naCaixaEmUso >= comuns.quantidadePorEmbalagem) {
      erros.naCaixaEmUso = `A caixa em uso tem menos de ${comuns.quantidadePorEmbalagem}; caixas cheias contam como fechadas.`;
    }
  } else if (!Number.isFinite(comuns.quantidadeEmEstoque) || comuns.quantidadeEmEstoque < 0) {
    erros.quantidadeEmEstoque = 'Informe a quantidade em estoque.';
  }
  return erros;
}

function validarDuracao(duracao: ModoDuracao): ErrosValidacao {
  if (duracao.modo === 'dias' && (!Number.isFinite(duracao.dias) || duracao.dias <= 0)) {
    return { duracao: 'Informe um número de dias válido.' };
  }
  return {};
}

export function validarEsquema(esquema: DadosEsquemaFormulario): ErrosValidacao {
  switch (esquema.tipo) {
    case 'DIARIO': {
      const erros = validarDuracao(esquema.duracao);
      if (esquema.horarios.length === 0) {
        erros.horarios = 'Informe ao menos um horário.';
      }
      return erros;
    }
    case 'INTERVALO_HORAS': {
      const erros = validarDuracao(esquema.duracao);
      if (!Number.isFinite(esquema.intervaloHoras) || esquema.intervaloHoras <= 0) {
        erros.intervaloHoras = 'Informe um intervalo em horas válido.';
      }
      return erros;
    }
    case 'DIAS_SEMANA': {
      const erros = validarDuracao(esquema.duracao);
      if (esquema.diasDaSemana.length === 0) {
        erros.diasDaSemana = 'Selecione ao menos um dia da semana.';
      }
      if (esquema.horarios.length === 0) {
        erros.horarios = 'Informe ao menos um horário.';
      }
      return erros;
    }
    case 'CICLICO': {
      const erros: ErrosValidacao = {};
      if (!Number.isFinite(esquema.diasAtivos) || esquema.diasAtivos <= 0) {
        erros.diasAtivos = 'Informe o número de dias ativos.';
      }
      if (!Number.isFinite(esquema.diasPausa) || esquema.diasPausa <= 0) {
        erros.diasPausa = 'Informe o número de dias de pausa.';
      }
      if (!esquema.horario) {
        erros.horario = 'Informe o horário diário da dose.';
      }
      return erros;
    }
    case 'SE_NECESSARIO': {
      const erros: ErrosValidacao = {};
      if (!Number.isFinite(esquema.limiteDiario) || esquema.limiteDiario <= 0) {
        erros.limiteDiario = 'Informe o limite diário de doses.';
      }
      return erros;
    }
  }
}

export function validarFormulario(dados: DadosFormularioMedicamento): ErrosValidacao {
  return { ...validarCamposComuns(dados.comuns), ...validarEsquema(dados.esquema) };
}

/**
 * Respostas de "Já estava tomando" (specs/medication-registration de
 * register-ongoing-medication): início no futuro, tratamento já encerrado,
 * última dose no futuro e dia da cartela/pausa fora da faixa.
 */
export function validarEmUso(dados: DadosFormularioMedicamento, agora: Date): ErrosValidacao {
  const emUso = dados.emUso?.dados;
  if (!emUso) return {};
  const erros: ErrosValidacao = {};
  const { esquema } = dados;

  const inicio = emUso.tipo === 'inicio' ? emUso.dataInicio : emUso.tipo === 'intervalo' ? emUso.dataInicio : undefined;
  if (inicio) {
    if (startOfDay(inicio) > startOfDay(agora)) {
      erros.dataInicio = 'A data de início não pode ser no futuro.';
    } else if ('duracao' in esquema && esquema.duracao.modo === 'dias' && differenceInCalendarDays(agora, inicio) >= esquema.duracao.dias) {
      erros.dataInicio = 'Esse tratamento já terminou.';
    }
  }

  if (emUso.tipo === 'intervalo' && emUso.ultimaDose > agora) {
    erros.ultimaDose = 'A última dose não pode ser no futuro.';
  }

  if (emUso.tipo === 'ciclo' && esquema.tipo === 'CICLICO') {
    const limite = emUso.fase === 'ativo' ? esquema.diasAtivos : esquema.diasPausa;
    if (!Number.isInteger(emUso.dia) || emUso.dia < 1 || emUso.dia > limite) {
      erros.diaCiclo = `Informe um dia entre 1 e ${limite}.`;
    }
  }

  return erros;
}
