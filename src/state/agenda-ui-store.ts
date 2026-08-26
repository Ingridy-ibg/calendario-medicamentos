import { create } from 'zustand';

interface AgendaUiState {
  /** Data (yyyy-MM-dd) que o calendário mensal está exibindo no momento. */
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export function todayAsIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAgendaUiStore = create<AgendaUiState>((set) => ({
  selectedDate: todayAsIsoDate(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
