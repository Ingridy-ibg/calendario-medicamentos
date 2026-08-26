import { describe, expect, it } from 'vitest';

import { gerarPrimeiraDoseIntervalo, gerarProximaDoseIntervalo } from './intervalo-horas';
import type { EsquemaIntervaloHoras } from './types';

function criarEsquema(overrides: Partial<EsquemaIntervaloHoras> = {}): EsquemaIntervaloHoras {
  return {
    id: 'e1',
    medicamentoId: 'm1',
    tipo: 'INTERVALO_HORAS',
    intervaloHoras: 8,
    duracaoDias: null,
    dataInicio: new Date(2026, 7, 26, 14, 0),
    ...overrides,
  };
}

describe('gerarProximaDoseIntervalo', () => {
  it('dose confirmada adiantada: a próxima é 8h após o horário REAL de confirmação', () => {
    const esquema = criarEsquema();

    const proxima = gerarProximaDoseIntervalo(esquema, {
      dataHoraPrevista: new Date(2026, 7, 26, 14, 0),
      dataHoraRegistro: new Date(2026, 7, 26, 12, 0), // confirmada 2h antes
      status: 'tomada',
    });

    expect(proxima).toEqual({ dataHoraPrevista: new Date(2026, 7, 26, 20, 0) });
  });

  it('dose confirmada atrasada: a próxima é 8h após o horário REAL de confirmação', () => {
    const esquema = criarEsquema();

    const proxima = gerarProximaDoseIntervalo(esquema, {
      dataHoraPrevista: new Date(2026, 7, 26, 14, 0),
      dataHoraRegistro: new Date(2026, 7, 26, 18, 0), // confirmada 4h depois
      status: 'tomada_com_atraso',
    });

    expect(proxima).toEqual({ dataHoraPrevista: new Date(2026, 7, 27, 2, 0) });
  });

  it('pular preserva a grade original: a próxima é calculada a partir do horário PREVISTO, não do clique', () => {
    const esquema = criarEsquema();

    const proxima = gerarProximaDoseIntervalo(esquema, {
      dataHoraPrevista: new Date(2026, 7, 26, 14, 0),
      // Mesmo que o app registre o instante do toque em "não tomar" em algum
      // outro campo, ele NUNCA deve ser usado como referência aqui.
      dataHoraRegistro: new Date(2026, 7, 26, 19, 30),
      status: 'pulada',
    });

    expect(proxima).toEqual({ dataHoraPrevista: new Date(2026, 7, 26, 22, 0) });
  });

  it('retorna null quando a próxima dose cairia depois do fim da duração fixa', () => {
    const esquema = criarEsquema({
      dataInicio: new Date(2026, 7, 20, 8, 0),
      duracaoDias: 7, // termina no fim do dia 2026-08-26
    });

    const proxima = gerarProximaDoseIntervalo(esquema, {
      dataHoraPrevista: new Date(2026, 7, 26, 20, 0),
      dataHoraRegistro: new Date(2026, 7, 26, 20, 0),
      status: 'tomada',
    });

    // 20:00 + 8h cairia em 2026-08-27, já fora da duração de 7 dias.
    expect(proxima).toBeNull();
  });
});

describe('gerarPrimeiraDoseIntervalo', () => {
  it('usa a data de início do esquema como âncora da primeira dose', () => {
    const esquema = criarEsquema({ dataInicio: new Date(2026, 7, 26, 14, 0) });

    expect(gerarPrimeiraDoseIntervalo(esquema)).toEqual({
      dataHoraPrevista: new Date(2026, 7, 26, 14, 0),
    });
  });
});
