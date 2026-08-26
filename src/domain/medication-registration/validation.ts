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
  if (!Number.isFinite(comuns.quantidadeEmEstoque) || comuns.quantidadeEmEstoque < 0) {
    erros.quantidadeEmEstoque = 'Informe a quantidade em estoque.';
  }
  if (!Number.isFinite(comuns.quantidadePorEmbalagem) || comuns.quantidadePorEmbalagem <= 0) {
    erros.quantidadePorEmbalagem = 'Informe a quantidade por embalagem.';
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
