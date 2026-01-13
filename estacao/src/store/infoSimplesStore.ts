import { AxiosError } from "axios";
import { create } from "zustand";
import { infoSimplesService, InfoSimplesApiResponse, InfoSimplesNomePayload } from "@/services/infoSimples";

export interface InfoSimplesState {
    resultado: Record<string, unknown> | null;
    header: Record<string, unknown> | null;
    situacao: string | null;
    loading: boolean;
    error: string | null;
    lastPayload: InfoSimplesNomePayload | null;
}

export interface InfoSimplesActions {
    consultarPorNome: (
        payload: InfoSimplesNomePayload
    ) => Promise<InfoSimplesApiResponse & { situacao: string | null }>;
    reset: () => void;
}

const candidateSituacaoPaths: Array<string | string[]> = [
    "situacao",
    "Situacao",
    "situacao_cadastro",
    "situacaoCadastro",
    ["cadastro", "situacao"],
    ["Cadastro", "situacao"],
    ["resultado", "situacao"],
    ["result", "situacao"],
    ["data", "situacao"],
    "status",
    "Status",
];

const normalizeSituacao = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim().toUpperCase();
    }
    return null;
};

const readPath = (source: unknown, path: string | string[]): unknown => {
    const parts = Array.isArray(path) ? path : [path];
    return parts.reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, source);
};

export const extractSituacaoFromInfoSimples = (data: unknown): string | null => {
    for (const path of candidateSituacaoPaths) {
        const value = readPath(data, path);
        const normalized = normalizeSituacao(value);
        if (normalized) return normalized;
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const nested = extractSituacaoFromInfoSimples(item);
            if (nested) return nested;
        }
    }

    if (data && typeof data === "object") {
        for (const value of Object.values(data as Record<string, unknown>)) {
            const nested = extractSituacaoFromInfoSimples(value);
            if (nested) return nested;
        }
    }

    return null;
};

export const useInfoSimplesStore = create<InfoSimplesState & InfoSimplesActions>((set) => ({
    resultado: null,
    header: null,
    situacao: null,
    loading: false,
    error: null,
    lastPayload: null,

    consultarPorNome: async (payload: InfoSimplesNomePayload) => {
        set({ loading: true, error: null });
        try {
            const response = await infoSimplesService().consultarPorNome({
                ...payload,
                nome: payload.nome.trim(),
                uf: payload.uf.trim().toUpperCase(),
            });

            const apiData: InfoSimplesApiResponse = response.data;

            if (!apiData.success) {
                const message = apiData.error?.message || "Não foi possível consultar o cadastro no CFP.";
                set({ loading: false, error: message });
                throw new Error(message);
            }

            const situacao = extractSituacaoFromInfoSimples(apiData.data);

            set({
                resultado: apiData.data ?? null,
                header: apiData.header ?? null,
                situacao,
                lastPayload: payload,
                loading: false,
                error: null,
            });

            return { ...apiData, situacao };
        } catch (error) {
            const message =
                error instanceof AxiosError
                    ? (error.response?.data as { error?: string; message?: string })?.error || error.message
                    : error instanceof Error
                        ? error.message
                        : "Erro ao consultar cadastro na InfoSimples.";

            set({ error: message, loading: false });
            throw error;
        }
    },

    reset: () =>
        set({ resultado: null, header: null, situacao: null, loading: false, error: null, lastPayload: null }),
}));
