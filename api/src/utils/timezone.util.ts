/**
 * Utilitários centralizados para timezone de Brasília
 * TODOS os jobs e operações do Redis devem usar estas funções
 * para garantir consistência de horário em todo o sistema
 */

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Timezone padrão do sistema: Brasília (America/Sao_Paulo)
 */
export const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Obtém a data/hora atual em Brasília
 * @returns dayjs.Dayjs - Data/hora atual no timezone de Brasília
 */
export function nowBrasilia(): dayjs.Dayjs {
    return dayjs().tz(BRASILIA_TIMEZONE);
}

/**
 * Obtém a data/hora atual em Brasília como Date
 * @returns Date - Data/hora atual no timezone de Brasília
 */
export function nowBrasiliaDate(): Date {
    return nowBrasilia().toDate();
}

/**
 * Obtém o timestamp atual em Brasília (milissegundos)
 * @returns number - Timestamp atual no timezone de Brasília
 */
export function nowBrasiliaTimestamp(): number {
    return nowBrasilia().valueOf();
}

/**
 * Converte uma data para o timezone de Brasília
 * @param date - Data a ser convertida (string, Date ou dayjs.Dayjs)
 * @returns dayjs.Dayjs - Data no timezone de Brasília
 * 
 * IMPORTANTE: Se for string no formato 'YYYY-MM-DD HH:mm:ss' (ex: '2026-01-05 15:40:00'),
 * especifica o formato explicitamente para suportar horários "quebrados"
 */
export function toBrasilia(date: string | Date | dayjs.Dayjs): dayjs.Dayjs {
    if (dayjs.isDayjs(date)) {
        return date.tz(BRASILIA_TIMEZONE);
    }
    
    // Se for string, tenta detectar se está no formato 'YYYY-MM-DD HH:mm:ss'
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
        // Formato 'YYYY-MM-DD HH:mm:ss' - especifica explicitamente para suportar horários "quebrados"
        return dayjs.tz(date, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
    }
    
    return dayjs.tz(date, BRASILIA_TIMEZONE);
}

/**
 * Cria uma data/hora no timezone de Brasília a partir de string
 * @param dateTimeStr - String no formato 'YYYY-MM-DD HH:mm:ss' ou 'YYYY-MM-DD HH:mm'
 * @returns dayjs.Dayjs - Data/hora no timezone de Brasília
 */
export function createBrasiliaDateTime(dateTimeStr: string): dayjs.Dayjs {
    return dayjs.tz(dateTimeStr, BRASILIA_TIMEZONE);
}

/**
 * Formata uma data/hora para string ISO no timezone de Brasília
 * @param date - Data a ser formatada (opcional, usa agora se não fornecido)
 * @returns string - Data/hora formatada em ISO string
 */
export function toBrasiliaISO(date?: string | Date | dayjs.Dayjs): string {
    if (date) {
        return toBrasilia(date).toISOString();
    }
    return nowBrasilia().toISOString();
}

/**
 * Calcula o delay em milissegundos até uma data/hora futura em Brasília
 * @param targetDateTime - Data/hora alvo (string, Date ou dayjs.Dayjs)
 * @returns number - Delay em milissegundos (0 se já passou)
 */
export function calculateDelayBrasilia(targetDateTime: string | Date | dayjs.Dayjs): number {
    const target = toBrasilia(targetDateTime);
    const now = nowBrasilia();
    return Math.max(0, target.valueOf() - now.valueOf());
}

/**
 * Obtém a data atual em Brasília no formato YYYY-MM-DD
 * @returns string - Data atual no formato YYYY-MM-DD
 */
export function todayBrasilia(): string {
    return nowBrasilia().format('YYYY-MM-DD');
}

/**
 * Obtém a hora atual em Brasília no formato HH:mm
 * @returns string - Hora atual no formato HH:mm
 */
export function timeBrasilia(): string {
    return nowBrasilia().format('HH:mm');
}

