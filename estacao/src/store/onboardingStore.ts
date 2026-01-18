// lib/store/onboardingStore.ts
import { create } from 'zustand';

interface OnboardingStore {
    step: number;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
    step: 0,
    nextStep: () => set((state) => ({ step: state.step + 1 })),
    prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
    reset: () => set({ step: 0 }),
}));
