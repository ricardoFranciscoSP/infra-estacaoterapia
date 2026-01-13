import { useState } from 'react';
import { api } from '@/lib/axios';
import { useQueryClient } from '@tanstack/react-query';

// Payload completo para cancelamento
export interface CancelamentoPayload {
    idconsulta: string;
    idPaciente: string;
    idPsicologo: string;
    motivo: string;
    protocolo: string;
    horario: string;
    data?: string;
    linkDock?: string;
    status?: string;
    tipo?: string;
    documento?: File | null;
}

export function useCancelamentoConsulta() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const queryClient = useQueryClient();

    const cancelarConsulta = async (payload: CancelamentoPayload) => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const formData = new FormData();
            formData.append('idconsulta', payload.idconsulta);
            formData.append('idPaciente', payload.idPaciente);
            formData.append('idPsicologo', payload.idPsicologo);
            formData.append('motivo', payload.motivo);
            formData.append('protocolo', payload.protocolo);
            formData.append('horario', payload.horario);
            if (payload.data) formData.append('data', payload.data);
            if (payload.linkDock) formData.append('linkDock', payload.linkDock);
            if (payload.status) formData.append('status', payload.status);
            if (payload.tipo) formData.append('tipo', payload.tipo);
            if (payload.documento) {
                formData.append('documento', payload.documento);
            }

            console.log('=== ENVIANDO CANCELAMENTO ===');
            console.log('FormData entries:');
            for (const pair of formData.entries()) {
                console.log(pair[0], ':', pair[1]);
            }

            // Não definir Content-Type manualmente - deixar o axios definir automaticamente
            // Timeout aumentado para 60 segundos devido à complexidade do processo de cancelamento
            const res = await api.post('/cancelamento', formData, {
                timeout: 60000, // 60 segundos
            });

            console.log('=== CANCELAMENTO SUCESSO ===', res.data);
            setSuccess(true);
            
            // Invalida e refaz busca do plano após cancelamento (pode ter creditado consulta)
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
                queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
                queryClient.invalidateQueries({ queryKey: ['creditoAvulso'] }),
                queryClient.refetchQueries({ queryKey: ['userPlano'] }),
            ]);
            
            return res.data;
        } catch (err: unknown) {
            console.error('=== ERRO NO CANCELAMENTO ===', err);
            let errorMsg = 'Erro ao cancelar consulta';
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const maybeErr = err as { response?: { data?: { message?: string; error?: string } } };
                errorMsg = maybeErr.response?.data?.message || maybeErr.response?.data?.error || errorMsg;
                console.error('Resposta do servidor:', maybeErr.response?.data);
            }
            setError(errorMsg);
            setSuccess(false);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { cancelarConsulta, loading, error, success };
}
