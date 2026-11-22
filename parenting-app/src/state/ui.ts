import { create } from 'zustand';

interface UiState {
  addSheetOpen: boolean;
  childSheetOpen: boolean;
  /** "This needs an account": shown to a visitor who tried to change something. */
  accountPromptOpen: boolean;
  openAccountPrompt: () => void;
  closeAccountPrompt: () => void;
  openAddSheet: () => void;
  closeAddSheet: () => void;
  openChildSheet: () => void;
  closeChildSheet: () => void;
}

export const useUi = create<UiState>((set) => ({
  addSheetOpen: false,
  childSheetOpen: false,
  accountPromptOpen: false,
  openAccountPrompt: () => set({ accountPromptOpen: true }),
  closeAccountPrompt: () => set({ accountPromptOpen: false }),
  openAddSheet: () => set({ addSheetOpen: true }),
  closeAddSheet: () => set({ addSheetOpen: false }),
  openChildSheet: () => set({ childSheetOpen: true }),
  closeChildSheet: () => set({ childSheetOpen: false }),
}));
