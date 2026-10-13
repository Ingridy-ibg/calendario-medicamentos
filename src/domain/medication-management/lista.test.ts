import { describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/create-test-db';
import { listarMedicamentosComEsquema } from '@/db/repositories/medicamentos';
import { cadastrarMedicamento, retirarDaAgenda } from '@/domain/medication-registration/registration';

import { filtrarEPaginar } from './lista';

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

describe('listarMedicamentosComEsquema', () => {
  it('fora da agenda vem por último, cada grupo em ordem alfabética', () => {
    const db = createTestDb();
    cadastrar(db, 'Vitamina D');
    retirarDaAgenda(db, cadastrar(db, 'Amoxicilina'), agora);
    cadastrar(db, 'Losartana');

    expect(listarMedicamentosComEsquema(db).map(({ medicamento }) => medicamento.nome)).toEqual(['Losartana', 'Vitamina D', 'Amoxicilina']);
  });
});

describe('filtrarEPaginar', () => {
  const lista = [
    { nome: 'Losartana', naAgenda: true },
    { nome: 'Vitamina D', naAgenda: true },
    { nome: 'Amoxicilina', naAgenda: false },
  ];

  it('os três filtros', () => {
    expect(filtrarEPaginar(lista, 'todos', 1).itens.map((i) => i.nome)).toEqual(['Losartana', 'Vitamina D', 'Amoxicilina']);
    expect(filtrarEPaginar(lista, 'na_agenda', 1).itens.map((i) => i.nome)).toEqual(['Losartana', 'Vitamina D']);
    expect(filtrarEPaginar(lista, 'fora_da_agenda', 1).itens.map((i) => i.nome)).toEqual(['Amoxicilina']);
  });

  it('45 itens em páginas de 20: 20, 40 e 45', () => {
    const muitos = Array.from({ length: 45 }, (_, i) => ({ nome: String(i), naAgenda: true }));
    expect([1, 2, 3].map((pagina) => filtrarEPaginar(muitos, 'todos', pagina))).toEqual([
      { itens: muitos.slice(0, 20), temMais: true },
      { itens: muitos.slice(0, 40), temMais: true },
      { itens: muitos, temMais: false },
    ]);
  });
});
