import { create } from 'zustand';

import type { PreviaCadastro } from '@/domain/medication-registration/previa';
import type { DadosFormularioMedicamento } from '@/domain/medication-registration/types';

/**
 * Cadastro em andamento entre o formulário e "Confira antes de salvar"
 * (register-ongoing-medication, design.md decisão 6): em memória, para não
 * serializar datas e listas na URL. Nada aqui é gravado no banco.
 */
interface CadastroState {
  dados: DadosFormularioMedicamento | null;
  previa: PreviaCadastro | null;
  definir: (dados: DadosFormularioMedicamento, previa: PreviaCadastro) => void;
  limpar: () => void;
}

export const useCadastroStore = create<CadastroState>((set) => ({
  dados: null,
  previa: null,
  definir: (dados, previa) => set({ dados, previa }),
  limpar: () => set({ dados: null, previa: null }),
}));
