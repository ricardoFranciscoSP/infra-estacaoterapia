// src/store/contatoStore.ts
import { create } from 'zustand';
import { ContatoPayload, contatoService } from '@/services/contatoService';

interface ContatoResponse {
    message?: string;
    error?: string;
}

interface ContatoState {
    loading: boolean;
    error: string;
    success: boolean;
    enviar: (payload: ContatoPayload) => Promise<void>;
}

export const useContatoStore = create<ContatoState>((set) => ({
    loading: false,
    error: '',
    success: false,
    enviar: async (payload: ContatoPayload) => {
        set({ loading: true, error: '', success: false });
        try {
            const response = await contatoService().enviarContato(payload);
            const data = response.data as ContatoResponse;
            if (response.status === 200) {
                const msg = data.message || 'Contato enviado com sucesso.';
                set({ loading: false, error: '', success: true });
                setTimeout(() => set({ success: false }), 1000);
                window.localStorage.setItem('contatoSuccessMsg', msg);
            } else {
                const errMsg = data.error || 'Erro ao enviar contato';
                set({ loading: false, error: errMsg, success: false });
                window.localStorage.setItem('contatoErrorMsg', errMsg);
            }
        } catch (err: unknown) {
            let errMsg = 'Erro ao enviar contato';
            if (
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: unknown }).response === 'object' &&
                (err as { response?: { data?: unknown } }).response !== null &&
                'data' in (err as { response: { data?: unknown } }).response
            ) {
                const data = (err as { response: { data?: { error?: string } } }).response.data;
                if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
                    errMsg = data.error;
                }
            }
            set({ loading: false, error: errMsg, success: false });
            window.localStorage.setItem('contatoErrorMsg', errMsg);
        }
    },
}));
