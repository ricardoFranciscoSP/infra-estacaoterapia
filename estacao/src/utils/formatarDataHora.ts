import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const INVALID_DATE_PLACEHOLDER = "--/--/----";
const INVALID_TIME_PLACEHOLDER = "--:--";

const isInvalidDateString = (value?: string) =>
    !value || value.toLowerCase().includes("invalid");

const isValidTimeString = (value?: string) => {
    if (!value) return false;
    const parts = value.split(":");
    if (parts.length < 2 || parts.length > 3) return false;
    const [hh, mm, ss = "0"] = parts;
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);
    if ([hour, minute, second].some(Number.isNaN)) return false;
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;
    if (second < 0 || second > 59) return false;
    return true;
};

export function formatarDataHora(data?: string, hora?: string) {
    if (!data || !hora) return `${INVALID_DATE_PLACEHOLDER} às ${INVALID_TIME_PLACEHOLDER}`;
    if (isInvalidDateString(data) || isInvalidDateString(hora)) {
        return `${INVALID_DATE_PLACEHOLDER} às ${INVALID_TIME_PLACEHOLDER}`;
    }
    if (!isValidTimeString(hora)) {
        return `${INVALID_DATE_PLACEHOLDER} às ${INVALID_TIME_PLACEHOLDER}`;
    }
    try {
        // Extrai apenas a parte yyyy-mm-dd se vier como ISO string
        const dateOnly = data.split('T')[0].split(' ')[0];
        
        // Usa dayjs com timezone de Brasília para garantir formatação correta
        const d = dayjs.tz(dateOnly, 'America/Sao_Paulo');
        
        if (!d.isValid()) return `${INVALID_DATE_PLACEHOLDER} às ${INVALID_TIME_PLACEHOLDER}`;
        
        const dia = String(d.date()).padStart(2, '0');
        const mes = String(d.month() + 1).padStart(2, '0');
        const ano = d.year();
        return `${dia}/${mes}/${ano} às ${hora}`;
    } catch {
        return `${INVALID_DATE_PLACEHOLDER} às ${INVALID_TIME_PLACEHOLDER}`;
    }
}

export const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '';
    if (isInvalidDateString(dateStr)) return INVALID_DATE_PLACEHOLDER;
    
    // Suporta ISO (yyyy-MM-ddTHH:mm:ss.sssZ), yyyy-MM-dd e "yyyy-MM-dd HH:mm:ss"
    const datePart = dateStr.includes('T')
        ? dateStr.split('T')[0]
        : dateStr.split(' ')[0];
    
    const isDateLike = /^\d{4}-\d{2}-\d{2}$/.test(datePart);
    if (!isDateLike) {
        const parsed = dayjs(dateStr);
        return parsed.isValid() ? parsed.format('DD/MM/YYYY') : INVALID_DATE_PLACEHOLDER;
    }
    
    const parsed = dayjs(datePart);
    if (!parsed.isValid()) return INVALID_DATE_PLACEHOLDER;
    return parsed.format('DD/MM/YYYY');
};

export const formatTimeBR = (timeStr?: string) => {
    if (!timeStr) return INVALID_TIME_PLACEHOLDER;
    if (isInvalidDateString(timeStr)) return INVALID_TIME_PLACEHOLDER;
    return isValidTimeString(timeStr) ? timeStr : INVALID_TIME_PLACEHOLDER;
};

export function traduzirPerfil(codigo: string): string {
    switch (codigo) {
        case 'admin':
            return 'Administrador';
        case 'Patient':
            return 'Paciente';
        case 'Psychologist':
            return 'Psicólogo';
        case 'Management':
            return 'Gestão';
        default:
            return 'Desconhecido';
    }
}


