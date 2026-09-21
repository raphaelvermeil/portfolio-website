import { create } from 'zustand';

export interface MachineState {
  hovered: string | null;
  selected: string | null;
  filter: string | null;
  hasInteracted: boolean;
  setHovered(id: string | null): void;
  setSelected(id: string | null): void;
  toggleFilter(language: string): void;
  markInteracted(): void;
}

export const useStore = create<MachineState>((set) => ({
  hovered: null,
  selected: null,
  filter: null,
  hasInteracted: false,
  setHovered: (hovered) => set({ hovered }),
  setSelected: (selected) => set((s) => ({ selected, hasInteracted: s.hasInteracted || selected !== null })),
  toggleFilter: (language) => set((s) => ({ filter: s.filter === language ? null : language })),
  markInteracted: () => set({ hasInteracted: true }),
}));
