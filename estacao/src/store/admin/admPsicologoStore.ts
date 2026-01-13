import { create } from 'zustand';
import { admPsicologoService } from '@/services/admPsicologoService';
import { Psicologo } from '@/types/psicologoTypes';

interface AdmPsicologoStoreState {
    psicologos: Psicologo[] | null;
    psicologoSelecionado: Psicologo | null;
}

interface AdmPsicologoStoreActions {
    setPsicologos: (psicologos: Psicologo[] | null) => void;
    setPsicologoSelecionado: (psicologo: Psicologo | null) => void;
    setVerPsicologos: (psicologos: Psicologo[] | null) => void;
}

export const useAdmPsicologoStore = create<AdmPsicologoStoreState & AdmPsicologoStoreActions>((set) => ({
    psicologos: null,
    psicologoSelecionado: null,
    setPsicologos: (psicologos: Psicologo[] | null) => set({ psicologos }),
    setPsicologoSelecionado: (psicologo: Psicologo | null) => set({ psicologoSelecionado: psicologo }),
    setVerPsicologos: (psicologos: Psicologo[] | null) => set({ psicologos }),
}));

//Funções para buscar psicólogos usando o service
export const getPsicologos = async () => {
    try {
        const response = await admPsicologoService().getPsicologos();
        console.debug("Psicólogos buscados:", response.data);
        useAdmPsicologoStore.getState().setPsicologos(response.data);
    } catch (error) {
        console.error('Erro ao buscar psicólogos:', error);
    }
};

// Função para buscar psicólogo por ID
export const getPsicologosId = async (id: string) => {
    try {
        const response = await admPsicologoService().getPsicologoById(id);
        useAdmPsicologoStore.getState().setPsicologoSelecionado(response.data);
    } catch (error) {
        console.error('Erro ao buscar psicólogo por ID:', error);
    }
};

// Função para atualizar psicólogo
export const updatePsicologo = async (id: string, update: Psicologo) => {
    try {
        const response = await admPsicologoService().updatePsicologo(id, update);
        // Atualiza o psicologoSelecionado se for o mesmo id
        if (useAdmPsicologoStore.getState().psicologoSelecionado?.Id === id) {
            useAdmPsicologoStore.getState().setPsicologoSelecionado(response.data);
        }
        // Atualiza a lista de psicologos se necessário
        const psicologos = useAdmPsicologoStore.getState().psicologos;
        if (psicologos) {
            const novos = psicologos.map((p: Psicologo) => p.Id === id ? response.data : p);
            useAdmPsicologoStore.getState().setPsicologos(novos);
        }
        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar psicólogo:', error);
        throw error;
    }
};

// Função para deletar psicólogo
export const deletePsicologo = async (id: string) => {
    try {
        await admPsicologoService().deletePsicologo(id);
        // Remove da lista de psicologos
        const psicologos = useAdmPsicologoStore.getState().psicologos;
        if (psicologos) {
            const novos = psicologos.filter((p: Psicologo) => p.Id !== id);
            useAdmPsicologoStore.getState().setPsicologos(novos);
        }
        // Limpa o selecionado se for o mesmo id
        if (useAdmPsicologoStore.getState().psicologoSelecionado?.Id === id) {
            useAdmPsicologoStore.getState().setPsicologoSelecionado(null);
        }
        return true;
    } catch (error) {
        console.error('Erro ao deletar psicólogo:', error);
        throw error;
    }
};

// Função para obter prévia do contrato do psicólogo
export const previaContrato = async (id: string) => {
    try {
        // Envia o id no body da requisição
        const response = await admPsicologoService().previaContrato(id);
        
        // Se response.data for uma string (HTML), retorna diretamente
        // Se for um objeto com propriedade html ou data, extrai
        const html = typeof response.data === 'string' 
            ? response.data 
            : (response.data?.html || response.data?.data || response.data);
        
        // Verifica se é HTML válido do contrato de parceria
        if (typeof html === 'string' && !html.includes('CONTRATO DE PARCERIA E INTERMEDIAÇÃO')) {
            console.warn('[Previa Contrato Store] ATENÇÃO: HTML recebido não parece ser do contrato de parceria');
            console.warn('[Previa Contrato Store] Primeiros 200 caracteres:', html.substring(0, 200));
        }
        
        return html;
    } catch (error) {
        console.error('Erro ao obter prévia do contrato:', error);
        throw error;
    }
};

// Função para gerar contrato do psicólogo
export const gerarContrato = async (id: string) => {
    try {
        // Envia o id no body da requisição
        const response = await admPsicologoService().gerarContrato(id);
        return response.data;
    } catch (error) {
        console.error('Erro ao gerar contrato:', error);
        throw error;
    }
};