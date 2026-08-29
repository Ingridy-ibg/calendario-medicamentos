import { describe, expect, it } from 'vitest';

import {
  adiarNotificacao,
  classificarResposta,
  decidirAposEntrega,
  prazoDeSilencioExpirou,
  precisaDeProximoAlarme,
} from './cascata';

const T = (h: number, m: number) => new Date(2026, 0, 10, h, m);

describe('decidirAposEntrega', () => {
  it('comum: agenda o próximo alarme enquanto abaixo do limite, incrementando a cada entrega', () => {
    expect(decidirAposEntrega('comum', 0, T(8, 0))).toEqual({
      notificacoesSemResposta: 1,
      proximaNotificacaoEm: T(8, 30),
      agendarProximoAlarme: true,
    });
    expect(decidirAposEntrega('comum', 1, T(8, 30))).toEqual({
      notificacoesSemResposta: 2,
      proximaNotificacaoEm: T(9, 0),
      agendarProximoAlarme: true,
    });
    expect(decidirAposEntrega('comum', 2, T(9, 0)).agendarProximoAlarme).toBe(true);
  });

  it('comum: a entrega que atinge a 4ª notificação NÃO agenda uma 5ª', () => {
    const decisao = decidirAposEntrega('comum', 3, T(9, 30));
    expect(decisao.notificacoesSemResposta).toBe(4);
    expect(decisao.agendarProximoAlarme).toBe(false);
    // O prazo ainda é registrado — vira o prazo de silêncio, não um alarme real.
    expect(decisao.proximaNotificacaoEm).toEqual(T(10, 0));
  });

  it('especial: sempre agenda o próximo, mesmo muito além de 4 entregas', () => {
    for (const contador of [0, 3, 4, 50]) {
      expect(decidirAposEntrega('especial', contador, T(8, 0)).agendarProximoAlarme).toBe(true);
    }
  });
});

describe('adiarNotificacao', () => {
  it('reagenda +30 minutos sem alterar o contador', () => {
    expect(adiarNotificacao(2, T(8, 0))).toEqual({ proximaNotificacaoEm: T(8, 30), notificacoesSemResposta: 2 });
  });

  it('tocar "adiar" repetidamente nunca altera o contador', () => {
    let contador = 3;
    for (let i = 0; i < 5; i++) {
      contador = adiarNotificacao(contador, T(8, 0)).notificacoesSemResposta;
    }
    expect(contador).toBe(3);
  });
});

describe('classificarResposta', () => {
  it('tomada quando confirmada antes de qualquer reenvio (0 ou 1 notificação entregue)', () => {
    expect(classificarResposta(0)).toBe('tomada');
    expect(classificarResposta(1)).toBe('tomada');
  });

  it('tomada com atraso quando confirmada depois de ao menos um reenvio já ter disparado', () => {
    expect(classificarResposta(2)).toBe('tomada_com_atraso');
    expect(classificarResposta(4)).toBe('tomada_com_atraso');
  });
});

describe('prazoDeSilencioExpirou', () => {
  it('falso antes do prazo da 4ª notificação vencer', () => {
    expect(prazoDeSilencioExpirou('comum', 4, T(10, 0), T(9, 59))).toBe(false);
  });

  it('verdadeiro exatamente no prazo (ou depois) da 4ª notificação comum', () => {
    expect(prazoDeSilencioExpirou('comum', 4, T(10, 0), T(10, 0))).toBe(true);
    expect(prazoDeSilencioExpirou('comum', 4, T(10, 0), T(11, 0))).toBe(true);
  });

  it('falso para comum com menos de 4 notificações, mesmo após o prazo', () => {
    expect(prazoDeSilencioExpirou('comum', 3, T(9, 30), T(12, 0))).toBe(false);
  });

  it('nunca verdadeiro para especial, não importa quantas notificações', () => {
    expect(prazoDeSilencioExpirou('especial', 50, T(8, 0), T(12, 0))).toBe(false);
  });
});

describe('precisaDeProximoAlarme', () => {
  it('comum: só até a 3ª notificação (a próxima ainda seria a 4ª, dentro do limite)', () => {
    expect(precisaDeProximoAlarme('comum', 0)).toBe(true);
    expect(precisaDeProximoAlarme('comum', 3)).toBe(true);
    expect(precisaDeProximoAlarme('comum', 4)).toBe(false);
    expect(precisaDeProximoAlarme('comum', 10)).toBe(false);
  });

  it('especial: sempre precisa, não importa quantas', () => {
    expect(precisaDeProximoAlarme('especial', 100)).toBe(true);
  });
});
