import { describe, expect, it } from 'vitest';

import { classificarResposta, deveVirarPerdida, estaAtrasada } from './classificacao';

const as = (h: number, m = 0) => new Date(2026, 9, 12, h, m);
const prevista = as(8);

describe('classificarResposta', () => {
  it('até 30 minutos depois, sem reenvio: tomada', () => {
    expect(classificarResposta({ dataHoraPrevista: prevista, notificacoesSemResposta: 0 }, as(8, 20))).toBe('tomada');
    expect(classificarResposta({ dataHoraPrevista: prevista, notificacoesSemResposta: 1 }, as(8, 30))).toBe('tomada');
  });

  it('mais de 30 minutos depois, mesmo sem nenhuma notificação: com atraso', () => {
    expect(classificarResposta({ dataHoraPrevista: prevista, notificacoesSemResposta: 0 }, as(8, 31))).toBe('tomada_com_atraso');
    expect(classificarResposta({ dataHoraPrevista: prevista, notificacoesSemResposta: 0 }, as(14))).toBe('tomada_com_atraso');
  });

  it('com reenvio entregue: com atraso', () => {
    expect(classificarResposta({ dataHoraPrevista: prevista, notificacoesSemResposta: 2 }, as(8, 10))).toBe('tomada_com_atraso');
  });
});

describe('estaAtrasada', () => {
  it('só depois de 30 minutos e enquanto não resolvida', () => {
    expect(estaAtrasada({ dataHoraPrevista: prevista, status: 'pendente' }, as(8, 30))).toBe(false);
    expect(estaAtrasada({ dataHoraPrevista: prevista, status: 'pendente' }, as(8, 31))).toBe(true);
    expect(estaAtrasada({ dataHoraPrevista: prevista, status: 'aguardando' }, as(9))).toBe(true);
    expect(estaAtrasada({ dataHoraPrevista: prevista, status: 'tomada' }, as(9))).toBe(false);
    expect(estaAtrasada({ dataHoraPrevista: null, status: 'pendente' }, as(9))).toBe(false);
  });
});

describe('deveVirarPerdida', () => {
  it('comum vira perdida a partir de 2 horas depois', () => {
    expect(deveVirarPerdida({ dataHoraPrevista: prevista, status: 'pendente' }, 'comum', as(9, 59))).toBe(false);
    expect(deveVirarPerdida({ dataHoraPrevista: prevista, status: 'pendente' }, 'comum', as(10))).toBe(true);
    expect(deveVirarPerdida({ dataHoraPrevista: prevista, status: 'aguardando' }, 'comum', as(10, 1))).toBe(true);
  });

  it('especial nunca vira perdida', () => {
    expect(deveVirarPerdida({ dataHoraPrevista: prevista, status: 'pendente' }, 'especial', as(23))).toBe(false);
  });

  it('dose já resolvida não muda', () => {
    expect(deveVirarPerdida({ dataHoraPrevista: prevista, status: 'pulada' }, 'comum', as(11))).toBe(false);
  });
});
