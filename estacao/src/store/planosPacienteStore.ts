import { create } from 'zustand';
import { pacientePlanoService, CancelarPlanoPayload, UpgradePlanoPayload, DowngradePlanoPayload } from '@/services/planoPacienteService';
import { useQuery } from '@tanstack/react-query';
import { Plano } from './planoStore';

const service = pacientePlanoService();
interface PlanoResponse {
    sucesso: boolean;
    plano?: Plano;
    mensagem?: string;
}

// Interface para erro da API
interface APIError {
    response?: {
        data?: {
            message?: string;
            error?: string;
            errors?: Array<{
                message?: string;
                parameter?: string;
            }>;
        } | string;
        status?: number;
        statusText?: string;
    };
    message?: string;
}


// Tipo para dados de erro da API
interface ErrorData {
    message?: string;
    error?: string;
    errors?: Array<{
        message?: string;
        parameter?: string;
    }>;
    [key: string]: unknown;
}

// Função auxiliar para extrair mensagem de erro de forma segura
function extractErrorMessage(apiError: APIError, defaultMessage: string): string {
    if (apiError?.response?.data) {
        const data = apiError.response.data;
        
        // Se for string, retorna diretamente
        if (typeof data === 'string') {
            return data;
        }
        
        // Se for objeto, tenta extrair mensagem de várias propriedades
        if (typeof data === 'object' && data !== null) {
            const errorData = data as ErrorData;
            
            // Tenta várias propriedades possíveis
            type ErrorDataWithMessage = ErrorData & { message?: string };
            const errorDataWithMessage = errorData as ErrorDataWithMessage;
            const message = errorDataWithMessage.message 
                || errorData.error 
                || errorData.errors?.[0]?.message;
            
            if (message) {
                return typeof message === 'string' ? message : String(message);
            }
        }
    }

    // Tenta pegar a mensagem do erro axios
    if (apiError?.message) {
        return apiError.message;
    }

    return defaultMessage;
}

interface PlanosPacienteState {
    loading: boolean;
    error: string | null;
    comprarPlano: (plano: Plano) => Promise<PlanoResponse>;
    cancelarPlano: (payload: CancelarPlanoPayload) => Promise<PlanoResponse>;
    upgradePlano: (payload: UpgradePlanoPayload) => Promise<void>;
    downgradePlano: (payload: DowngradePlanoPayload) => Promise<void>;
    getPlanos: () => Promise<Plano[]>;
    getPlanosId: (id: string) => Promise<Plano>;
}


export const usePlanosPacienteStore = create<PlanosPacienteState>((set) => ({
    loading: false,
    error: null,

    comprarPlano: async (plano) => {
        set({ loading: true, error: null });
        try {
            const response = await service.comprarPlano(plano);
            const responseData = response.data as PlanoResponse;
            return responseData;
        } catch (err: unknown) {
            const apiError = err as APIError;

            // Tenta extrair mensagem de erro de várias possíveis estruturas
            let errorMsg = 'Erro ao comprar plano';

            if (err instanceof Error) {
                errorMsg = err.message;
            } else {
                errorMsg = extractErrorMessage(apiError, 'Erro ao comprar plano');
            }

            // Log mais detalhado do erro
            console.error('Erro ao comprar plano:', {
                error: err,
                errorString: String(err),
                errorMessage: err instanceof Error ? err.message : undefined,
                apiError: apiError?.response?.data,
                apiErrorString: apiError?.response?.data ? JSON.stringify(apiError.response.data) : undefined,
                status: apiError?.response?.status,
                statusText: apiError?.response?.statusText,
                extractedMessage: errorMsg,
                fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            });

            set({ error: errorMsg });
            throw new Error(errorMsg);
        } finally {
            set({ loading: false });
        }
    },

    cancelarPlano: async (payload) => {
        set({ loading: true, error: null });
        try {
            const response = await service.cancelarPlano(payload);
            return response.data as PlanoResponse;
        } catch (err: unknown) {
            const apiError = err as APIError;
            const errorMsg = err instanceof Error ? err.message : extractErrorMessage(apiError, 'Erro ao cancelar plano');
            set({ error: errorMsg });
            throw err;
        } finally {
            set({ loading: false });
        }
    },

    upgradePlano: async (payload) => {
        set({ loading: true, error: null });
        try {
            await service.upgradePlano(payload);
        } catch (err: unknown) {
            const apiError = err as APIError;
            const errorMsg = err instanceof Error ? err.message : extractErrorMessage(apiError, 'Erro ao fazer upgrade do plano');
            set({ error: errorMsg });
        } finally {
            set({ loading: false });
        }
    },

    downgradePlano: async (payload) => {
        set({ loading: true, error: null });
        try {
            await service.downgradePlano(payload);
        } catch (err: unknown) {
            const apiError = err as APIError;
            const errorMsg = err instanceof Error ? err.message : extractErrorMessage(apiError, 'Erro ao fazer downgrade do plano');
            set({ error: errorMsg });
            throw err;
        } finally {
            set({ loading: false });
        }
    },

    getPlanos: async (): Promise<Plano[]> => {
        set({ loading: true, error: null });
        try {
            const response = await service.getPlanos();
            const planosData = response.data as Plano[];
            return planosData;
        } catch (err: unknown) {
            const apiError = err as APIError;
            const errorMsg = err instanceof Error ? err.message : extractErrorMessage(apiError, 'Erro ao buscar planos do paciente');
            set({ error: errorMsg });
            throw err;
        } finally {
            set({ loading: false });
        }
    },

    getPlanosId: async (id: string): Promise<Plano> => {
        set({ loading: true, error: null });
        try {
            const response = await service.getPlanosId(id);
            const planoData = response.data as Plano;
            return planoData;
        } catch (err: unknown) {
            const apiError = err as APIError;
            const errorMsg = err instanceof Error ? err.message : extractErrorMessage(apiError, 'Erro ao buscar planos do paciente');
            set({ error: errorMsg });
            throw err;
        } finally {
            set({ loading: false });
        }
    },
}));

// Função auxiliar para normalizar a descrição
function normalizarDescricao(descricao: unknown): string[] {
    if (!descricao) return [];

    // Se já é um array de strings, retorna diretamente
    if (Array.isArray(descricao)) {
        // Verifica se é array de objetos com propriedade 'descricao'
        if (descricao.length > 0 && typeof descricao[0] === 'object' && 'descricao' in descricao[0]) {
            return descricao.map((d: { descricao: string }) => d.descricao);
        }
        // Se é array de strings, retorna
        return descricao.filter((d: unknown): d is string => typeof d === 'string');
    }

    // Se é string, tenta parsear como JSON
    if (typeof descricao === 'string') {
        try {
            const parsed = JSON.parse(descricao);
            if (Array.isArray(parsed)) {
                return parsed.filter((d: unknown): d is string => typeof d === 'string');
            }
            return [parsed];
        } catch {
            // Se não for JSON válido, trata como string única
            return [descricao];
        }
    }

    // Se é objeto, tenta extrair valores
    if (typeof descricao === 'object') {
        const values = Object.values(descricao);
        return values.filter((v: unknown): v is string => typeof v === 'string');
    }

    return [];
}

// Hook customizado para buscar planos do paciente usando React Query
export function usePlanosPacienteQuery() {
    const service = pacientePlanoService();
    return useQuery<Plano[], Error>({
        queryKey: ['planos-paciente'],
        queryFn: async () => {
            const response = await service.getPlanos();
            const planos = response.data as Plano[];
            // Normaliza os dados para garantir que Descricao esteja no formato correto
            // Define um tipo auxiliar para lidar com possíveis variações de campos vindos do backend
            type PlanoPossivelmenteInconsistente = Plano & {
                descricao?: unknown;
                descricoes?: unknown;
                Descricoes?: unknown;
            };

            return Array.isArray(planos)
                ? planos.map((planoOriginal): Plano => {
                    const plano = planoOriginal as PlanoPossivelmenteInconsistente;
                    return {
                        ...plano,
                        Descricao: normalizarDescricao(
                            plano.Descricao ?? plano.descricao ?? plano.Descricoes ?? plano.descricoes
                        ),
                    };
                })
                : [];
        },
    });
}

