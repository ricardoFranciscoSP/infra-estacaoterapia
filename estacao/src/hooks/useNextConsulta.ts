import { useEffect, useState } from 'react';
import { Futuras } from '@/types/consultasTypes';
import { extractNextConsulta, NextConsulta } from '@/utils/painelUtils';
import { joinUserRoom, onProximaConsultaAtualizada, offProximaConsultaAtualizada } from '@/lib/socket';
import { toast } from '@/components/CustomToastProvider';

interface UseNextConsultaProps {
    consultasFuturas: Futuras | undefined;
    userId: string | undefined;
    refetch: () => void;
}

interface UseNextConsultaReturn {
    nextConsulta: NextConsulta;
}

/**
 * Hook customizado para gerenciar a próxima consulta
 * - Extrai a próxima consulta dos dados de consultas futuras
 * - Conecta ao socket para receber atualizações em tempo real
 */
export function useNextConsulta({ 
    consultasFuturas, 
    userId, 
    refetch 
}: UseNextConsultaProps): UseNextConsultaReturn {
    const [nextConsulta, setNextConsulta] = useState<NextConsulta>(null);

    // Extrai a próxima consulta dos dados
    useEffect(() => {
        const extracted = extractNextConsulta(consultasFuturas);
        setNextConsulta(extracted);
    }, [consultasFuturas]);

    // Conecta ao socket e escuta atualizações
    useEffect(() => {
        if (!userId) return;

        joinUserRoom(userId);

        const handler = (data: { 
            consulta: NextConsulta; 
            motivo?: string 
        }) => {
            setNextConsulta(data.consulta ?? null);
            
            if (data?.motivo) {
                toast.success(`Atualização: ${data.motivo}`);
            } else {
                toast.success('Sua próxima consulta foi atualizada.');
            }
            
            refetch();
        };

        onProximaConsultaAtualizada(handler);
        
        return () => offProximaConsultaAtualizada();
    }, [userId, refetch]);

    return { nextConsulta };
}









