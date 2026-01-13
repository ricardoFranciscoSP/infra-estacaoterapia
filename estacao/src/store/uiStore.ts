import { create } from 'zustand'
interface UIStoreActions {
    setLoading: (value: boolean) => void;
}

interface UIStoreState {
    isLoading: boolean;
}

export const useUIStore = create<UIStoreState & UIStoreActions>((set) => ({
    isLoading: false,
    setLoading: (v: boolean) => set({ isLoading: v }),
}));
