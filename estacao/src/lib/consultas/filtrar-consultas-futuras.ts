import { ConsultaApi } from '@/types/consultasTypes';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Filtra consultas futuras, excluindo uma consulta específica (usado para evitar duplicação)
 * 
 * @param consultas - Array de consultas agendadas
 * @param consultaExcluirId - ID da consulta a ser excluída (opcional)
 * @returns Array de consultas futuras válidas, excluindo a consulta especificada
 */
export function filtrarConsultasFuturas(
    consultas: ConsultaApi[] | null | undefined,
    consultaExcluirId?: string | null
): ConsultaApi[] {
    if (!consultas || consultas.length === 0) {
        return [];
    }

    const agora = dayjs().tz('America/Sao_Paulo');
    const dataAtualStr = agora.format('YYYY-MM-DD');
    const horaAtualStr = agora.format('HH:mm');

    // Status válidos para exibição
    const statusValidos = ['Reservado', 'Reservada', 'Andamento', 'Confirmada'];
    
    // Status que devem ser excluídos
    const statusExcluir = [
        'Cancelado', 
        'Concluido', 
        'Concluído',
        'cancelled_by_patient',
        'cancelled_by_psychologist',
        'cancelled_no_show',
        'Agendada', // Excluir status 'Agendada' conforme regra de negócio
        'agendada',
        'Agendado',
        'agendado'
    ];

    const consultasFuturas = consultas.filter((consulta) => {
        try {
            // Exclui a consulta especificada por ID
            if (consultaExcluirId && consulta.Id === consultaExcluirId) {
                return false;
            }

            // Verifica status
            const status = consulta.Status || consulta.ReservaSessao?.Status || '';
            const statusLower = status.toString().toLowerCase();

            // Exclui status inválidos
            if (statusExcluir.some(s => statusLower === s.toLowerCase())) {
                return false;
            }

            // Verifica se o status é válido
            if (!statusValidos.some(s => statusLower === s.toLowerCase())) {
                return false;
            }

            // Valida data e horário
            const dataConsulta = consulta.Date || consulta.Agenda?.Data;
            const horarioConsulta = consulta.Time || consulta.Agenda?.Horario;

            if (!dataConsulta || !horarioConsulta) {
                return false;
            }

            // Normaliza data: extrai apenas YYYY-MM-DD se vier como ISO string
            const dateOnly = dataConsulta.split('T')[0].split(' ')[0];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                return false;
            }

            // Converte para dayjs com timezone
            const dataConsultaDayjs = dayjs.tz(dateOnly, 'America/Sao_Paulo');
            if (!dataConsultaDayjs.isValid()) {
                return false;
            }

            const dataKey = dataConsultaDayjs.format('YYYY-MM-DD');

            // Exclui datas passadas
            if (dataKey < dataAtualStr) {
                return false;
            }

            // Se for o mesmo dia, verifica o horário
            if (dataKey === dataAtualStr) {
                return horarioConsulta.trim() >= horaAtualStr;
            }

            // Datas futuras são válidas
            return true;
        } catch (error) {
            console.error('Erro ao filtrar consulta:', error, consulta);
            return false;
        }
    });

    // Ordena por data e horário crescente
    return consultasFuturas.sort((a, b) => {
        const dataA = a.Date || a.Agenda?.Data || '';
        const horarioA = a.Time || a.Agenda?.Horario || '';
        const dataB = b.Date || b.Agenda?.Data || '';
        const horarioB = b.Time || b.Agenda?.Horario || '';

        // Compara datas
        if (dataA !== dataB) {
            return dataA.localeCompare(dataB);
        }

        // Se for a mesma data, ordena por horário
        return horarioA.localeCompare(horarioB);
    });
}

