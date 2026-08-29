import { describe, expect, it } from 'vitest';

import type { EsquemaCiclico } from '@/domain/dose-scheduling/types';

import { construirAlvosDeDoses, construirAlvosDePausa } from './alvos';
import { identificadorDose, identificadorPausaCiclo } from './reconciliador';

const doseBase = {
  proximaNotificacaoEm: new Date(2026, 0, 10, 8, 0),
  criticidade: 'comum' as const,
  notificacoesSemResposta: 0,
  notificacoesAtivas: true,
};

describe('construirAlvosDeDoses', () => {
  it('gera um alvo por dose com notificações ativas', () => {
    const alvos = construirAlvosDeDoses([{ ...doseBase, doseId: 'd1' }]);
    expect(alvos).toEqual([
      { identifier: identificadorDose('d1'), tipo: 'dose', dataHora: new Date(2026, 0, 10, 8, 0) },
    ]);
  });

  it('exclui doses de medicamentos com notificações desativadas (5.12)', () => {
    const alvos = construirAlvosDeDoses([
      { ...doseBase, doseId: 'd1', notificacoesAtivas: false },
      { ...doseBase, doseId: 'd2' },
    ]);
    expect(alvos.map((a) => a.identifier)).toEqual([identificadorDose('d2')]);
  });

  it('exclui um comum que já atingiu o limite de 4 notificações (só resta o prazo de silêncio, não um alarme)', () => {
    const alvos = construirAlvosDeDoses([
      { ...doseBase, doseId: 'd1', notificacoesSemResposta: 4 },
      { ...doseBase, doseId: 'd2', notificacoesSemResposta: 3 },
    ]);
    expect(alvos.map((a) => a.identifier)).toEqual([identificadorDose('d2')]);
  });

  it('nunca exclui um especial por contador alto', () => {
    const alvos = construirAlvosDeDoses([
      { ...doseBase, doseId: 'd1', criticidade: 'especial', notificacoesSemResposta: 20 },
    ]);
    expect(alvos).toHaveLength(1);
  });
});

describe('construirAlvosDePausa', () => {
  const esquema: EsquemaCiclico = {
    id: 'e1',
    medicamentoId: 'm1',
    tipo: 'CICLICO',
    diasAtivos: 21,
    diasPausa: 7,
    horarios: ['08:00'],
    dataInicioCiclo: new Date(2026, 0, 1),
  };

  it('gera lembretes de pausa apenas para ciclos com notificações ativas', () => {
    const alvos = construirAlvosDePausa(
      [{ esquema, notificacoesAtivas: false }],
      new Date(2026, 0, 22),
      new Date(2026, 0, 22),
    );
    expect(alvos).toEqual([]);
  });

  it('inclui o lembrete quando notificações estão ativas', () => {
    const alvos = construirAlvosDePausa(
      [{ esquema, notificacoesAtivas: true }],
      new Date(2026, 0, 22),
      new Date(2026, 0, 22),
    );
    expect(alvos.map((a) => a.identifier)).toEqual([identificadorPausaCiclo('e1', '2026-01-22')]);
  });
});
