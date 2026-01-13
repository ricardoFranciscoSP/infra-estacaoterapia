export interface ConsultasRealizadasResponse {
    success: boolean;
    total: number;
    message?: string;
}

export interface ConsultasRealizadasResult {
    total: number;
}

export interface ConsultasMensaisResult {
    year: number;
    counts: number[]; // tamanho 12 (Jan..Dez)
    total: number; // soma do ano
}
