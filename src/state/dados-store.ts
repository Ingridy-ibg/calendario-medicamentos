import { create } from 'zustand';

interface DadosState {
  /**
   * Muda sempre que os dados mudam fora da tela que os mostra — hoje, uma
   * resposta de notificação aplicada com o app aberto. As telas que leem do
   * banco o colocam nas dependências do `recarregar` para refletir a mudança
   * sem trocar de tela (fix-permissoes-e-respostas).
   */
  versaoDados: number;
  avisarDadosMudaram: () => void;
}

export const useDadosStore = create<DadosState>((set) => ({
  versaoDados: 0,
  avisarDadosMudaram: () => set((estado) => ({ versaoDados: estado.versaoDados + 1 })),
}));
