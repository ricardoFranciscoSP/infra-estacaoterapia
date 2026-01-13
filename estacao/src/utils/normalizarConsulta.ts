// Utilidades para normalizar objetos de consulta vindos da API

export interface NormalizedEntity {
    id?: string | number;
    nome?: string;
    imageUrl?: string;
}

export interface NormalizedConsulta {
    id?: string | number;
    date?: string; // ISO ou string de data
    time?: string; // HH:mm
    paciente?: NormalizedEntity;
    psicologo?: NormalizedEntity;
    pacienteId?: string | number;
    psicologoId?: string | number;
    status?: string;
    raw: Record<string, string | number | boolean | object | undefined>;
}

// Retorna o primeiro valor definido dentre chaves possíveis
export type GenericObject = { [key: string]: string | number | boolean | undefined | object };
function pick<T>(obj: GenericObject | undefined, keys: string[]): T | undefined {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
    }
    return undefined;
}

export function getFirstImageUrl(entity: GenericObject | undefined): string | undefined {
    if (!entity || typeof entity !== "object") return undefined;

    // Suporte a entity.Url / entity.url direto
    const directUrl = pick<string>(entity, ["Url", "url"]);
    if (typeof directUrl === "string") return directUrl;

    // Suporte a Images / images arrays
    const images = pick<GenericObject[]>(entity, ["Images", "images"]);
    if (Array.isArray(images) && images.length > 0) {
        const first = images[0];
        const urlInFirst = pick<string>(first, ["Url", "url"]);
        if (typeof urlInFirst === "string") return urlInFirst;
    }

    return undefined;
}

function normalizeEntity(entity: GenericObject | undefined): NormalizedEntity | undefined {
    if (!entity || typeof entity !== "object") return undefined;
    const rawId = pick(entity, ["Id", "id", "_id"]);
    const id = (typeof rawId === "string" || typeof rawId === "number") ? rawId : undefined;
    const nome = pick<string>(entity, ["Nome", "nome", "Name", "name"]);
    const imageUrl = getFirstImageUrl(entity);
    return { id, nome, imageUrl };
}

export function normalizeConsulta(input: GenericObject): NormalizedConsulta {
    const agenda = pick<GenericObject>(input, ["Agenda", "agenda"]) || {};

    // Trata data que pode vir como Date object ou string
    const rawDate = pick<string | Date>(agenda, ["Data", "data"]) || pick<string | Date>(input, ["Date", "date"]);
    let date: string | undefined;
    if (rawDate instanceof Date) {
        date = rawDate.toISOString().split('T')[0]; // Converte Date para YYYY-MM-DD
    } else if (typeof rawDate === 'string') {
        // Extrai apenas a parte yyyy-mm-dd se vier como ISO string (2025-12-01T03:00:00.000Z)
        date = rawDate.split('T')[0].split(' ')[0]; // Pega apenas yyyy-mm-dd
    }

    const time = pick<string>(agenda, ["Horario", "horario", "Time", "time"]) || pick<string>(input, ["Time", "time"]);

    const pacienteObj = pick<GenericObject>(input, ["Paciente", "paciente", "Patient", "patient"]);
    const psicologoObj = pick<GenericObject>(input, ["Psicologo", "psicologo", "Profissional", "Professional", "professional"]);

    const paciente = normalizeEntity(pacienteObj);
    const psicologo = normalizeEntity(psicologoObj);

    const rawId = pick<string | number>(input, ["Id", "id", "_id"]);
    const id = (typeof rawId === "string" || typeof rawId === "number") ? rawId : undefined;
    const rawPacienteId = pick<string | number>(input, ["PacienteId", "pacienteId", "patientId"]);
    const pacienteId = (typeof rawPacienteId === "string" || typeof rawPacienteId === "number") ? rawPacienteId : paciente?.id;
    const rawPsicologoId = pick<string | number>(input, ["PsicologoId", "psicologoId", "professionalId", "profissionalId"]);
    const psicologoId = (typeof rawPsicologoId === "string" || typeof rawPsicologoId === "number") ? rawPsicologoId : psicologo?.id;
    
    // Prioriza ReservaSessao.Status, depois Consulta.Status, depois Agenda.Status
    const reservaSessao = pick<GenericObject>(input, ["ReservaSessao", "reservaSessao"]) || {};
    const status = pick<string>(reservaSessao, ["Status", "status"]) 
        || pick<string>(input, ["Status", "status"]) 
        || pick<string>(agenda, ["Status", "status"]);

    return {
        id,
        date,
        time,
        paciente,
        psicologo,
        pacienteId,
        psicologoId,
        status,
        raw: input,
    };
}
