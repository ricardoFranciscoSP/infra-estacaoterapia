import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface VerificarTipoPsicologoResponse {
    isAutonomo: boolean;
    isPessoaJuridica: boolean;
    error?: string;
}

export interface VerificarFormularioResponse {
    status: boolean;
    formulario?: Record<string, unknown>;
}

export interface CriarSolicitacaoSaqueData {
    valor: number;
    periodo: string;
    quantidadeConsultas: number;
    notaFiscal?: File;
}

export interface CriarSolicitacaoSaqueResponse {
    success: boolean;
    message: string;
    protocolo?: string;
}

export interface UltimaSolicitacaoSaqueResponse {
    success: boolean;
    solicitacao?: {
        id: string;
        status: string;
        periodo?: string;
        valor?: number;
        dataPagamento?: string;
        createdAt: string;
        updatedAt: string;
    } | null;
    message?: string;
}

export const solicitacaoSaqueService = {
    // Verificar tipo de psicólogo
    verificarTipoPsicologo: (): Promise<AxiosResponse<VerificarTipoPsicologoResponse>> =>
        api.get('/solicitacao-saque/verificar-tipo'),

    // Verificar status do formulário
    verificarFormulario: (): Promise<AxiosResponse<VerificarFormularioResponse>> =>
        api.get('/solicitacao-saque/verificar-formulario'),

    // Criar solicitação de saque
    criarSolicitacaoSaque: (data: CriarSolicitacaoSaqueData): Promise<AxiosResponse<CriarSolicitacaoSaqueResponse>> => {
        const formData = new FormData();
        formData.append('valor', data.valor.toString());
        formData.append('periodo', data.periodo);
        formData.append('quantidadeConsultas', data.quantidadeConsultas.toString());
        if (data.notaFiscal) {
            formData.append('notaFiscal', data.notaFiscal);
        }
        
        // O interceptor do axios já gerencia o Content-Type para FormData
        // Não precisa definir manualmente
        return api.post('/solicitacao-saque/criar', formData);
    },

    // Buscar última solicitação de saque
    getUltimaSolicitacaoSaque: (): Promise<AxiosResponse<UltimaSolicitacaoSaqueResponse>> =>
        api.get('/solicitacao-saque/ultima'),
};
