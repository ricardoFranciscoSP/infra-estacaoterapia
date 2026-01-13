import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Constante não utilizada, mas mantida para referência futura
// const TOLERANCIA_MINUTOS = 10;
/**
 * Verifica se é possível reagendar uma consulta (mais de 24h antes do horário marcado)
 */
export function podeReagendar(date?: string, time?: string): boolean {
    if (!date || !time) return false;
    try {
        let dataObj: Date;
        if (date.includes("T") || date.length > 10) {
            dataObj = new Date(date);
            const [hora, minuto] = time.split(":");
            if (hora && minuto) {
                dataObj.setHours(Number(hora), Number(minuto), 0, 0);
            }
        } else {
            const [ano, mes, dia] = date.split("-");
            const [hora, minuto] = time.split(":");
            dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
        }
        const diffMs = dataObj.getTime() - new Date().getTime();
        const HOUR_24_MS = 24 * 60 * 60 * 1000;
        return diffMs > HOUR_24_MS;
    } catch {
        return false;
    }
}

/**
 * Formata uma data no padrão "Dia da semana dd/MM/yyyy"
 * Garante que usa a mesma lógica de extração de data que formatarDataHora
 */
export function formatarDataCompleta(dataISO?: string): string {
    if (!dataISO) return "";

    try {
        // Extrai apenas a parte yyyy-mm-dd se vier como ISO string (mesma lógica de formatarDataHora)
        const dateOnly = dataISO.split('T')[0].split(' ')[0];
        
        // Valida formato yyyy-mm-dd
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            // Se não for formato yyyy-mm-dd, tenta parsear como Date
            const d = new Date(dataISO);
            if (isNaN(d.getTime())) return dataISO;
            return format(d, "EEEE dd/MM/yyyy", { locale: ptBR });
        }
        
        // Parseia a data no formato yyyy-mm-dd sem conversão de timezone
        const [ano, mes, dia] = dateOnly.split('-');
        if (!ano || !mes || !dia) return dataISO;
        
        // Cria Date usando valores locais (evita conversão de timezone)
        const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
        if (isNaN(d.getTime())) return dataISO;
        
        return format(d, "EEEE dd/MM/yyyy", { locale: ptBR });
    } catch {
        return dataISO;
    }
}

/**
 * Formata uma data no padrão "dd/MM/yyyy"
 */
export function formatarData(dataStr?: string): string {
    if (!dataStr) return "";

    try {
        const dateObj = new Date(dataStr);
        if (isNaN(dateObj.getTime())) return "";

        const dia = String(dateObj.getDate()).padStart(2, "0");
        const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
        const ano = dateObj.getFullYear();
        return `${dia}/${mes}/${ano}`;
    } catch {
        return "";
    }
}

/**
 * Verifica se o botão "Entrar na consulta" deve estar habilitado
 * Considera tolerância de 10 minutos após o horário
 */
export function verificarSePodeEntrarNaConsulta(
    data: string,
    horario: string,
    botaoEntrarDesabilitado?: boolean
): boolean {
    // Se houver controle externo, usa ele
    if (typeof botaoEntrarDesabilitado === "boolean") {
        return !botaoEntrarDesabilitado;
    }

    // Permite entrar do horário agendado até 10 minutos depois (tolerância)
    try {
        if (!data || !horario) return false;

        const dataConsulta = new Date(`${data}T${horario}`);
        const agora = new Date();
        const diffMs = agora.getTime() - dataConsulta.getTime();
        const toleranciaMs = 10 * 60 * 1000; // 10 minutos

        // Permite entrar se estiver entre o horário da consulta e até 10 minutos depois
        return diffMs >= 0 && diffMs <= toleranciaMs;
    } catch {
        return false;
    }
}

/**
 * Verifica se um objeto é uma ConsultaApi completa
 */
type ConsultaApiLike = {
    Id?: string;
    Date?: string;
    Time?: string;
    Status?: string;
    PacienteId?: string;
    PsicologoId?: string;
    [key: string]: unknown;
};
function isConsultaApi(obj: unknown): obj is ConsultaApiLike {
    if (!obj || typeof obj !== 'object') return false;
    const c = obj as ConsultaApiLike;
    return (
        typeof c.Id === 'string' &&
        typeof c.Date === 'string' &&
        typeof c.Time === 'string' &&
        typeof c.Status === 'string' &&
        typeof c.PacienteId === 'string' &&
        typeof c.PsicologoId === 'string'
    );
}

/**
 * Extrai consultas futuras de diferentes formatos de resposta da API
 * Inclui consultaAtual quando for uma ConsultaApi completa
 */
type FuturasApiLike = {
    consultaAtual?: ConsultaApiLike;
    futuras?: ConsultaApiLike[];
    nextReservation?: ConsultaApiLike;
    [key: string]: unknown;
};
export function extrairConsultasFuturas(consultasAgendadas: unknown): Array<ConsultaApiLike> {
    if (!consultasAgendadas) return [];

    const consultas: ConsultaApiLike[] = [];

    // Se for array de objetos Futuras
    if (
        Array.isArray(consultasAgendadas) &&
        consultasAgendadas.length > 0 &&
        typeof consultasAgendadas[0] === "object" &&
        consultasAgendadas[0] !== null &&
        "futuras" in consultasAgendadas[0]
    ) {
        (consultasAgendadas as FuturasApiLike[]).forEach((item) => {
            // Adiciona consultaAtual se for uma ConsultaApi completa
            if (item.consultaAtual && isConsultaApi(item.consultaAtual)) {
                consultas.push(item.consultaAtual);
            }
            // Adiciona futuras do array
            if (Array.isArray(item.futuras)) {
                consultas.push(...item.futuras.filter(isConsultaApi));
            }
            // Adiciona nextReservation se existir
            if (item.nextReservation && isConsultaApi(item.nextReservation)) {
                consultas.push(item.nextReservation);
            }
        });
        return consultas;
    }

    // Se for objeto Futuras único
    if (
        typeof consultasAgendadas === "object" &&
        consultasAgendadas !== null &&
        "futuras" in (consultasAgendadas as object)
    ) {
        const item = consultasAgendadas as FuturasApiLike;

        // Adiciona consultaAtual se for uma ConsultaApi completa
        if (item.consultaAtual && isConsultaApi(item.consultaAtual)) {
            consultas.push(item.consultaAtual);
        }

        // Adiciona futuras do array
        if (Array.isArray(item.futuras)) {
            consultas.push(...item.futuras.filter(isConsultaApi));
        }

        // Adiciona nextReservation se existir
        if (item.nextReservation && isConsultaApi(item.nextReservation)) {
            consultas.push(item.nextReservation);
        }

        return consultas;
    }

    return [];
}
