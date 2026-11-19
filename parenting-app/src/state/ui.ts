import { create } from 'zustand';

interface UiState {
  addSheetOpen: boolean;
  childSheetOpen: boolean;
  openAddSheet: () => void;
  closeAddSheet: () => void;
  openChildSheet: () => void;
  closeChildSheet: () => void;
}

export const useUi = create<UiState>((set) => ({
  addSheetOpen: false,
  childSheetOpen: false,
  openAddSheet: () => set({ addSheetOpen: true }),
  closeAddSheet: () => set({ addSheetOpen: false }),
  openChildSheet: () => set({ childSheetOpen: true }),
  closeChildSheet: () => set({ childSheetOpen: false }),
}));
