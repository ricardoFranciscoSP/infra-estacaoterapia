import { create } from 'zustand';
import { planoService, type PlanoAssinatura } from '@/services/planoService';

export interface Plano {
    Id: string;
    Nome: string;
    Descricao?: string[];
    Preco: number;
    Type: string;
    Status: string;
    Duracao: number;
    Destaque?: boolean;
    ProductId?: string;
    VindiPlanId?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
    Tipo?: string;
}

// Função auxiliar para normalizar a descrição
function normalizarDescricao(descricao: unknown): string[] {
    if (!descricao) return [];
    if (Array.isArray(descricao)) {
        // Se é array de objetos com campo descricao
        if (descricao.length > 0 && typeof descricao[0] === 'object' && 'descricao' in descricao[0]) {
            return descricao.map((d: { descricao: string }) => d.descricao);
        }
        // Se é array de strings
        return descricao;
    }
    if (typeof descricao === 'string') return [descricao];
    return [];
}

// Função auxiliar para normalizar um plano
function normalizarPlano(plano: Record<string, unknown> | PlanoAssinatura): Plano {
    const planoAny = plano as Record<string, unknown>;
    // Tenta pegar Descricao de várias formas possíveis
    const descricaoRaw = planoAny.Descricao || planoAny.descricao || planoAny.Descricoes || planoAny.descricoes;
    // Garante que todos os campos obrigatórios estejam presentes
    return {
        Id: String(planoAny.Id ?? ''),
        Nome: String(planoAny.Nome ?? ''),
        Preco: Number(planoAny.Preco ?? 0),
        Type: String(planoAny.Type ?? ''),
        Status: String(planoAny.Status ?? ''),
        Duracao: Number(planoAny.Duracao ?? 0),
        Descricao: normalizarDescricao(descricaoRaw),
        Destaque: planoAny.Destaque as boolean | undefined,
        ProductId: planoAny.ProductId as string | undefined,
        VindiPlanId: planoAny.VindiPlanId as string | undefined,
        CreatedAt: planoAny.CreatedAt as string | undefined,
        UpdatedAt: planoAny.UpdatedAt as string | undefined,
        Tipo: planoAny.Tipo as string | undefined,
    };
}

interface PlanoStore {
    planos: Plano[];
    setPlanos: (planos: Plano[]) => void;
    clearPlanos: () => void;
}

export const usePlanoStore = create<PlanoStore>((set) => ({
    planos: [],
    setPlanos: (planos) => set({ planos }),
    clearPlanos: () => set({ planos: [] }),
}));

export const fetchPlanoById = async (id: string) => {
    try {
        const response = await planoService().getPlanosId(id);
        const planoNormalizado = normalizarPlano(response.data);
        usePlanoStore.getState().setPlanos([planoNormalizado]);
        return planoNormalizado;
    } catch (error) {
        console.error('Failed to fetch plano by ID:', error);
        usePlanoStore.getState().clearPlanos();
    }
};

export const fetchPlanoPaciente = async () => {
    try {
        const response = await planoService().getPlanosPaciente();
        const planos = Array.isArray(response.data) ? response.data : ((response.data as { plano?: unknown[] })?.plano || []);
        const planosNormalizados = planos.map((p: unknown) => normalizarPlano(p as Record<string, unknown>));
        usePlanoStore.getState().setPlanos(planosNormalizados);
        return planosNormalizados;
    } catch (error) {
        console.error('Failed to fetch plano:', error);
        usePlanoStore.getState().clearPlanos();
        return [];
    }
};
export const fetchPlano = async () => {
    try {
        const response = await planoService().getPlanos();
        const planos = Array.isArray(response.data) ? response.data : ((response.data as { plano?: unknown[] })?.plano || []);
        const planosNormalizados = planos.map((p: unknown) => normalizarPlano(p as Record<string, unknown>));
        usePlanoStore.getState().setPlanos(planosNormalizados);
        return planosNormalizados;
    } catch (error) {
        console.error('Failed to fetch plano:', error);
        usePlanoStore.getState().clearPlanos();
        return [];
    }
};