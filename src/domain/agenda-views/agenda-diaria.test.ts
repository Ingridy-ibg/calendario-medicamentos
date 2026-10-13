import { addDays } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose } from '@/db/repositories/doses';
import { buscarEsquemaPorId, inserirEsquema, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { buscarMedicamentoPorId, inserirMedicamento, removerMedicamento } from '@/db/repositories/medicamentos';
import { materializarJanela } from '@/domain/dose-scheduling/janela-rolante';
import { confirmarNovaCartelaCiclica } from '@/domain/dose-scheduling/resolucao';
import { cadastrarMedicamento } from '@/domain/medication-registration/registration';
import type { EsquemaCiclico, EsquemaDiario } from '@/domain/dose-scheduling/types';

import { montarAgendaDoDia } from './agenda-diaria';
import { agruparPorPeriodo, resumirDia } from './resumo-dia';

const HOJE = new Date(2026, 7, 26, 7, 0); // 26/08/2026, quarta-feira

describe('montarAgendaDoDia', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('lista uma dose diária de hoje com seu status', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: null,
      dataInicio: HOJE,
    };
    materializarJanela(db, esquema, HOJE);

    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda).toHaveLength(1);
    expect(agenda[0]).toMatchObject({
      tipo: 'dose',
      nome: 'Losartana',
      status: 'pendente',
      horario: new Date(2026, 7, 26, 8, 0),
      posicaoCiclo: null,
    });
  });

  it('não lista uma dose de outro dia', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 27, 8, 0) });

    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('mostra a posição no ciclo para um medicamento cíclico com dose hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    const esquemaId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 7, 22), // dia 1
      horarios: ['08:00'],
    }).id;
    const esquema: EsquemaCiclico = {
      id: esquemaId,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: new Date(2026, 7, 22),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 22));

    // 26/08 é o 5º dia (22,23,24,25,26).
    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda[0]).toMatchObject({ tipo: 'dose', posicaoCiclo: { dia: 5, totalDiasAtivos: 21 } });
  });

  it('não lista nada para um cíclico em dia de pausa (sem dose para confirmar)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    const esquema: EsquemaCiclico = {
      id: inserirEsquema(db, {
        tipo: 'CICLICO',
        medicamentoId,
        diasAtivos: 21,
        diasPausa: 7,
        dataInicioCiclo: new Date(2026, 7, 1),
        horarios: ['08:00'],
      }).id,
      medicamentoId,
      tipo: 'CICLICO',
      diasAtivos: 21,
      diasPausa: 7,
      horarios: ['08:00'],
      dataInicioCiclo: new Date(2026, 7, 1),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 1));

    // 1/8 + 21 dias ativos = pausa começa em 22/8; hoje (26/8) é pausa.
    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('mostra um "se necessário" com o progresso do limite diário, mesmo sem nenhuma dose hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 20,
      quantidadePorEmbalagem: 20,
    }).id;
    inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 4 });

    const agenda = montarAgendaDoDia(db, HOJE);

    expect(agenda).toEqual([
      expect.objectContaining({
        tipo: 'se_necessario',
        nome: 'Analgésico',
        registradasHoje: 0,
        limiteDiario: 4,
      }),
    ]);
  });

  it('sinaliza alerta de estoque baixo junto ao item', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 5,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 26, 8, 0) });

    expect(montarAgendaDoDia(db, HOJE)[0]).toMatchObject({ alertaEstoque: true });
  });

  it('curso de duração fixa já encerrado não aparece na agenda de hoje (8.3)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Antibiótico',
      dosagem: '500mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 14,
      quantidadePorEmbalagem: 14,
    }).id;
    const esquemaId = inserirEsquema(db, {
      tipo: 'DIARIO',
      medicamentoId,
      horarios: ['08:00'],
      duracaoDias: 7,
    }).id;
    const esquema: EsquemaDiario = {
      id: esquemaId,
      medicamentoId,
      tipo: 'DIARIO',
      horarios: ['08:00'],
      duracaoDias: 7,
      dataInicio: new Date(2026, 7, 1),
    };
    materializarJanela(db, esquema, new Date(2026, 7, 1));

    // Curso de 7 dias a partir de 1/8 termina em 7/8 — hoje (26/8) é bem depois.
    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });

  it('medicamento removido não aparece mesmo que ainda exista uma linha de dose para hoje', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 7, 26, 8, 0) });

    removerMedicamento(db, medicamentoId, HOJE);

    expect(montarAgendaDoDia(db, HOJE)).toEqual([]);
  });
});

describe('montarAgendaDoDia — cíclico aguardando nova cartela', () => {
  const cadastro = new Date(2026, 9, 12, 21, 0);
  const comuns = {
    nome: 'Anticoncepcional',
    dosagem: '1 comp.',
    criticidade: 'especial' as const,
    quantidadeEmEstoque: 28,
    quantidadePorEmbalagem: 21,
  };

  function cadastrarCiclico(db: TestDb) {
    return cadastrarMedicamento(db, { comuns, esquema: { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '22:00' } }, cadastro)
      .esquema.id;
  }

  function esquemaDoBanco(db: TestDb, id: string) {
    return paraEsquemaDominio(buscarEsquemaPorId(db, id)!) as EsquemaCiclico;
  }

  it('recém-cadastrado aparece como aguardando, na noite, sem contar no resumo', () => {
    const db = createTestDb();
    cadastrarCiclico(db);
    const agenda = montarAgendaDoDia(db, cadastro);
    expect(agenda).toMatchObject([{ tipo: 'aguardando_cartela', nome: 'Anticoncepcional' }]);
    expect(agruparPorPeriodo(agenda).map((s) => s.chave)).toEqual(['noite']);
    expect(resumirDia(agenda).total).toBe(0);
  });

  it('iniciar a cartela: dose de hoje tomada (dia 1), estoque −1, dose de amanhã prevista e sem item aguardando', () => {
    const db = createTestDb();
    const esquemaId = cadastrarCiclico(db);
    const agora = new Date(2026, 9, 12, 22, 5);

    confirmarNovaCartelaCiclica(db, esquemaDoBanco(db, esquemaId), agora);

    const hoje = montarAgendaDoDia(db, agora);
    expect(hoje).toMatchObject([{ tipo: 'dose', status: 'tomada', posicaoCiclo: { dia: 1, totalDiasAtivos: 21 } }]);
    expect(buscarMedicamentoPorId(db, hoje[0].medicamentoId)?.quantidadeEmEstoque).toBe(27);
    expect(montarAgendaDoDia(db, addDays(agora, 1))).toMatchObject([{ tipo: 'dose', status: 'pendente', posicaoCiclo: { dia: 2 } }]);
  });

  it('depois da pausa volta a aparecer como aguardando', () => {
    const db = createTestDb();
    const esquemaId = cadastrarCiclico(db);
    confirmarNovaCartelaCiclica(db, esquemaDoBanco(db, esquemaId), new Date(2026, 9, 12, 22, 5));

    // 21 dias ativos + 7 de pausa: 09/11 é o primeiro dia sem ciclo.
    expect(montarAgendaDoDia(db, new Date(2026, 10, 5, 9)).some((i) => i.tipo === 'aguardando_cartela')).toBe(false);
    expect(montarAgendaDoDia(db, new Date(2026, 10, 9, 9))).toMatchObject([{ tipo: 'aguardando_cartela' }]);
  });
});
