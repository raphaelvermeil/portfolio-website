import { create } from 'zustand';

export interface MachineState {
  hovered: string | null;
  selected: string | null;
  hasInteracted: boolean;
  setHovered(id: string | null): void;
  setSelected(id: string | null): void;
  markInteracted(): void;
}

export const useStore = create<MachineState>((set) => ({
  hovered: null,
  selected: null,
  hasInteracted: false,
  setHovered: (hovered) => set({ hovered }),
  setSelected: (selected) => set((s) => ({ selected, hasInteracted: s.hasInteracted || selected !== null })),
  markInteracted: () => set({ hasInteracted: true }),
}));
