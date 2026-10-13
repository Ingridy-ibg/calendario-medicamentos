import { describe, expect, it } from 'vitest';

import {
  calcularStatusDoDia,
  confirmarPrimeiraDoseCiclo,
  ehInicioDeCartelaPendente,
  gerarDoseDeInicioDeCartela,
  gerarDosesCiclico,
  inicioPrevistoDaCartela,
  projetarCiclos,
} from './ciclico';
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

describe('inicioPrevistoDaCartela', () => {
  it('ciclo 21/7: dia seguinte ao fim da pausa, no horário do ciclo', () => {
    const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 9, 1, 22, 5), horarios: ['22:00'] });

    expect(inicioPrevistoDaCartela(esquema)).toEqual(new Date(2026, 9, 29, 22, 0));
  });

  it('ciclo sem pausa: dia seguinte ao último dia ativo', () => {
    const esquema = criarEsquema({ diasAtivos: 28, diasPausa: 0, dataInicioCiclo: new Date(2026, 9, 1) });

    expect(inicioPrevistoDaCartela(esquema)).toEqual(new Date(2026, 9, 29, 8, 0));
  });

  it('sem ciclo: o dia gravado, no horário atual do ciclo', () => {
    const esquema = criarEsquema({ dataInicioCiclo: null, inicioCartelaPrevisto: new Date(2026, 9, 13), horarios: ['21:00'] });

    expect(inicioPrevistoDaCartela(esquema)).toEqual(new Date(2026, 9, 13, 21, 0));
  });

  it('sem ciclo e sem dia gravado: nenhum início previsto', () => {
    expect(inicioPrevistoDaCartela(criarEsquema({ dataInicioCiclo: null }))).toBeNull();
  });
});

describe('gerarDoseDeInicioDeCartela', () => {
  const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 9, 1), horarios: ['22:00'] });

  it('início dentro da janela: uma única dose de dia 1', () => {
    expect(gerarDoseDeInicioDeCartela(esquema, new Date(2026, 9, 20), new Date(2026, 10, 10))).toEqual([
      { dataHoraPrevista: new Date(2026, 9, 29, 22, 0), numeroNoCiclo: 1 },
    ]);
  });

  it('início fora da janela: nada', () => {
    expect(gerarDoseDeInicioDeCartela(esquema, new Date(2026, 9, 1), new Date(2026, 9, 28))).toEqual([]);
    expect(gerarDoseDeInicioDeCartela(esquema, new Date(2026, 9, 30), new Date(2026, 10, 30))).toEqual([]);
  });

  it('sem ciclo, com dia gravado', () => {
    const semCiclo = criarEsquema({ dataInicioCiclo: null, inicioCartelaPrevisto: new Date(2026, 9, 14), horarios: ['22:00'] });

    expect(gerarDoseDeInicioDeCartela(semCiclo, new Date(2026, 9, 13, 15), new Date(2026, 10, 10))).toEqual([
      { dataHoraPrevista: new Date(2026, 9, 14, 22, 0), numeroNoCiclo: 1 },
    ]);
  });
});

describe('ehInicioDeCartelaPendente', () => {
  const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 9, 1), horarios: ['22:00'] });
  const dose = (overrides: Partial<{ numeroNoCiclo: number | null; status: string; dataHoraPrevista: Date | null }> = {}) => ({
    numeroNoCiclo: 1,
    status: 'pendente',
    dataHoraPrevista: new Date(2026, 9, 29, 22, 0),
    ...overrides,
  });

  it('dia 1 pendente depois do ciclo: é início pendente', () => {
    expect(ehInicioDeCartelaPendente(esquema, dose())).toBe(true);
    expect(ehInicioDeCartelaPendente(esquema, dose({ status: 'aguardando' }))).toBe(true);
  });

  it('início vencido de dias atrás continua pendente', () => {
    expect(ehInicioDeCartelaPendente(esquema, dose({ dataHoraPrevista: new Date(2026, 9, 29, 22) }))).toBe(true);
  });

  it('dia 1 do ciclo ancorado (cadastro em uso no dia 1) não é início pendente', () => {
    expect(ehInicioDeCartelaPendente(esquema, dose({ dataHoraPrevista: new Date(2026, 9, 1, 22, 0) }))).toBe(false);
  });

  it('dia 1 já resolvido ou outro dia do ciclo não são', () => {
    expect(ehInicioDeCartelaPendente(esquema, dose({ status: 'tomada' }))).toBe(false);
    expect(ehInicioDeCartelaPendente(esquema, dose({ numeroNoCiclo: 2 }))).toBe(false);
  });

  it('sem ciclo, o dia 1 pendente é início', () => {
    const semCiclo = criarEsquema({ dataInicioCiclo: null, inicioCartelaPrevisto: new Date(2026, 9, 14) });
    expect(ehInicioDeCartelaPendente(semCiclo, dose({ dataHoraPrevista: new Date(2026, 9, 14, 8) }))).toBe(true);
  });
});

describe('projetarCiclos', () => {
  const esquema = criarEsquema({ dataInicioCiclo: new Date(2026, 9, 1, 22, 5), horarios: ['22:00'] });
  const fase = (dias: ReturnType<typeof projetarCiclos>, dia: Date) =>
    dias.find((d) => d.dia.getTime() === dia.getTime());

  it('próxima cartela no mês: pausa, início e doses previstas depois', () => {
    const dias = projetarCiclos(esquema, new Date(2026, 9, 14), new Date(2026, 10, 1), new Date(2026, 9, 13));

    expect(fase(dias, new Date(2026, 9, 21))).toMatchObject({ fase: 'ativo', diaDoCiclo: 21 });
    expect(fase(dias, new Date(2026, 9, 22))).toEqual({ dia: new Date(2026, 9, 22), fase: 'pausa' });
    expect(fase(dias, new Date(2026, 9, 28))).toEqual({ dia: new Date(2026, 9, 28), fase: 'pausa' });
    expect(fase(dias, new Date(2026, 9, 29))).toEqual({
      dia: new Date(2026, 9, 29),
      fase: 'inicio-cartela',
      horario: new Date(2026, 9, 29, 22, 0),
    });
    expect(fase(dias, new Date(2026, 9, 30))).toMatchObject({ fase: 'ativo', diaDoCiclo: 2, horario: new Date(2026, 9, 30, 22, 0) });
    expect(fase(dias, new Date(2026, 9, 31))).toMatchObject({ fase: 'ativo', diaDoCiclo: 3 });
  });

  it('ciclos seguintes em meses à frente', () => {
    const dias = projetarCiclos(esquema, new Date(2026, 11, 1), new Date(2027, 0, 1), new Date(2026, 9, 13));

    // Cartelas em 29/10, 26/11, 24/12: 24/12 é início, 17/12–23/12 é pausa, 16/12 é dia 18.
    expect(fase(dias, new Date(2026, 11, 24))).toMatchObject({ fase: 'inicio-cartela' });
    expect(fase(dias, new Date(2026, 11, 17))).toMatchObject({ fase: 'pausa' });
    expect(fase(dias, new Date(2026, 11, 16))).toMatchObject({ fase: 'ativo', diaDoCiclo: 21 });
    expect(dias).toHaveLength(31);
  });

  it('cartela atrasada: supõe que começa hoje', () => {
    const dias = projetarCiclos(esquema, new Date(2026, 10, 1), new Date(2026, 10, 5), new Date(2026, 9, 31, 10));

    expect(fase(dias, new Date(2026, 10, 1))).toMatchObject({ fase: 'ativo', diaDoCiclo: 2 });
  });

  it('sem ciclo e sem início previsto: nada a projetar', () => {
    expect(projetarCiclos(criarEsquema({ dataInicioCiclo: null }), new Date(2026, 9, 1), new Date(2026, 10, 1), new Date(2026, 9, 1))).toEqual([]);
  });

  it('sem ciclo com início amanhã: hoje sem nada, amanhã início', () => {
    const semCiclo = criarEsquema({ dataInicioCiclo: null, inicioCartelaPrevisto: new Date(2026, 9, 14), horarios: ['22:00'] });
    const dias = projetarCiclos(semCiclo, new Date(2026, 9, 13), new Date(2026, 9, 16), new Date(2026, 9, 13, 23));

    expect(dias.map((d) => d.fase)).toEqual(['inicio-cartela', 'ativo']);
    expect(dias[0].dia).toEqual(new Date(2026, 9, 14));
  });
});
