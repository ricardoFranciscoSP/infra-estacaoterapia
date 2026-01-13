// store/userStore.ts
import { userService } from '@/services/useService';
import { fetchAddresses, createOrUpdateAddress } from '@/store/api/addressStore';
import type { AddressData } from '@/store/api/addressStore';
import { create } from 'zustand';
import Cookies from 'js-cookie';
import { Plano } from './planoStore';
import { setUserCookie, setOnboardingCookie, clearAuthCookies } from '@/app/actions/auth';

import type { User, Onboarding } from "@/types/userTypes";

interface UserStore {
    user: User | null;
    onboarding: Onboarding | null;
    setUser: (user: User | null) => void;
    setOnboarding: (onboarding: Onboarding | null) => void;
    logout: () => void;
    isLoading?: boolean;
    fetchUserAddresses: (userId: string) => Promise<Array<Record<string, unknown>>>;
    saveUserAddress: (data: AddressData) => Promise<Record<string, unknown>>;
}

// Configuração dos cookies client-side (não HTTP-only para leitura no client)
const COOKIE_OPTIONS = {
    expires: 7, // 7 dias
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

// Inicializa o store com dados dos cookies (se existirem)
const getUserFromCookie = (): User | null => {
    if (typeof window === 'undefined') return null;

    const userCookie = Cookies.get('user-data-client');
    if (!userCookie) return null;

    try {
        return JSON.parse(userCookie) as User;
    } catch {
        return null;
    }
};

const getOnboardingFromCookie = (): Onboarding | null => {
    if (typeof window === 'undefined') return null;

    const onboardingCookie = Cookies.get('onboarding-data-client');
    if (!onboardingCookie) return null;

    try {
        return JSON.parse(onboardingCookie) as Onboarding;
    } catch {
        return null;
    }
};

export const useUserStore = create<UserStore>((set, get) => ({
    user: getUserFromCookie(),
    onboarding: getOnboardingFromCookie(),

    setUser: (user: User | null) => {
        if (user) {
            // Salva apenas campos essenciais no cookie client-side
            const { id, name, email } = user;
            const minimalUser = { id, name, email };
            Cookies.set('user-data-client', JSON.stringify(minimalUser), COOKIE_OPTIONS);

            // Também salva no servidor via server action (HTTP-only)
            setUserCookie(user as never).catch(console.error);
        } else {
            Cookies.remove('user-data-client', { path: '/' });
        }
        set({ user });
    },
    fetchUserAddresses: async (userId: string) => {
        const addresses = await fetchAddresses(userId);
        // Atualiza o usuário no store se necessário
        const user = get().user;
        if (user && typeof user === 'object') {
            set({ user: { ...user, Address: addresses } });
        }
        return addresses;
    },

    saveUserAddress: async (data: AddressData) => {
        const address = await createOrUpdateAddress(data);
        // Atualiza o usuário no store se necessário
        const user = get().user;
        if (user && typeof user === 'object') {
            // Atualiza ou adiciona o endereço na lista Address
            const userWithAddress = user as { Address?: Array<Record<string, unknown>> };
            const addresses = Array.isArray(userWithAddress.Address) ? [...userWithAddress.Address] : [];
            const idx = addresses.findIndex((a: Record<string, unknown>) => a.type === data.type);
            if (idx >= 0) {
                addresses[idx] = address;
            } else {
                addresses.push(address);
            }
            set({ user: { ...user, Address: addresses } });
        }
        return address;
    },

    setOnboarding: (onboarding: Onboarding | null) => {
        if (onboarding) {
            Cookies.set('onboarding-data-client', JSON.stringify(onboarding), COOKIE_OPTIONS);
            setOnboardingCookie(onboarding).catch(console.error);
        } else {
            Cookies.remove('onboarding-data-client', { path: '/' });
        }
        set({ onboarding });
    },

    logout: () => {
        // Remove cookies client-side
        Cookies.remove('user-data-client', { path: '/' });
        Cookies.remove('onboarding-data-client', { path: '/' });

        // Remove cookies server-side (HTTP-only)
        clearAuthCookies().catch(console.error);

        set({ user: null, onboarding: null });
    },
}));

// Função de upload do contrato com tratamento de loading, sucesso e erro
export const uploadContratoStore = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await userService().uploadContrato(formData);
        // Atualize o usuário se necessário, exemplo:
        // useUserStore.setState({ user: response.data.user, isLoading: false });
        return {
            success: true,
            message: response.data?.message ?? 'Contrato enviado com sucesso.',
            user: response.data?.user,
        };
    } catch (error: unknown) {
        // useUserStore.setState({ isLoading: false });
        let message = 'Erro ao enviar contrato.';
        if (error && typeof error === 'object' && 'response' in error) {
            const responseError = error as { response?: { data?: { message?: string } } };
            if (responseError.response?.data?.message) {
                message = responseError.response.data.message;
            }
        }
        return { success: false, message };
    }
};

// Função para obter prévia do contrato do psicólogo
export const previaContrato = async (plano: Plano) => {
    try {
        // Envia o id no body da requisição
        const response = await userService().previaContrato(plano);
        return response.data;
    } catch (error) {
        console.error('Erro ao obter prévia do contrato:', error);
        throw error;
    }
};

// Função para gerar contrato do psicólogo
export const gerarContrato = async (plano: Plano, assinaturaBase64: string, ipNavegador: string) => {
    try {
        // Envia o id no body da requisição
        const response = await userService().gerarContrato(plano, assinaturaBase64, ipNavegador);
        return response.data;
    } catch (error) {
        console.error('Erro ao gerar contrato:', error);
        throw error;
    }
};
// Função para mostrar plano do usuário
export const getUserPlano = async () => {
    try {
        // Envia o id no body da requisição
        const response = await userService().getUserPlano();
        return response.data;
    } catch (error) {
        console.error('Erro ao mostrar plano do usuário:', error);
        throw error;
    }
};