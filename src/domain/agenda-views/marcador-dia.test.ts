import { describe, expect, it } from 'vitest';

import type { StatusDose } from '@/db/schema';

import type { ItemDiaCalendario } from './calendario-mensal';
import { marcadorDoDia } from './marcador-dia';

const historico = (status: StatusDose, atrasada = false): ItemDiaCalendario => ({
  tipo: 'historico',
  medicamentoId: 'm',
  nome: 'X',
  horario: new Date(2026, 9, 10, 8),
  status,
  atrasada,
});
const previsto: ItemDiaCalendario = { tipo: 'previsto', medicamentoId: 'm', nome: 'X', horario: new Date(2026, 9, 20, 8), estimado: false };
const pausa: ItemDiaCalendario = { tipo: 'pausa-ciclo', medicamentoId: 'm', nome: 'X' };

describe('marcadorDoDia', () => {
  it('dia sem nada não tem marcador', () => {
    expect(marcadorDoDia([])).toBeNull();
  });

  it('usa o pior status registrado, preenchido', () => {
    expect(marcadorDoDia([historico('tomada'), historico('perdida')])).toEqual({ token: 'statusPerdida', estilo: 'cheio' });
    expect(marcadorDoDia([historico('tomada'), historico('pulada')])).toEqual({ token: 'statusNeutro', estilo: 'cheio' });
    expect(marcadorDoDia([historico('tomada'), historico('tomada_com_atraso')])).toEqual({
      token: 'statusAtraso',
      estilo: 'cheio',
    });
    expect(marcadorDoDia([historico('tomada')])).toEqual({ token: 'statusTomada', estilo: 'cheio' });
  });

  it('dia futuro só com previstas fica em contorno', () => {
    expect(marcadorDoDia([previsto])).toEqual({ token: 'accent', estilo: 'contorno' });
  });

  it('hoje só com pendentes também fica em contorno', () => {
    expect(marcadorDoDia([historico('pendente')])).toEqual({ token: 'accent', estilo: 'contorno' });
  });

  it('dose atrasada sem resposta: contorno âmbar, a menos que haja perdida', () => {
    expect(marcadorDoDia([historico('tomada'), historico('pendente', true)])).toEqual({ token: 'statusAtraso', estilo: 'contorno' });
    expect(marcadorDoDia([historico('perdida'), historico('pendente', true)])).toEqual({ token: 'statusPerdida', estilo: 'cheio' });
  });

  it('dia de pausa fica em contorno neutro', () => {
    expect(marcadorDoDia([pausa])).toEqual({ token: 'statusNeutro', estilo: 'contorno' });
  });
});
