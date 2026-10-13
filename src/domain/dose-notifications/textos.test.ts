import { describe, expect, it } from 'vitest';

import { textosDaDose } from './textos';

const base = { nomeMedicamento: 'Anticoncepcional', dosagem: '1 comprimido', notificacoesSemResposta: 0, inicioDeCartela: false };

describe('textosDaDose', () => {
  it('início de cartela diz que é o 1º comprimido da nova cartela', () => {
    expect(textosDaDose({ ...base, criticidade: 'especial', inicioDeCartela: true })).toEqual({
      titulo: 'Nova cartela: Anticoncepcional',
      corpo: 'Hora de tomar o 1º comprimido da nova cartela',
    });
  });

  it('dose especial comum do ciclo mantém o título de alarme e a dosagem', () => {
    expect(textosDaDose({ ...base, criticidade: 'especial' })).toEqual({
      titulo: '⏰ Hora de tomar Anticoncepcional',
      corpo: '1 comprimido',
    });
  });

  it('reenvio de dose comum ganha "Lembrete:"', () => {
    expect(textosDaDose({ ...base, criticidade: 'comum', notificacoesSemResposta: 1 }).titulo).toBe(
      'Lembrete: Hora de tomar Anticoncepcional',
    );
  });
});
