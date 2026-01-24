import { create } from 'zustand';
import { psicologoService } from '@/services/psicologo';
import { PsicologoStoreState, PsicologoStoreActions, PsicologoAtivo, Psicologo } from '@/types/psicologoTypes';


export const usePsicologoStore = create<PsicologoStoreState & PsicologoStoreActions>((set) => ({
    Psicologos: null, // PsicologoAtivo[] | null
    Psicologo: null, // Psicologo | null
    PsicologoSelecionado: null, // Psicologo | null
    SetPsicologos: (psicologos: PsicologoAtivo[] | null) => set({ Psicologos: psicologos }),
    SetPsicologoSelecionado: (psicologo: PsicologoAtivo | null) => set({ PsicologoSelecionado: psicologo }),
    SetVerPsicologos: (psicologos: PsicologoAtivo[] | null) => set({ Psicologos: psicologos }),
    SetPsicologo: (psicologo: Psicologo | null) => set({ Psicologo: psicologo }),
}));

// Funções para buscar psicólogos usando o service
export const fetchPsicologos = async () => {
    try {
        const response = await psicologoService().getPsicologo();
        usePsicologoStore.getState().SetPsicologos(response.data as PsicologoAtivo[]);
    } catch (error) {
        console.error('Erro ao buscar psicólogos:', error);
    }
};

export const fetchPsicologoById = async (id: string): Promise<void> => {
    if (!id || id.trim() === '') {
        throw new Error('ID do psicólogo é obrigatório');
    }
    try {
        const response = await psicologoService().getPsicologoId(id);
        usePsicologoStore.getState().SetPsicologo(response.data);
    } catch (error) {
        console.error('Erro ao buscar psicólogo por ID:', error);
        throw error;
    }
};

interface PsicologoFilterParams {
    queixas?: string[];
    abordagens?: string[];
    sexo?: 'feminino' | 'masculino' | 'outros' | null;
    atendimentos?: string[];
    idiomas?: string[];
    dataInicio?: string | null;
    dataFim?: string | null;
    periodo?: string;
    nome?: string;
}

export const fetchPsicologoByFilter = async (filtros: PsicologoFilterParams): Promise<void> => {
    try {
        // Monta query string com todos os filtros
        const params = new URLSearchParams();
        const keyMap: Record<string, string> = {
            atendimentos: "atende",
            idiomas: "languages",
            dataInicio: "dataInicio",
            dataFim: "dataFim",
        };
        Object.entries(filtros).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                return; // Ignora valores vazios
            }
            const paramKey = keyMap[key] ?? key;
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    value.forEach(v => params.append(paramKey, String(v)));
                }
            } else {
                params.append(paramKey, String(value));
            }
        });
        const response = await psicologoService().getPsicologoByFilter(params.toString());
        const data = response.data as PsicologoAtivo[];
        usePsicologoStore.getState().SetPsicologos(data);
    } catch (error) {
        console.error('Erro ao buscar psicólogos por filtro:', error);
        usePsicologoStore.getState().SetPsicologos([]);
    }
};

export const verPsicologos = async (): Promise<PsicologoAtivo[] | undefined> => {
    try {
        const response = await psicologoService().getPsicologoAtivos();
        const data: PsicologoAtivo[] = response.data;
        usePsicologoStore.getState().SetVerPsicologos(data);
        return data;
    } catch (error) {
        console.error('Erro ao buscar psicólogos ativos:', error);
    }
};
