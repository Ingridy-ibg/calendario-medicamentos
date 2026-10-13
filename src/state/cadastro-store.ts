import { create } from 'zustand';

import type { PreviaCadastro } from '@/domain/medication-registration/previa';
import type { DadosFormularioMedicamento } from '@/domain/medication-registration/types';

/**
 * Cadastro: novo medicamento. Volta à agenda: medicamento fora da agenda que
 * volta como se fosse cadastrado agora (agenda-membership, decisão 4).
 */
export type ModoConfirmacao = { tipo: 'cadastro' } | { tipo: 'volta_agenda'; medicamentoId: string };

/**
 * Cadastro em andamento entre o formulário e "Confira antes de salvar"
 * (register-ongoing-medication, design.md decisão 6): em memória, para não
 * serializar datas e listas na URL. Nada aqui é gravado no banco.
 */
interface CadastroState {
  dados: DadosFormularioMedicamento | null;
  previa: PreviaCadastro | null;
  modo: ModoConfirmacao;
  definir: (dados: DadosFormularioMedicamento, previa: PreviaCadastro, modo?: ModoConfirmacao) => void;
  limpar: () => void;
}

export const useCadastroStore = create<CadastroState>((set) => ({
  dados: null,
  previa: null,
  modo: { tipo: 'cadastro' },
  definir: (dados, previa, modo) => set((estado) => ({ dados, previa, modo: modo ?? estado.modo })),
  limpar: () => set({ dados: null, previa: null, modo: { tipo: 'cadastro' } }),
}));
