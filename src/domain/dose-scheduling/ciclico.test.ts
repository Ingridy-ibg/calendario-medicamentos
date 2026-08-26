import { describe, expect, it } from 'vitest';

import { calcularStatusDoDia, confirmarPrimeiraDoseCiclo, gerarDosesCiclico } from './ciclico';
import type { EsquemaCiclico } from './types';

function criarEsquema(overrides: Partial<EsquemaCiclico> = {}): EsquemaCiclico {
  return {
    id: 'e1',
    medicamentoId: 'm1',
    tipo: 'CICLICO',
    diasAtivos: 21,
    diasPausa: 7,
    horarios: ['08:00'],
    dataInicioCiclo: new Date(2026, 0, 1),
    ...overrides,
  };
}

describe('calcularStatusDoDia', () => {
  it('esquema recém-cadastrado (dataInicioCiclo null) está sempre em espera', () => {
    const esquema = criarEsquema({ dataInicioCiclo: null });

    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 26))).toEqual({ fase: 'em_espera' });
  });

  it('dia ativo no meio do ciclo reporta a posição correta', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1) });

    // Dia 5 do ciclo = 2026-08-05 (índice 4).
    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 5))).toEqual({
      fase: 'ativo',
      diaDoCiclo: 5,
      totalDiasAtivos: 21,
    });
  });

  it('último dia ativo ainda é ativo, dia seguinte já é pausa', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1) });

    // dia 21 = índice 20 = 2026-08-21 (ativo); dia 22 = índice 21 = pausa.
    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 21))).toEqual({
      fase: 'ativo',
      diaDoCiclo: 21,
      totalDiasAtivos: 21,
    });
    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 22))).toEqual({ fase: 'pausa' });
  });

  it('dia de pausa não tem dose para confirmar', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1) });

    const doses = gerarDosesCiclico(esquema, new Date(2026, 7, 22), new Date(2026, 7, 22));

    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 22))).toEqual({ fase: 'pausa' });
    expect(doses).toEqual([]);
  });

  it('pausa termina mas ninguém confirmou a nova cartela: permanece em espera', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1) }); // ativo+pausa = 28 dias

    // dia 28 (índice 27) ainda é pausa; dia 29 (índice 28) já passou do fim do ciclo.
    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 28))).toEqual({ fase: 'pausa' });
    expect(calcularStatusDoDia(esquema, new Date(2026, 7, 29))).toEqual({ fase: 'em_espera' });

    // Sem confirmação, continua em espera indefinidamente — não volta a virar "ativo" sozinho.
    expect(calcularStatusDoDia(esquema, new Date(2026, 8, 30))).toEqual({ fase: 'em_espera' });
  });

  it('confirmando a primeira dose de uma nova cartela define um novo dia 1', () => {
    const esquemaEmEspera = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1) });
    const horarioConfirmacao = new Date(2026, 8, 5, 9, 15);

    const novoEsquema = confirmarPrimeiraDoseCiclo(esquemaEmEspera, horarioConfirmacao);

    expect(novoEsquema.dataInicioCiclo).toEqual(horarioConfirmacao);
    expect(calcularStatusDoDia(novoEsquema, horarioConfirmacao)).toEqual({
      fase: 'ativo',
      diaDoCiclo: 1,
      totalDiasAtivos: 21,
    });
  });

  it('lida corretamente com a virada de mês', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 0, 15) }); // 15 de janeiro

    // índice 20 (dia 21 do ciclo) = 15 jan + 20 dias = 4 de fevereiro.
    expect(calcularStatusDoDia(esquema, new Date(2026, 1, 4))).toEqual({
      fase: 'ativo',
      diaDoCiclo: 21,
      totalDiasAtivos: 21,
    });
  });

  it('lida corretamente com a virada de ano', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2025, 11, 20) }); // 20 de dezembro de 2025

    // 20 dez (índice 0) .. 31 dez = índice 11; 1 jan = índice 12 .. 5 jan = índice 16 (dia 17).
    expect(calcularStatusDoDia(esquema, new Date(2026, 0, 5))).toEqual({
      fase: 'ativo',
      diaDoCiclo: 17,
      totalDiasAtivos: 21,
    });
  });

  it('conta corretamente os dias num ano bissexto (29 de fevereiro existe)', () => {
    // 2028 é bissexto. Início em 15/fev/2028; 1/mar/2028 é o 16º dia do
    // ciclo porque fevereiro teve 29 dias naquele ano.
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2028, 1, 15) });

    expect(calcularStatusDoDia(esquema, new Date(2028, 2, 1))).toEqual({
      fase: 'ativo',
      diaDoCiclo: 16,
      totalDiasAtivos: 21,
    });
  });
});

describe('gerarDosesCiclico', () => {
  it('gera uma dose por dia ativo, com o número da posição no ciclo', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 7, 1), horarios: ['08:00'] });

    const doses = gerarDosesCiclico(esquema, new Date(2026, 7, 4), new Date(2026, 7, 6));

    expect(doses).toEqual([
      { dataHoraPrevista: new Date(2026, 7, 4, 8, 0), numeroNoCiclo: 4 },
      { dataHoraPrevista: new Date(2026, 7, 5, 8, 0), numeroNoCiclo: 5 },
      { dataHoraPrevista: new Date(2026, 7, 6, 8, 0), numeroNoCiclo: 6 },
    ]);
  });

  it('não gera nada enquanto o esquema está em espera', () => {
    const esquema = criarEsquema({ dataInicioCiclo: null });

    expect(gerarDosesCiclico(esquema, new Date(2026, 7, 1), new Date(2026, 7, 10))).toEqual([]);
  });
});
