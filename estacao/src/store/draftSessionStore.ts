import { create } from 'zustand';

interface DraftSessionState {
    draftId: string | null;
    psychologistId: string | null;
    date: string | null;
    setDraftSession: (draftId: string, psychologistId: string, date: string) => void;
    clearDraftSession: () => void;
}

export const useDraftSessionStore = create<DraftSessionState>((set) => ({
    draftId: null,
    psychologistId: null,
    date: null,
    setDraftSession: (draftId, psychologistId, date) => set({ draftId, psychologistId, date }),
    clearDraftSession: () => set({ draftId: null, psychologistId: null, date: null }),
}));
