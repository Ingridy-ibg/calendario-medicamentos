import { describe, expect, it } from 'vitest';

import type { StatusDose } from '@/db/schema';

import type { ItemAgendaDose, ItemAgendaSeNecessario } from './agenda-diaria';
import { agruparPorPeriodo, resumirDia } from './resumo-dia';

function dose(nome: string, hora: string | null, status: StatusDose): ItemAgendaDose {
  const [h, m] = hora ? hora.split(':').map(Number) : [0, 0];
  return {
    tipo: 'dose',
    doseId: `${nome}-${hora}`,
    esquemaId: `e-${nome}`,
    medicamentoId: `m-${nome}`,
    nome,
    dosagem: '1 un.',
    horario: hora ? new Date(2026, 9, 12, h, m) : null,
    status,
    horarioRegistro: null,
    posicaoCiclo: null,
    alertaEstoque: false,
  };
}

const seNecessario: ItemAgendaSeNecessario = {
  tipo: 'se_necessario',
  esquemaId: 'e-dipirona',
  medicamentoId: 'm-dipirona',
  nome: 'Dipirona',
  dosagem: '1 g',
  registradasHoje: 1,
  limiteDiario: 4,
  alertaEstoque: false,
};

describe('resumirDia', () => {
  it('conta tomadas e com atraso sobre o total de doses agendadas e aponta a próxima', () => {
    const resumo = resumirDia([
      dose('Losartana', '08:00', 'tomada'),
      dose('Metformina', '08:00', 'tomada_com_atraso'),
      dose('Vitamina D', '14:00', 'pendente'),
      dose('Metformina', '20:00', 'pendente'),
      dose('Sinvastatina', '22:00', 'pendente'),
      seNecessario,
    ]);
    expect(resumo.tomadas).toBe(2);
    expect(resumo.total).toBe(5);
    expect(resumo.marcas).toEqual(['tomada', 'tomada_com_atraso', 'pendente', 'pendente', 'pendente']);
    expect(resumo.proxima?.nome).toBe('Vitamina D');
    expect(resumo.concluido).toBe(false);
  });

  it('dia vazio: nada a resumir', () => {
    expect(resumirDia([])).toEqual({ tomadas: 0, total: 0, marcas: [], proxima: null, concluido: false });
  });

  it('só "se necessário" não conta como dose agendada', () => {
    const resumo = resumirDia([seNecessario]);
    expect(resumo.total).toBe(0);
    expect(resumo.concluido).toBe(false);
  });

  it('todas resolvidas: sem próxima e concluído (pulada e perdida também resolvem)', () => {
    const resumo = resumirDia([
      dose('Losartana', '08:00', 'tomada'),
      dose('Vitamina D', '14:00', 'pulada'),
      dose('Metformina', '20:00', 'perdida'),
    ]);
    expect(resumo.proxima).toBeNull();
    expect(resumo.concluido).toBe(true);
    expect(resumo.tomadas).toBe(1);
  });

  it('em empate de horário, a próxima é a primeira na ordem da lista', () => {
    const resumo = resumirDia([dose('B', '08:00', 'pendente'), dose('A', '08:00', 'pendente')]);
    expect(resumo.proxima?.nome).toBe('B');
  });

  it('dose aguardando resposta conta como próxima, mesmo com horário passado', () => {
    const resumo = resumirDia([dose('A', '08:00', 'aguardando'), dose('B', '20:00', 'pendente')]);
    expect(resumo.proxima?.nome).toBe('A');
  });
});

describe('agruparPorPeriodo', () => {
  it('separa manhã, tarde, noite e "se necessário" nessa ordem', () => {
    const secoes = agruparPorPeriodo([
      dose('Noite', '20:00', 'pendente'),
      dose('Manha', '08:00', 'tomada'),
      seNecessario,
      dose('Tarde', '14:00', 'pendente'),
    ]);
    expect(secoes.map((s) => s.titulo)).toEqual(['Manhã', 'Tarde', 'Noite', 'Se necessário']);
    expect(secoes.map((s) => s.itens.map((i) => i.nome))).toEqual([['Manha'], ['Tarde'], ['Noite'], ['Dipirona']]);
  });

  it('corta exatamente em 12:00 e 18:00', () => {
    const secoes = agruparPorPeriodo([
      dose('a', '11:59', 'pendente'),
      dose('b', '12:00', 'pendente'),
      dose('c', '17:59', 'pendente'),
      dose('d', '18:00', 'pendente'),
    ]);
    expect(secoes.map((s) => [s.chave, s.itens.map((i) => i.nome)])).toEqual([
      ['manha', ['a']],
      ['tarde', ['b', 'c']],
      ['noite', ['d']],
    ]);
  });

  it('omite seções vazias', () => {
    const secoes = agruparPorPeriodo([dose('a', '08:00', 'pendente'), dose('b', '09:00', 'pendente')]);
    expect(secoes.map((s) => s.chave)).toEqual(['manha']);
  });

  it('mantém a ordem por horário dentro da seção', () => {
    const secoes = agruparPorPeriodo([dose('tarde2', '16:00', 'pendente'), dose('tarde1', '13:00', 'pendente')]);
    expect(secoes[0].itens.map((i) => i.nome)).toEqual(['tarde1', 'tarde2']);
  });
});
