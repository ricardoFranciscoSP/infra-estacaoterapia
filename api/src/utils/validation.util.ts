export function isValidCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

/**
 * Normaliza um valor de query/param que pode ser string | string[] | ParsedQs | (string | ParsedQs)[] | undefined para string
 * Se for array, retorna o primeiro elemento. Se for undefined, retorna undefined.
 */
export function normalizeQueryString(value: string | string[] | any | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : undefined;
    }
    return String(value);
}

/**
 * Normaliza um valor de query/param que pode ser string | string[] | ParsedQs | (string | ParsedQs)[] | undefined para string
 * Se for array, retorna o primeiro elemento. Se for undefined, retorna o valor padrão.
 */
export function normalizeQueryStringWithDefault(value: string | string[] | any | undefined, defaultValue: string): string {
    const normalized = normalizeQueryString(value);
    return normalized ?? defaultValue;
}

/**
 * Normaliza um valor de query/param que pode ser string | string[] | ParsedQs | (string | ParsedQs)[] | undefined para array de strings
 * Se for string, retorna array com um elemento. Se for undefined, retorna array vazio.
 */
export function normalizeQueryArray(value: string | string[] | any | undefined): string[] {
    if (value === undefined) return [];
    if (Array.isArray(value)) {
        return value.map(v => String(v));
    }
    return [String(value)];
}

/**
 * Normaliza um valor de query/param para número inteiro
 * Se for array, usa o primeiro elemento. Se for undefined ou inválido, retorna undefined.
 */
export function normalizeQueryInt(value: string | string[] | any | undefined): number | undefined {
    const normalized = normalizeQueryString(value);
    if (normalized === undefined) return undefined;
    const parsed = parseInt(normalized, 10);
    return isNaN(parsed) ? undefined : parsed;
}

/**
 * Normaliza um valor de query/param para número inteiro com valor padrão
 * Se for array, usa o primeiro elemento. Se for undefined ou inválido, retorna o valor padrão.
 */
export function normalizeQueryIntWithDefault(value: string | string[] | any | undefined, defaultValue: number): number {
    const normalized = normalizeQueryInt(value);
    return normalized ?? defaultValue;
}

/**
 * Normaliza um valor de req.params que pode ser string | string[] | undefined para string
 * Se for array, retorna o primeiro elemento. Se for undefined, retorna undefined.
 */
export function normalizeParamString(value: string | string[] | undefined): string | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : undefined;
    }
    return String(value);
}

// Adicione outras funções de validação aqui conforme necessário
