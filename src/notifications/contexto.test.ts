import { beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, type TestDb } from '@/db/create-test-db';
import { inserirDose, listarDosesPorEsquema, reagendarProximaNotificacao } from '@/db/repositories/doses';
import { buscarEsquemaPorId, inserirEsquema, paraEsquemaDominio } from '@/db/repositories/esquemas';
import { atualizarMedicamento, inserirMedicamento } from '@/db/repositories/medicamentos';
import { materializarJanela } from '@/domain/dose-scheduling/janela-rolante';
import { editarEsquema } from '@/domain/medication-registration/registration';
import { identificadorDose, identificadorPausaCiclo } from '@/domain/dose-notifications/reconciliador';

import { buscarContextoDaDose, listarAlvosDesejados } from './contexto';

describe('listarAlvosDesejados', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  it('inclui uma dose pendente com notificações ativas', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Losartana',
      dosagem: '50mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    const alvos = listarAlvosDesejados(db, new Date(2026, 0, 5));

    expect(alvos).toContainEqual({
      identifier: identificadorDose(dose.id),
      tipo: 'dose',
      dataHora: new Date(2026, 0, 10, 8, 0),
      agendador: 'notificacoes',
    });
  });

  it('exclui doses de medicamento com notificações desativadas', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Vitamina D',
      dosagem: '1 cápsula',
      criticidade: 'comum',
      quantidadeEmEstoque: 30,
      quantidadePorEmbalagem: 30,
      notificacoesAtivas: false,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00'] }).id;
    inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    expect(listarAlvosDesejados(db, new Date(2026, 0, 5))).toEqual([]);
  });

  it('inclui lembretes de pausa de um cíclico mesmo sem nenhuma dose ativa pendente no momento', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 21,
      quantidadePorEmbalagem: 21,
    }).id;
    // 21 ativos + 7 pausa a partir de 2026-01-01: pausa é 22..28/01. Sem doses
    // pendentes (todas já resolvidas), mas a pausa ainda deve ser lembrada.
    inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: new Date(2026, 0, 1),
      horarios: ['08:00'],
    });

    const alvos = listarAlvosDesejados(db, new Date(2026, 0, 22));

    expect(alvos.some((a) => a.identifier === identificadorPausaCiclo('e-inexistente', '2026-01-22'))).toBe(false);
    expect(alvos.some((a) => a.tipo === 'pausa-ciclo')).toBe(true);
  });

  it('nunca inclui doses "se necessário" (nunca têm proximaNotificacaoEm)', () => {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Analgésico',
      dosagem: '1 comprimido',
      criticidade: 'comum',
      quantidadeEmEstoque: 20,
      quantidadePorEmbalagem: 20,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'SE_NECESSARIO', medicamentoId, limiteDiario: 3 }).id;
    inserirDose(db, { esquemaId, status: 'tomada' });

    expect(listarAlvosDesejados(db, new Date(2026, 0, 5))).toEqual([]);
  });
});

describe('buscarContextoDaDose', () => {
  it('retorna o esquema de domínio e o medicamento dono da dose', () => {
    const db = createTestDb();
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Metformina',
      dosagem: '850mg',
      criticidade: 'comum',
      quantidadeEmEstoque: 60,
      quantidadePorEmbalagem: 60,
    }).id;
    const esquemaId = inserirEsquema(db, { tipo: 'DIARIO', medicamentoId, horarios: ['08:00', '20:00'] }).id;
    const dose = inserirDose(db, { esquemaId, dataHoraPrevista: new Date(2026, 0, 10, 8, 0) });

    const contexto = buscarContextoDaDose(db, dose.id);

    expect(contexto?.esquema.tipo).toBe('DIARIO');
    expect(contexto?.medicamento.nome).toBe('Metformina');
  });

  it('retorna null para uma dose inexistente', () => {
    const db = createTestDb();
    expect(buscarContextoDaDose(db, 'não-existe')).toBeNull();
  });
});

describe('listarAlvosDesejados — dose de início de cartela (inicio-de-cartela)', () => {
  let db: TestDb;
  beforeEach(() => (db = createTestDb()));

  function ciclicoAguardando(notificacoesAtivas: boolean) {
    const medicamentoId = inserirMedicamento(db, {
      nome: 'Anticoncepcional',
      dosagem: '1 comprimido',
      criticidade: 'especial',
      quantidadeEmEstoque: 28,
      quantidadePorEmbalagem: 28,
    }).id;
    if (!notificacoesAtivas) atualizarMedicamento(db, medicamentoId, { notificacoesAtivas: false });
    const esquemaId = inserirEsquema(db, {
      tipo: 'CICLICO',
      medicamentoId,
      horarios: ['22:00'],
      diasAtivos: 21,
      diasPausa: 7,
      dataInicioCiclo: null,
      inicioCartelaPrevisto: new Date(2026, 9, 29),
    }).id;
    const esquema = paraEsquemaDominio(buscarEsquemaPorId(db, esquemaId)!);
    materializarJanela(db, esquema, new Date(2026, 9, 27, 10));
    return listarDosesPorEsquema(db, esquemaId);
  }

  it('entra como alvo de dose, com o reenvio indefinido do especial', () => {
    const [inicio] = ciclicoAguardando(true);
    const alvos = listarAlvosDesejados(db, new Date(2026, 9, 27, 10));
    expect(alvos).toContainEqual(expect.objectContaining({ identifier: identificadorDose(inicio.id), dataHora: new Date(2026, 9, 29, 22) }));

    // Mesmo depois de muitos reenvios sem resposta, continua desejado.
    reagendarProximaNotificacao(db, inicio.id, { proximaNotificacaoEm: new Date(2026, 9, 31, 8), notificacoesSemResposta: 20 });
    expect(listarAlvosDesejados(db, new Date(2026, 9, 31, 7)).map((a) => a.identifier)).toContain(identificadorDose(inicio.id));
  });

  it('fica fora dos alvos com as notificações do medicamento desativadas', () => {
    const [inicio] = ciclicoAguardando(false);
    expect(inicio).toBeDefined();
    expect(listarAlvosDesejados(db, new Date(2026, 9, 27, 10))).toEqual([]);
  });

  it('depois de editar o horário com o início pendente, deseja um único alvo de início (fix-revisao-inicio-de-cartela)', () => {
    const [inicio] = ciclicoAguardando(true);
    expect(inicio).toBeDefined();
    const esquemaId = inicio.esquemaId;
    editarEsquema(db, esquemaId, { tipo: 'CICLICO', diasAtivos: 21, diasPausa: 7, horario: '23:00' }, new Date(2026, 9, 29, 22, 30));

    const alvos = listarAlvosDesejados(db, new Date(2026, 9, 29, 22, 30)).filter((a) => a.tipo === 'dose');
    expect(alvos).toHaveLength(1);
    expect(alvos[0]).toMatchObject({ agendador: 'alarme', dataHora: new Date(2026, 9, 29, 23, 0) });
  });
});
