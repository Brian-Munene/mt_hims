import { create } from "zustand";

interface UiStore {
  globalError: string | null;
  setGlobalError: (message: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  globalError: null,
  setGlobalError: (message) => set({ globalError: message }),
}));
