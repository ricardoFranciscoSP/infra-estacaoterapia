// --- utils/date.ts ---
/**
 * Garante que qualquer valor de data (string, timestamp ou Date)
 * seja convertido para formato ISO 8601 UTC: "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
export function ensureISO8601Date(value: string | number | Date): string {
    if (!value) return "";

    // Se já está em ISO
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value;

    // Se vier como "YYYY-MM-DD"
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        return isNaN(date.valueOf()) ? "" : date.toISOString();
    }

    // Se vier como número (timestamp)
    if (typeof value === "number" && !isNaN(value)) {
        const date = new Date(value);
        return isNaN(date.valueOf()) ? "" : date.toISOString();
    }

    // Se vier como string numérica (ex: "-49064400000")
    if (typeof value === "string" && /^-?\d+$/.test(value)) {
        const num = Number(value);
        const date = new Date(num);
        return isNaN(date.valueOf()) ? "" : date.toISOString();
    }

    // Se vier como objeto Date
    if (value instanceof Date) {
        return isNaN(value.valueOf()) ? "" : value.toISOString();
    }

    // Tenta parse genérico
    const parsed = new Date(String(value));
    return isNaN(parsed.valueOf()) ? "" : parsed.toISOString();
}

/**
 * Formata uma data para YYYY-MM-DD sem problemas de timezone
 * Usa os valores locais (getFullYear, getMonth, getDate) para evitar conversão UTC
 */
export function formatDateToYYYYMMDD(date: Date | null | undefined): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Converte uma string DD/MM/YYYY para YYYY-MM-DD
 */
export function parseDDMMYYYYToYYYYMMDD(dateStr: string): string {
    if (!dateStr || typeof dateStr !== "string") return "";
    
    // Remove espaços e valida formato DD/MM/YYYY
    const cleaned = dateStr.trim();
    const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    
    if (!match) return "";
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Valida valores
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return "";
    if (dayNum < 1 || dayNum > 31) return "";
    if (monthNum < 1 || monthNum > 12) return "";
    if (yearNum < 1900 || yearNum > new Date().getFullYear()) return "";
    
    // Valida se a data é válida (ex: não permite 31/02)
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum - 1 || testDate.getFullYear() !== yearNum) {
        return "";
    }
    
    return `${yearNum}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Converte YYYY-MM-DD para Date usando valores locais (evita problemas de timezone)
 */
export function parseYYYYMMDDToDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== "string") return null;
    
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    
    const [, year, month, day] = match;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) return null;
    
    // Cria Date usando valores locais (não UTC)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    
    // Verifica se a data é válida
    if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
        return null;
    }
    
    return date;
}