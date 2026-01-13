import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatarDataHora(data?: string, hora?: string) {
    if (!data || !hora) return "--/--/---- às --:--";
    
    try {
        // Extrai apenas a parte yyyy-mm-dd se vier como ISO string
        const dateOnly = data.split('T')[0].split(' ')[0];
        
        // Usa dayjs com timezone de Brasília para garantir formatação correta
        const d = dayjs.tz(dateOnly, 'America/Sao_Paulo');
        
        if (!d.isValid()) return "--/--/---- às --:--";
        
        const dia = String(d.date()).padStart(2, '0');
        const mes = String(d.month() + 1).padStart(2, '0');
        const ano = d.year();
        return `${dia}/${mes}/${ano} às ${hora}`;
    } catch {
        return "--/--/---- às --:--";
    }
}

export const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    // Suporta ISO (yyyy-MM-ddTHH:mm:ss.sssZ) e yyyy-MM-dd
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
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


