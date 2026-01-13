import { create } from 'zustand';

export type Periodo = '' | 'manha' | 'tarde' | 'noite';

export interface PsicologoFilterState {
    queixas: string[];
    abordagens: string[];
    sexo: 'feminino' | 'masculino' | 'outros' | null;
    atendimentos: string[]; // ex: adultos, idosos, adolescentes
    idiomas: string[]; // ex: portugues, ingles, espanhol, libras
    data: string | null; // formato YYYY-MM-DD
    periodo: Periodo;
}

export interface PsicologoFilterActions {
    setQueixas: (vals: string[]) => void;
    setAbordagens: (vals: string[]) => void;
    setSexo: (val: 'feminino' | 'masculino' | 'outros' | null) => void;
    setAtendimentos: (vals: string[]) => void;
    setIdiomas: (vals: string[]) => void;
    setData: (val: string | null) => void;
    setPeriodo: (val: Periodo) => void;
    reset: () => void;
}

const initialState: PsicologoFilterState = {
    queixas: [],
    abordagens: [],
    sexo: null,
    atendimentos: [],
    idiomas: [],
    data: null,
    periodo: '',
};

export const usePsicologoFilterStore = create<PsicologoFilterState & PsicologoFilterActions>((set) => ({
    ...initialState,
    setQueixas: (vals) => set({ queixas: vals }),
    setAbordagens: (vals) => set({ abordagens: vals }),
    setSexo: (val) => set({ sexo: val }),
    setAtendimentos: (vals) => set({ atendimentos: vals }),
    setIdiomas: (vals) => set({ idiomas: vals }),
    setData: (val) => set({ data: val }),
    setPeriodo: (val) => set({ periodo: val }),
    reset: () => set({ ...initialState }),
}));
