import { create } from "zustand";

interface MiniAppState {
  isInMiniApp: boolean;
  setIsInMiniApp: (isInMiniApp: boolean) => void;
}

export const useMiniAppStore = create<MiniAppState>((set) => ({
  isInMiniApp: false,
  setIsInMiniApp: (isInMiniApp) => set({ isInMiniApp }),
}));