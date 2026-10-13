import { describe, expect, it } from 'vitest';

import type { Esquema } from '@/domain/dose-scheduling/types';

import { classificarEstoque, textoAlertaEstoque } from './alerta';

const base = { id: 'e', medicamentoId: 'm' };
const inicio = new Date(2026, 9, 1);
const continuo: Esquema = { ...base, tipo: 'DIARIO', horarios: ['08:00'], duracaoDias: null, dataInicio: inicio };
const tratamento: Esquema = { ...base, tipo: 'DIARIO', horarios: ['08:00', '20:00'], duracaoDias: 10, dataInicio: inicio };
const seNecessario: Esquema = { ...base, tipo: 'SE_NECESSARIO', limiteDiario: 3 };
const ciclico: Esquema = { ...base, tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horarios: ['22:00'], dataInicioCiclo: inicio };

describe('classificarEstoque', () => {
  it('uso contínuo na última caixa → baixo; com uma caixa ou mais → nada', () => {
    expect(classificarEstoque(continuo, 29, 30, null)).toEqual({ tipo: 'baixo' });
    expect(classificarEstoque(continuo, 0, 30, null)).toEqual({ tipo: 'baixo' });
    expect(classificarEstoque(continuo, 30, 30, null)).toBeNull();
    expect(classificarEstoque(continuo, 2 + 30, 30, null)).toBeNull();
  });

  it('tratamento com 11 doses e 8 unidades → insuficiente, faltam 3', () => {
    expect(classificarEstoque(tratamento, 8, 30, 11)).toEqual({ tipo: 'insuficiente', faltam: 3 });
  });

  it('tratamento com 14 doses e 20 unidades → sobram 6', () => {
    expect(classificarEstoque(tratamento, 20, 30, 14)).toEqual({ tipo: 'sobra', sobram: 6 });
  });

  it('tratamento com fim nunca recebe "baixo", mesmo abaixo de uma caixa', () => {
    expect(classificarEstoque(tratamento, 20, 30, 10)?.tipo).not.toBe('baixo');
    expect(classificarEstoque(tratamento, 10, 30, 10)).toBeNull();
  });

  it('"se necessário": 4 → baixo_leve; 5 → nada', () => {
    expect(classificarEstoque(seNecessario, 4, 20, null)).toEqual({ tipo: 'baixo_leve' });
    expect(classificarEstoque(seNecessario, 5, 20, null)).toBeNull();
  });

  it('cíclico na última cartela → baixo', () => {
    expect(classificarEstoque(ciclico, 20, 21, null)).toEqual({ tipo: 'baixo' });
    expect(classificarEstoque(ciclico, 21, 21, null)).toBeNull();
  });
});

describe('textoAlertaEstoque', () => {
  it('frases da spec', () => {
    expect(textoAlertaEstoque({ tipo: 'insuficiente', faltam: 3 })).toBe('Estoque insuficiente · faltam 3 para terminar');
    expect(textoAlertaEstoque({ tipo: 'baixo' })).toBe('Estoque baixo');
    expect(textoAlertaEstoque({ tipo: 'baixo_leve' })).toBe('Estoque baixo');
    expect(textoAlertaEstoque({ tipo: 'sobra', sobram: 6 })).toBe('Vão sobrar 6 quando o tratamento acabar');
  });
});
