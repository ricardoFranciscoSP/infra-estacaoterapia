import { create } from 'zustand';
import { authService } from '@/services/authService';
import getSocket, { joinUserRoom } from '@/lib/socket';

type Role = 'Patient' | 'Psychologist' | 'Admin' | 'Management' | 'Finance';
export type Sexo = 'Masculino' | 'Feminino' | 'NaoBinario' | 'PrefiroNaoDeclarar';
export type UserStatus = 'Ativo' | 'Inativo' | 'Bloqueado' | 'Pendente' | 'Deletado' | 'EmAnalise';

interface Address {
    Id: string;
    Rua: string;
    Numero: string;
    Complemento?: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
}
interface Image {
    url: string;
}
interface PsychologistDocument {
    Id: string;
    Url: string;
    Type: string;
    Description?: string;
    CreatedAt: string;
    UpdatedAt: string;
}

interface ProfessionalProfile {
    PsychologistDocuments?: PsychologistDocument[];
}
interface Onboardings {
    Id: string;
    userId: string;
    Completed: boolean;
    Step: string[];
}

export interface PessoalJuridica {
    Id: string;
    CNPJ: string;
    PsicologoId: string;
    RazaoSocial: string;
    NomeFantasia?: string;
    InscricaoEstadual?: string;
    SimplesNacional?: boolean;
}

interface PlanoCompra {
    Id: string;
    Status: string;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface User {
    Id: string;
    Nome: string;
    Email: string;
    Cpf: string;
    Crp: string | null;
    GoogleId: string | null;
    Telefone: string;
    DataNascimento: string | null;
    Sexo: Sexo;
    TermsAccepted: boolean;
    PrivacyAccepted: boolean;
    Status: UserStatus;
    Role: Role;
    IsOnboard?: boolean;
    ResetPasswordToken: string | null;
    ResetPasswordExpires: string | null;
    CreatedAt: string;
    UpdatedAt: string;
    Address: Address[];
    Image: Image[];
    ProfessionalProfile: ProfessionalProfile[];
    Password: string;
    PlanoCompra: PlanoCompra[];
    Onboardings?: Onboardings[];
    Pronome?: string;
    PessoalJuridica?: PessoalJuridica;
}

// Novo tipo para registro, omitindo PlanoCompra
export type RegisterUserData = Omit<User, 'PlanoCompra'>;

// Adicionar interface para dados de registro
export type RegisterData =
    | FormData
    | RegisterUserData
    | {
        nome: string;
        email: string;
        password: string;
        confirmarSenha: string;
        telefone: string;
        cpf: string;
        aceitaTermos?: boolean;
        dataNascimento: string;
        role: "Patient" | "Psychologist";
        termsAccepted: boolean;
        privacyAccepted: boolean;
    };

interface AuthState {
    user: User | null;
    isLoading: boolean;
    socketConnected: boolean;
    notifications: string[];
    fetchUser: () => Promise<void>;
    logout: () => Promise<void>;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
    register: (data: RegisterData) => Promise<{ success: boolean; message?: string; user?: User }>;
    forgot: (email: string) => Promise<{ success: boolean; message?: string; user?: User }>;
    reset: (token: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
    setUser: (user: User | null) => void;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: false,
    socketConnected: false,
    notifications: [],

    setUser: async (user) => {
        set({ user });
        // Persiste apenas o id no localStorage (criptografado)
        if (typeof window !== "undefined") {
            try {
                const { encryptedLocalStorage } = await import("@/utils/encryptedStorage");
                if (user && user.Id) {
                    await encryptedLocalStorage.setObject("user-data-client", { id: user.Id }, true);
                } else {
                    encryptedLocalStorage.removeItem("user-data-client");
                }
            } catch (error) {
                console.error('[authStore] Erro ao salvar dados do usuário:', error);
            }
        }
    },

    fetchUser: async () => {
        set({ isLoading: true });
        try {
            let user = null;
            // Sempre busca os dados completos do backend para garantir que estão atualizados
            // O localStorage é usado apenas para persistência do ID, mas os dados sempre vêm do backend
            try {
                const apiResponse = await authService().getUser().then(res => res.data);
                if (apiResponse && typeof apiResponse === 'object' && 'user' in apiResponse) {
                    user = { ...apiResponse.user, Onboardings: apiResponse.Onboardings ?? [] };
                } else {
                    user = { ...apiResponse, Onboardings: apiResponse?.Onboardings ?? [] };
                }
            } catch {
                // Se falhar ao buscar do backend, tenta usar dados do localStorage como fallback
                if (typeof window !== "undefined") {
                    try {
                        const { encryptedLocalStorage } = await import("@/utils/encryptedStorage");
                        const parsed = await encryptedLocalStorage.getObject<{ id?: string; Id?: string; Nome?: string; Email?: string }>("user-data-client", true);
                        // Verifica se tem dados completos, não apenas o ID
                        if (parsed && (parsed.Id || parsed.id) && parsed.Nome && parsed.Email) {
                            user = parsed as typeof user;
                        }
                    } catch {
                        // Ignora erro de descriptografia
                    }
                }
            }
            set({ user, isLoading: false });

            if (user) {
                // NÃO conecta automaticamente - apenas prepara os listeners
                // A conexão será feita sob demanda quando houver eventos
                const instance = getSocket();
                if (instance) {
                    // Evita listeners duplicados
                    instance.off('connect');
                    instance.off('notification');

                    instance.on('connect', () => {
                        set({ socketConnected: true });
                        // Entra na sala do usuário apenas quando conectar
                        joinUserRoom(user.Id);
                    });

                    instance.on('notification', (msg: string) =>
                        set((state: AuthState) => ({ notifications: [...state.notifications, msg] }))
                    );
                }
            } else {
                // Remover listeners quando não houver usuário
                const instance = getSocket();
                instance?.off('connect');
                instance?.off('notification');

                set({ socketConnected: false, notifications: [] });
            }
        } catch {
            set({ user: null, isLoading: false, socketConnected: false, notifications: [] });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
            const { data } = await authService().login(email, password);

            if (!data.user) {
                set({ user: null, isLoading: false, socketConnected: false, notifications: [] });
                return { success: false, message: data.message || 'Credenciais inválidas' };
            }

            // Garante que Onboardings sempre exista como array
            const user = { ...data.user, Onboardings: data.user?.Onboardings ?? [] };
            set({ user, isLoading: false });

            // Configurar socket APENAS para listeners - NÃO conecta automaticamente
            try {
                const instance = getSocket();
                if (instance) {
                    instance.emit("register", user.Id);
                }
            } catch {
                // silencioso
            }

            // Salvar dados do usuário em cookie client-side (apenas para leitura rápida)
            // Os tokens de autenticação HttpOnly JÁ foram setados pelo backend via Set-Cookie
            if (typeof window !== "undefined") {
                try {
                    const { default: Cookies } = await import('js-cookie');
                    // Salva apenas campos essenciais no cookie client-side
                    const { id, nome, email } = user;
                    const minimalUser = { id, nome, email };
                    Cookies.set('user-data-client', JSON.stringify(minimalUser), {
                        expires: 7,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                    });
                    Cookies.set('auth', '1', {
                        expires: 7,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                    });
                    // Aguarda um ciclo para garantir que cookies do backend foram processados
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch {
                    // silencioso
                }
            }
            return { success: true, message: data.message, user };

        } catch (error: unknown) {
            set({ user: null, isLoading: false, socketConnected: false, notifications: [] });

            let message = 'Erro ao fazer login.';
            if ((error as ApiError)?.response?.data?.message) {
                message = (error as ApiError).response?.data?.message ?? 'Erro ao fazer login.';
            }

            return { success: false, message };
        }
    },

    register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
            const response = await authService().register(data);
            // Garante que Onboardings sempre exista como array
            set({ user: { ...response.data.user, Onboardings: response.data.user?.Onboardings ?? [] }, isLoading: false });
            return { success: true, message: response.data.message, user: { ...response.data.user, Onboardings: response.data.user?.Onboardings ?? [] } };
        } catch (error: unknown) {
            set({ user: null, isLoading: false });
            let message = 'Erro ao registrar.';
            if (error && typeof error === 'object' && 'response' in error) {
                const responseError = error as { response?: { data?: { message?: string } } };
                if (responseError.response?.data?.message) {
                    message = responseError.response.data.message;
                }
            }
            return { success: false, message };
        }
    },

    forgot: async (email: string) => {
        set({ isLoading: true });
        try {
            const { data } = await authService().forgot(email);
            set({ isLoading: false });
            return data;
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    reset: async (token: string, password: string) => {
        set({ isLoading: true });
        try {
            await authService().reset(token, password);
            set({ isLoading: false });
            return { success: true, message: "Senha redefinida com sucesso." };
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        try {
            await authService().logout();

            // Limpa dados do localStorage (criptografados)
            if (typeof window !== 'undefined') {
                try {
                    const { encryptedLocalStorage, clearEncryptionKeys } = await import("@/utils/encryptedStorage");
                    encryptedLocalStorage.removeItem('user-data-client');
                    clearEncryptionKeys(); // Limpa chaves de criptografia no logout
                } catch {
                    // Fallback para remoção direta
                    window.localStorage.removeItem('user-data-client');
                }
                const { default: Cookies } = await import('js-cookie');
                try {
                    Cookies.remove('user-data-client', { path: '/' });
                    Cookies.remove('onboarding-data-client', { path: '/' });
                    Cookies.remove('auth', { path: '/' });
                } catch {
                    // silencioso
                }

                // 3. Chama server action para limpar cookies do Next.js
                try {
                    const { clearAuthCookies } = await import('@/app/actions/auth');
                    await clearAuthCookies();
                } catch {
                    // silencioso
                }
            }

            // 4. Limpa socket e listeners
            const instance = getSocket();
            instance?.off('connect');
            instance?.off('notification');
            if (instance && typeof instance.disconnect === 'function') {
                instance.disconnect();
            }

            // 5. Reseta o estado local
            set({ user: null, notifications: [], socketConnected: false });

            // 6. Redireciona após logout baseado na rota atual
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                // Se estiver em rotas de admin, redireciona para /adm-login
                if (currentPath.startsWith('/adm-estacao') || currentPath.startsWith('/adm-finance')) {
                    window.location.href = "/adm-login";
                } else {
                    window.location.href = "/";
                }
            }
        } catch {
            // Mesmo com erro, limpa o estado local e redireciona
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('user-data-client');
                const currentPath = window.location.pathname;
                // Se estiver em rotas de admin, redireciona para /adm-login
                if (currentPath.startsWith('/adm-estacao') || currentPath.startsWith('/adm-finance')) {
                    window.location.href = "/adm-login";
                } else {
                    window.location.href = "/";
                }
            }
            set({ user: null, notifications: [], socketConnected: false });
        }
    },

}));