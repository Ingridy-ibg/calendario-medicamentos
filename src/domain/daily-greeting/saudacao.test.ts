import { describe, expect, it } from 'vitest';

import type { ItemAgendaDose } from '@/domain/agenda-views/agenda-diaria';
import type { ResumoDoDia } from '@/domain/agenda-views/resumo-dia';

import { deveExibirSaudacao, periodoDoDia, resumoSaudacao, textoSaudacao } from './saudacao';

const em = (h: number, m = 0, dia = 12) => new Date(2026, 9, dia, h, m);

describe('periodoDoDia e textoSaudacao', () => {
  it.each([
    [4, 59, 'noite'],
    [5, 0, 'manha'],
    [11, 59, 'manha'],
    [12, 0, 'tarde'],
    [17, 59, 'tarde'],
    [18, 0, 'noite'],
    [2, 15, 'noite'],
  ] as const)('%i:%i é %s', (h, m, periodo) => {
    expect(periodoDoDia(em(h, m))).toBe(periodo);
  });

  it('usa só o primeiro nome', () => {
    expect(textoSaudacao('tarde', 'Ana Paula Souza')).toBe('Boa tarde, Ana!');
  });

  it('sem nome fica só a saudação', () => {
    expect(textoSaudacao('manha', null)).toBe('Bom dia!');
    expect(textoSaudacao('noite', '   ')).toBe('Boa noite!');
  });
});

const proxima: ItemAgendaDose = {
  tipo: 'dose',
  doseId: 'd',
  esquemaId: 'e',
  medicamentoId: 'm',
  nome: 'Losartana',
  dosagem: '50 mg',
  horario: em(8),
  status: 'pendente',
  horarioRegistro: null,
  posicaoCiclo: null,
  alertaEstoque: false,
};

function resumo(parcial: Partial<ResumoDoDia>): ResumoDoDia {
  return { tomadas: 0, total: 0, marcas: [], proxima: null, concluido: false, ...parcial };
}

describe('resumoSaudacao', () => {
  it('nenhuma resolvida: total do dia e primeira dose', () => {
    expect(resumoSaudacao(resumo({ total: 5, marcas: Array(5).fill('pendente'), proxima }))).toEqual({
      frase: 'Você tem 5 doses hoje.',
      cartao: { rotulo: 'Primeira dose', dose: 'Losartana às 08:00' },
    });
  });

  it('algumas resolvidas: tomadas até agora e próxima dose', () => {
    const r = resumoSaudacao(
      resumo({ tomadas: 2, total: 5, marcas: ['tomada', 'tomada_com_atraso', 'pendente', 'pendente', 'pendente'], proxima }),
    );
    expect(r).toEqual({ frase: '2 de 5 doses tomadas até agora.', cartao: { rotulo: 'Próxima dose', dose: 'Losartana às 08:00' } });
  });

  it('só uma pendente restante: última dose de hoje', () => {
    const r = resumoSaudacao(resumo({ tomadas: 2, total: 3, marcas: ['tomada', 'tomada', 'pendente'], proxima }));
    expect(r).toEqual({ frase: 'Falta só 1 dose para fechar o dia.', cartao: { rotulo: 'Última dose de hoje', dose: 'Losartana às 08:00' } });
  });

  it('todas resolvidas: sem cartão', () => {
    expect(resumoSaudacao(resumo({ tomadas: 3, total: 3, marcas: ['tomada', 'tomada', 'pulada'], concluido: true }))).toEqual({
      frase: 'Tudo certo com as doses de hoje.',
      cartao: null,
    });
  });

  it('nenhuma agendada (só "se necessário" não conta): sem cartão', () => {
    expect(resumoSaudacao(resumo({}))).toEqual({ frase: 'Nenhuma dose agendada para hoje.', cartao: null });
  });

  it('uma única dose no dia, ainda não tomada, usa o singular', () => {
    expect(resumoSaudacao(resumo({ total: 1, marcas: ['pendente'], proxima })).frase).toBe('Você tem 1 dose hoje.');
  });
});

describe('deveExibirSaudacao', () => {
  const base = { agora: em(7), ultimaExibicao: null, boasVindasConcluida: true, abertoPorNotificacao: false };

  it('primeira abertura do dia exibe', () => {
    expect(deveExibirSaudacao({ ...base, ultimaExibicao: em(22, 0, 11) })).toBe(true);
    expect(deveExibirSaudacao(base)).toBe(true);
  });

  it('segunda abertura do mesmo dia não exibe', () => {
    expect(deveExibirSaudacao({ ...base, agora: em(13, 40), ultimaExibicao: em(7, 12) })).toBe(false);
  });

  it('aberto por notificação não exibe', () => {
    expect(deveExibirSaudacao({ ...base, abertoPorNotificacao: true })).toBe(false);
  });

  it('boas-vindas pendente não exibe', () => {
    expect(deveExibirSaudacao({ ...base, boasVindasConcluida: false })).toBe(false);
  });

  it('virada do dia: 22:00 → 00:30 exibe de novo', () => {
    expect(deveExibirSaudacao({ ...base, agora: new Date(2026, 9, 13, 0, 30), ultimaExibicao: em(22) })).toBe(true);
  });
});
