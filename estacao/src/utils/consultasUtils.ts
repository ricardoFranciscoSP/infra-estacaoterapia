// Função utilitária para montar o array de consultas para o card
// Garante que consultaAtual (se existir) venha primeiro e não duplique com futuras
import { Consulta } from "../components/ProximaConsultaCard";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "America/Sao_Paulo";

// Função para criar um objeto Date local juntando Date (data UTC) e Time (hora local)
function getLocalDateTime(consulta: Consulta): Date | null {
    if (!consulta.Date || !consulta.Time) return null;
    // Extrai ano, mês, dia da data UTC
    const d = dayjs(consulta.Date).tz(TIMEZONE);
    const [h, m] = consulta.Time.split(":");
    // Cria data local com hora correta
    return d.hour(Number(h)).minute(Number(m)).second(0).millisecond(0).toDate();
}

// Para psicólogo: retorna todas as consultas futuras (a partir de agora)
export function montarConsultasParaCard(
    consultaAtual?: Consulta | null,
    futuras?: Consulta[]
): Consulta[] {
    // Junta consultaAtual e futuras, removendo duplicidade
    const todas = [
        ...(consultaAtual ? [consultaAtual] : []),
        ...(futuras || [])
    ];
    // Remove duplicidade por Id
    const ids = new Set<string>();
    const unicos = todas.filter((c) => {
        if (!c.Id || ids.has(c.Id)) return false;
        ids.add(c.Id);
        return true;
    });
    // Filtra apenas as consultas que ainda não começaram (considerando data e hora local)
    const agora = dayjs().tz(TIMEZONE);
    return unicos.filter((c) => {
        const dataHora = getLocalDateTime(c);
        return dataHora && dayjs(dataHora).isAfter(agora);
    }).sort((a, b) => {
        const da = getLocalDateTime(a);
        const db = getLocalDateTime(b);
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
    });
}

// Para paciente: retorna apenas a próxima consulta futura
export function obterProximaConsultaPaciente(
    consultaAtual?: Consulta | null,
    futuras?: Consulta[]
): Consulta | null {
    const todas = [
        ...(consultaAtual ? [consultaAtual] : []),
        ...(futuras || [])
    ];
    // Remove duplicidade por Id
    const ids = new Set<string>();
    const unicos = todas.filter((c) => {
        if (!c.Id || ids.has(c.Id)) return false;
        ids.add(c.Id);
        return true;
    });
    // Filtra apenas as consultas que ainda não começaram
    const agora = dayjs().tz(TIMEZONE);
    const futurasConsultas = unicos.filter((c) => {
        const dataHora = getLocalDateTime(c);
        return dataHora && dayjs(dataHora).isAfter(agora);
    });
    // Retorna a mais próxima
    if (futurasConsultas.length === 0) return null;
    futurasConsultas.sort((a, b) => {
        const da = getLocalDateTime(a);
        const db = getLocalDateTime(b);
        if (!da || !db) return 0;
        return da.getTime() - db.getTime();
    });
    return futurasConsultas[0];
}

/**
 * Compara data e hora da consulta com a data e hora atual
 * Retorna true se a consulta é futura (não retroativa)
 * Usa formato yyyy-mm-dd para comparar datas e Time para comparar horários
 */
function isConsultaFutura(consulta: { Date: string; Time: string }): boolean {
    if (!consulta.Date || !consulta.Time) return false;
    
    const agora = dayjs().tz(TIMEZONE);
    const dataAtual = agora.format('YYYY-MM-DD');
    const horaAtual = agora.format('HH:mm');
    
    // Extrai a data no formato yyyy-mm-dd da consulta
    const dataConsulta = dayjs(consulta.Date).tz(TIMEZONE).format('YYYY-MM-DD');
    
    // Normaliza o horário da consulta para garantir formato HH:mm
    const horaConsulta = consulta.Time.trim();
    if (!/^\d{2}:\d{2}$/.test(horaConsulta)) {
        // Se o formato não está correto, tenta normalizar
        const partes = horaConsulta.split(':');
        if (partes.length === 2) {
            const h = partes[0].padStart(2, '0');
            const m = partes[1].padStart(2, '0');
            const horaNormalizada = `${h}:${m}`;
            
            // Compara primeiro a data
            if (dataConsulta > dataAtual) {
                return true;
            } else if (dataConsulta < dataAtual) {
                return false;
            } else {
                // Se é o mesmo dia, compara o horário
                return horaNormalizada > horaAtual;
            }
        }
        return false;
    }
    
    // Compara primeiro a data
    if (dataConsulta > dataAtual) {
        // Se a data da consulta é futura, é válida
        return true;
    } else if (dataConsulta < dataAtual) {
        // Se a data da consulta é passada, não é válida
        return false;
    } else {
        // Se é o mesmo dia, compara o horário
        return horaConsulta > horaAtual;
    }
}

/**
 * Tipo para consulta com campos mínimos necessários
 */
type ConsultaMinima = {
    Id: string;
    Date: string;
    Time: string;
};

/**
 * Filtra e retorna apenas a consulta mais próxima, excluindo datas retroativas
 * Compara usando formato yyyy-mm-dd para data e Time para horário
 */
export function obterProximaConsultaReservada(
    consultaAtual?: ConsultaMinima | null,
    futuras?: Array<ConsultaMinima> | null
): ConsultaMinima | null {
    const todas: ConsultaMinima[] = [];
    
    if (consultaAtual && consultaAtual.Id && consultaAtual.Date && consultaAtual.Time) {
        todas.push(consultaAtual);
    }
    
    if (futuras && Array.isArray(futuras)) {
        futuras.forEach(f => {
            if (f && f.Id && f.Date && f.Time) {
                todas.push(f);
            }
        });
    }
    
    // Remove duplicidade por Id
    const ids = new Set<string>();
    const unicos = todas.filter((c) => {
        if (!c.Id || ids.has(c.Id)) return false;
        ids.add(c.Id);
        return true;
    });
    
    // Filtra apenas consultas futuras (não retroativas)
    const consultasFuturas = unicos.filter(isConsultaFutura);
    
    if (consultasFuturas.length === 0) return null;
    
    // Ordena por data e horário, retornando a mais próxima
    consultasFuturas.sort((a, b) => {
        const dataA = dayjs(a.Date).tz(TIMEZONE).format('YYYY-MM-DD');
        const dataB = dayjs(b.Date).tz(TIMEZONE).format('YYYY-MM-DD');
        
        // Compara primeiro a data
        if (dataA !== dataB) {
            return dataA.localeCompare(dataB);
        }
        
        // Se é o mesmo dia, compara o horário
        return a.Time.localeCompare(b.Time);
    });
    
    return consultasFuturas[0];
}