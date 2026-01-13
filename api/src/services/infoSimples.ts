import axios, { AxiosError } from 'axios';

// ========================
// Tipos e Interfaces
// ========================

interface InfoSimplesRequest {
    crp?: string;
    cpf?: string;
    cnpj?: string;
    uf?: string;
    nome?: string;
    registro?: string;
    token: string;
    timeout?: string | number;
}

interface InfoSimplesHeader {
    [key: string]: any;
}

interface InfoSimplesData {
    [key: string]: any;
}

interface InfoSimplesResponse {
    code: number;
    code_message?: string;
    data?: InfoSimplesData;
    errors?: string[];
    header?: InfoSimplesHeader;
    site_receipts?: string[];
}

interface ConsultaResult {
    success: boolean;
    data?: InfoSimplesData;
    header?: InfoSimplesHeader;
    siteReceipts?: string[];
    error?: {
        code: number;
        message: string;
        details?: string[];
    };
}

// ========================
// Classe do Serviço
// ========================

class InfoSimplesService {
    private baseUrl = 'https://api.infosimples.com/api/v2/consultas/cfp/cadastro';
    private token: string;
    private timeout: number;

    constructor(token: string, timeout: number = 60000) {
        if (!token) {
            throw new Error('Token da InfoSimples é obrigatório');
        }
        this.token = token;
        this.timeout = timeout; // timeout do axios em ms
    }

    /**
     * Realiza consulta de cadastro na InfoSimples
     * @param params - Parâmetros da consulta (cpf, cnpj, uf, nome, registro)
     * @returns Resultado da consulta
     */
    async consultarCadastro(params: Omit<InfoSimplesRequest, 'token' | 'timeout'>): Promise<ConsultaResult> {
        const startTime = Date.now();
        console.log('[InfoSimples] Iniciando consulta:', { params });

        try {
            // Validar parâmetros obrigatórios
            this.validarParametros(params);

            // Preparar payload para a API (timeout em segundos)
            const payload: InfoSimplesRequest = {
                ...params,
                token: this.token,
                timeout: 30,
            };

            console.log('[InfoSimples] Enviando requisição...');

            // Realizar requisição
            const response = await axios.post<InfoSimplesResponse>(this.baseUrl, payload, {
                timeout: this.timeout,
            });

            const duration = Date.now() - startTime;
            console.log(`[InfoSimples] Resposta recebida em ${duration}ms`);

            // Processar resposta
            return this.processarResposta(response.data);
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[InfoSimples] Erro após ${duration}ms:`, error);
            return this.tratarErro(error);
        }
    }

    /**
     * Valida os parâmetros da requisição
     */
    private validarParametros(params: Omit<InfoSimplesRequest, 'token' | 'timeout'>): void {
        const temCRP = params.crp && params.crp.trim().length > 0;
        const temCPF = params.cpf && params.cpf.trim().length > 0;
        const temCNPJ = params.cnpj && params.cnpj.trim().length > 0;
        const temNome = params.nome && params.nome.trim().length > 0;

        if (!temCRP && !temCPF && !temCNPJ && !temNome) {
            throw new Error('CRP, CPF, CNPJ ou Nome é obrigatório');
        }
    }

    /**
     * Processa a resposta da API
     */
    private processarResposta(response: InfoSimplesResponse): ConsultaResult {
        if (response.code === 200) {
            return {
                success: true,
                data: response.data,
                header: response.header,
                siteReceipts: response.site_receipts,
            };
        }

        // Erro da API
        let mensagem = `Consulta sem sucesso - Código: ${response.code} `;
        if (response.code_message) {
            mensagem += ` (${response.code_message})`;
        }

        return {
            success: false,
            error: {
                code: response.code,
                message: mensagem,
                details: response.errors,
            },
        };
    }

    /**
     * Trata erros da requisição
     */
    private tratarErro(error: any): ConsultaResult {
        let mensagem = 'Erro ao consultar InfoSimples';
        let codigo = 500;

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            codigo = axiosError.response?.status || 500;

            if (axiosError.code === 'ECONNABORTED') {
                mensagem = 'Timeout na requisição';
            } else if (axiosError.code === 'ENOTFOUND') {
                mensagem = 'Servidor não encontrado';
            } else if (axiosError.response?.data) {
                mensagem = `Erro: ${JSON.stringify(axiosError.response.data)} `;
            } else {
                mensagem = axiosError.message;
            }
        } else if (error instanceof Error) {
            mensagem = error.message;
        }

        return {
            success: false,
            error: {
                code: codigo,
                message: mensagem,
            },
        };
    }
}

// ========================
// Exportações
// ========================

export { InfoSimplesService, InfoSimplesRequest, ConsultaResult };

export default InfoSimplesService;

