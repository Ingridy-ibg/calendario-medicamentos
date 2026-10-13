import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { contarMedicamentos, listarMedicamentosComEsquema } from '@/db/repositories/medicamentos';
import { cadastrarMedicamento, retirarDaAgenda } from '@/domain/medication-registration/registration';

import { TAMANHO_PAGINA } from './lista';

const agora = new Date(2026, 9, 12, 7);
const cadastrar = (db: ReturnType<typeof createTestDb>, nome: string) =>
  cadastrarMedicamento(
    db,
    {
      comuns: { nome, dosagem: '1', criticidade: 'comum', quantidadeEmEstoque: 30, quantidadePorEmbalagem: 30 },
      esquema: { tipo: 'DIARIO', horarios: ['08:00'], duracao: { modo: 'continuo' } },
    },
    agora,
  ).medicamento.id;
const nomes = (linhas: ReturnType<typeof listarMedicamentosComEsquema>) => linhas.map(({ medicamento }) => medicamento.nome);

describe('listarMedicamentosComEsquema', () => {
  it('fora da agenda vem por último, cada grupo em ordem alfabética, com acentos como em português', () => {
    const db = createTestDb();
    cadastrar(db, 'Vitamina D');
    retirarDaAgenda(db, cadastrar(db, 'Amoxicilina'), agora);
    cadastrar(db, 'Losartana');
    cadastrar(db, 'Ácido fólico');

    expect(nomes(listarMedicamentosComEsquema(db))).toEqual(['Ácido fólico', 'Losartana', 'Vitamina D', 'Amoxicilina']);
  });

  it('os três filtros e a contagem', () => {
    const db = createTestDb();
    cadastrar(db, 'Vitamina D');
    retirarDaAgenda(db, cadastrar(db, 'Amoxicilina'), agora);
    cadastrar(db, 'Losartana');

    expect(nomes(listarMedicamentosComEsquema(db))).toEqual(['Losartana', 'Vitamina D', 'Amoxicilina']);
    expect(nomes(listarMedicamentosComEsquema(db, { naAgenda: true }))).toEqual(['Losartana', 'Vitamina D']);
    expect(nomes(listarMedicamentosComEsquema(db, { naAgenda: false }))).toEqual(['Amoxicilina']);
    expect(contarMedicamentos(db)).toEqual({ total: 3, naAgenda: 2 });
  });

  it('45 medicamentos em páginas de 20: 20, 20 e 5', () => {
    const db = createTestDb();
    const todos = Array.from({ length: 45 }, (_, i) => `Remédio ${String(i).padStart(2, '0')}`);
    todos.forEach((nome) => cadastrar(db, nome));

    const paginas = [0, 1, 2].map((pagina) => nomes(listarMedicamentosComEsquema(db, { limite: TAMANHO_PAGINA, deslocamento: pagina * TAMANHO_PAGINA })));
    expect(paginas.map((pagina) => pagina.length)).toEqual([20, 20, 5]);
    expect(paginas.flat()).toEqual(todos);
  });
});

describe('contarMedicamentos', () => {
  it('sem medicamentos é zero', () => {
    expect(contarMedicamentos(createTestDb())).toEqual({ total: 0, naAgenda: 0 });
  });
});
