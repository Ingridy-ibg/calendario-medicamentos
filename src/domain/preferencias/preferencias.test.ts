import { describe, expect, it } from 'vitest';

import {
  deveExibirBoasVindas,
  esquemaDaAparencia,
  inicialDoNome,
  lerAparencia,
  lerDataGuardada,
  normalizarNome,
} from './preferencias';

describe('deveExibirBoasVindas', () => {
  it('exibe enquanto a flag não foi gravada', () => {
    expect(deveExibirBoasVindas(null)).toBe(true);
  });

  it('não exibe depois de concluída', () => {
    expect(deveExibirBoasVindas('1')).toBe(false);
  });
});

describe('normalizarNome e inicialDoNome', () => {
  it('vazio ou só espaços vira "sem nome"', () => {
    expect(normalizarNome('')).toBeNull();
    expect(normalizarNome('   ')).toBeNull();
    expect(normalizarNome(null)).toBeNull();
    expect(inicialDoNome('  ')).toBeNull();
  });

  it('apara e junta espaços repetidos', () => {
    expect(normalizarNome('  Ana   Paula ')).toBe('Ana Paula');
  });

  it('inicial em maiúscula, inclusive com acento', () => {
    expect(inicialDoNome('ana')).toBe('A');
    expect(inicialDoNome(' élida')).toBe('É');
  });
});

describe('aparência', () => {
  it('valor ausente ou desconhecido é "sistema"', () => {
    expect(lerAparencia(null)).toBe('sistema');
    expect(lerAparencia('roxo')).toBe('sistema');
    expect(lerAparencia('escuro')).toBe('escuro');
  });

  it('mapeia para Appearance.setColorScheme', () => {
    expect(esquemaDaAparencia('claro')).toBe('light');
    expect(esquemaDaAparencia('escuro')).toBe('dark');
    expect(esquemaDaAparencia('sistema')).toBe('unspecified');
  });
});

describe('lerDataGuardada', () => {
  it('faz a ida e volta de uma data em ISO', () => {
    const data = new Date(2026, 9, 12, 7, 12);
    expect(lerDataGuardada(data.toISOString())?.getTime()).toBe(data.getTime());
  });

  it('ausente ou inválida vira null', () => {
    expect(lerDataGuardada(null)).toBeNull();
    expect(lerDataGuardada('ontem')).toBeNull();
  });
});
