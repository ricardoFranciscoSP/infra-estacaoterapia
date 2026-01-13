import { ConsultaApi, ConsultasAgendadasResponse } from '@/types/consultasTypes';
import { extrairConsultasFuturas } from '@/utils/consultaUtils';

/**
 * Extrai todas as consultas agendadas como um array de ConsultaApi
 * Trata diferentes formatos de entrada (array, objeto Futuras, ConsultasAgendadasResponse)
 */
export function extrairConsultasArray(
    consultasAgendadas: unknown
): ConsultaApi[] {
    if (!consultasAgendadas) {
        return [];
    }

    // Se já é um array de ConsultaApi, retorna diretamente
    if (Array.isArray(consultasAgendadas)) {
        // Verifica se é array de ConsultaApi ou array de Futuras
        if (consultasAgendadas.length > 0 && 'Id' in consultasAgendadas[0] && 'Date' in consultasAgendadas[0]) {
            return consultasAgendadas as ConsultaApi[];
        }
        // Se é array de Futuras, extrai usando a função existente
        return extrairConsultasFuturas(consultasAgendadas) as unknown as ConsultaApi[];
    }

    // Se é um objeto ConsultasAgendadasResponse
    if (typeof consultasAgendadas === 'object' && consultasAgendadas !== null && 'success' in consultasAgendadas) {
        const response = consultasAgendadas as ConsultasAgendadasResponse;
        if (!response.success) {
            return [];
        }

        const consultas: ConsultaApi[] = [];
        const idsAdicionados = new Set<string>();

        // Adiciona nextReservation se existir
        if (response.nextReservation) {
            consultas.push(response.nextReservation);
            idsAdicionados.add(response.nextReservation.Id);
        }

        // Adiciona consultaAtual se existir e não for duplicata
        if (response.consultaAtual && !idsAdicionados.has(response.consultaAtual.Id)) {
            consultas.push(response.consultaAtual);
            idsAdicionados.add(response.consultaAtual.Id);
        }

        // Adiciona futuras excluindo duplicatas
        if (response.futuras && Array.isArray(response.futuras)) {
            response.futuras.forEach(consulta => {
                if (!idsAdicionados.has(consulta.Id)) {
                    consultas.push(consulta);
                    idsAdicionados.add(consulta.Id);
                }
            });
        }

        return consultas;
    }

    // Tenta usar a função extrairConsultasFuturas existente
    return extrairConsultasFuturas(consultasAgendadas) as unknown as ConsultaApi[];
}

