import { describe, expect, it } from 'vitest';

import {
  analisarIdentificador,
  identificadorDose,
  identificadorPausaCiclo,
  planejarReconciliacao,
} from './reconciliador';

describe('planejarReconciliacao', () => {
  it('agenda alvos desejados que ainda não estão no sistema', () => {
    const alvo = { identifier: identificadorDose('d1'), tipo: 'dose' as const, dataHora: new Date('2026-01-10T08:00:00'), agendador: 'notificacoes' as const };

    const plano = planejarReconciliacao([alvo], []);

    expect(plano.agendar).toEqual([alvo]);
    expect(plano.cancelar).toEqual([]);
  });

  it('reagenda um alvo mesmo se seu identifier já está no sistema (aplicação é idempotente: cancela e recria)', () => {
    const alvo = { identifier: identificadorDose('d1'), tipo: 'dose' as const, dataHora: new Date('2026-01-10T08:00:00'), agendador: 'notificacoes' as const };

    const plano = planejarReconciliacao([alvo], [{ identifier: alvo.identifier, agendador: 'notificacoes' }]);

    expect(plano.agendar).toEqual([alvo]);
    expect(plano.cancelar).toEqual([]);
  });

  it('cancela uma notificação nossa que está agendada mas não é mais desejada (dose resolvida/removida)', () => {
    const idStale = identificadorDose('d-antiga');

    const plano = planejarReconciliacao([], [{ identifier: idStale, agendador: 'notificacoes' }]);

    expect(plano.cancelar).toEqual([{ identifier: idStale, agendador: 'notificacoes' }]);
  });

  it('nunca cancela um alarme agendado por outra parte do sistema/SO', () => {
    const plano = planejarReconciliacao([], [{ identifier: 'algum-outro-alarme-do-sistema', agendador: 'notificacoes' }]);

    expect(plano.cancelar).toEqual([]);
  });

  it('lida com doses e lembretes de pausa de ciclo ao mesmo tempo', () => {
    const alvoDose = { identifier: identificadorDose('d1'), tipo: 'dose' as const, dataHora: new Date(), agendador: 'alarme' as const };
    const alvoPausa = {
      identifier: identificadorPausaCiclo('e1', '2026-01-15'),
      tipo: 'pausa-ciclo' as const,
      dataHora: new Date(),
      agendador: 'notificacoes' as const,
    };

    const plano = planejarReconciliacao([alvoDose, alvoPausa], []);

    expect(plano.agendar).toHaveLength(2);
  });

  it('comum → especial: cancela a notificação e agenda o alarme com o mesmo id', () => {
    const id = identificadorDose('d1');
    const alvo = { identifier: id, tipo: 'dose' as const, dataHora: new Date(), agendador: 'alarme' as const };

    const plano = planejarReconciliacao([alvo], [{ identifier: id, agendador: 'notificacoes' }]);

    expect(plano.cancelar).toEqual([{ identifier: id, agendador: 'notificacoes' }]);
    expect(plano.agendar).toEqual([alvo]);
  });

  it('especial → comum: cancela o alarme e agenda a notificação com o mesmo id', () => {
    const id = identificadorDose('d1');
    const alvo = { identifier: id, tipo: 'dose' as const, dataHora: new Date(), agendador: 'notificacoes' as const };

    const plano = planejarReconciliacao(
      [alvo],
      [
        { identifier: id, agendador: 'alarme' },
        { identifier: id, agendador: 'notificacoes' },
      ],
    );

    expect(plano.cancelar).toEqual([{ identifier: id, agendador: 'alarme' }]);
    expect(plano.agendar).toEqual([alvo]);
  });
});

describe('analisarIdentificador', () => {
  it('é o inverso de identificadorDose', () => {
    expect(analisarIdentificador(identificadorDose('d1'))).toEqual({ tipo: 'dose', doseId: 'd1' });
  });

  it('é o inverso de identificadorPausaCiclo', () => {
    expect(analisarIdentificador(identificadorPausaCiclo('e1', '2026-01-22'))).toEqual({
      tipo: 'pausa-ciclo',
      esquemaId: 'e1',
    });
  });

  it('retorna null para um identificador que não é nosso', () => {
    expect(analisarIdentificador('outra-coisa')).toBeNull();
  });
});
