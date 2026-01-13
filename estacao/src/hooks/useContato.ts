// src/hooks/useContato.ts
import { useContatoStore } from '@/store/contatoStore';
import { ContatoPayload } from '@/services/contatoService';

export function useContato() {
    const { loading, error, success, enviar } = useContatoStore();

    const enviarContato = async (payload: ContatoPayload) => {
        await enviar(payload);
    };

    return {
        loading,
        error,
        success,
        enviarContato,
    };
}
