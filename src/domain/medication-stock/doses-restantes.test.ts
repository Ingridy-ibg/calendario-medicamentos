import { describe, expect, it } from 'vitest';

import type { Esquema } from '@/domain/dose-scheduling/types';

import { contarDosesRestantesDoTratamento } from './doses-restantes';

const as = (dia: number, h: number, m = 0) => new Date(2026, 9, dia, h, m); // outubro de 2026
const base = { id: 'e', medicamentoId: 'm' };

describe('contarDosesRestantesDoTratamento', () => {
  it('diário 2×/dia por 10 dias desde 08/10, às 10:00 de 12/10: restam 11 doses (20:00 de hoje até 17/10)', () => {
    const esquema: Esquema = { ...base, tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracaoDias: 10, dataInicio: as(8, 0) };
    expect(contarDosesRestantesDoTratamento(esquema, as(12, 10), null)).toBe(11);
  });

  it('intervalo de 8 h por 2 dias a partir da próxima dose informada', () => {
    const esquema: Esquema = { ...base, tipo: 'INTERVALO_HORAS', intervaloHoras: 8, duracaoDias: 2, dataInicio: as(12, 0) };
    // 12/10 14:00, 22:00, 13/10 06:00, 14:00, 22:00
    expect(contarDosesRestantesDoTratamento(esquema, as(12, 10), as(12, 14))).toBe(5);
  });

  it('sem fim não tem contagem', () => {
    expect(contarDosesRestantesDoTratamento({ ...base, tipo: 'DIARIO', horarios: ['08:00'], duracaoDias: null, dataInicio: as(1, 0) }, as(12, 10), null)).toBeNull();
    expect(
      contarDosesRestantesDoTratamento({ ...base, tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horarios: ['22:00'], dataInicioCiclo: as(1, 0) }, as(12, 10), null),
    ).toBeNull();
    expect(contarDosesRestantesDoTratamento({ ...base, tipo: 'SE_NECESSARIO', limiteDiario: 3 }, as(12, 10), null)).toBeNull();
  });
});
