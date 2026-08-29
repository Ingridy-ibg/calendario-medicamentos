import { describe, expect, it } from 'vitest';

import type { EsquemaCiclico } from '@/domain/dose-scheduling/types';

import { gerarLembretesDePausa } from './pausa-ciclo';
import { identificadorPausaCiclo } from './reconciliador';

// 21 dias ativos, 7 de pausa, começando 2026-01-01 — pausa vai de 2026-01-22 a 2026-01-28.
const esquema: EsquemaCiclico = {
  id: 'e1',
  medicamentoId: 'm1',
  tipo: 'CICLICO',
  diasAtivos: 21,
  diasPausa: 7,
  horarios: ['08:00'],
  dataInicioCiclo: new Date(2026, 0, 1),
};

describe('gerarLembretesDePausa', () => {
  it('gera um lembrete por dia de pausa dentro do intervalo, no horário do esquema', () => {
    const alvos = gerarLembretesDePausa(esquema, new Date(2026, 0, 20), new Date(2026, 0, 24));

    expect(alvos.map((a) => a.identifier)).toEqual([
      identificadorPausaCiclo('e1', '2026-01-22'),
      identificadorPausaCiclo('e1', '2026-01-23'),
      identificadorPausaCiclo('e1', '2026-01-24'),
    ]);
    expect(alvos.every((a) => a.tipo === 'pausa-ciclo')).toBe(true);
    expect(alvos[0].dataHora).toEqual(new Date(2026, 0, 22, 8, 0));
  });

  it('não gera lembrete para dias ativos', () => {
    const alvos = gerarLembretesDePausa(esquema, new Date(2026, 0, 5), new Date(2026, 0, 10));
    expect(alvos).toEqual([]);
  });

  it('esquema em espera (sem dataInicioCiclo) não gera lembretes', () => {
    const emEspera: EsquemaCiclico = { ...esquema, dataInicioCiclo: null };
    expect(gerarLembretesDePausa(emEspera, new Date(2026, 0, 1), new Date(2026, 1, 1))).toEqual([]);
  });
});
