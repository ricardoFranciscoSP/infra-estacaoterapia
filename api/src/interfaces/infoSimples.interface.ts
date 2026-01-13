export interface ConsultarCadastroInfoSimplesRequest {
    crp?: string;
    cpf?: string;
    cnpj?: string;
    uf: string;
    nome?: string;
    registro?: string;
}

export interface ConsultarCadastroInfoSimplesResponse {
    success: boolean;
    data?: Record<string, any>;
    header?: Record<string, any>;
    siteReceipts?: string[];
    error?: {
        code: number;
        message: string;
        details?: string[];
    };
}

export interface InfoSimplesError {
    code: number;
    message: string;
    details?: string[];
}
