import { api } from "@/lib/axios";
import { CreateSolicitacaoData, FilterSolicitacoesParams, AddResponseData } from "@/types/solicitacaoTypes";
import { AxiosResponse } from "axios";

export interface SolicitacoesResponse {
    success: boolean;
    solicitacoes?: import("@/types/solicitacaoTypes").Solicitacao[];
    message?: string;
}

export interface SolicitacaoResponse {
    success: boolean;
    solicitacao?: import("@/types/solicitacaoTypes").Solicitacao;
    message?: string;
}

export const solicitacaoService = {
    // Buscar todas as solicitações do usuário logado
    getSolicitacoes: (): Promise<AxiosResponse<SolicitacoesResponse>> => 
        api.get('/solicitacoes/me'),
    
    // Buscar todas as solicitações (admin)
    getAllSolicitacoes: (): Promise<AxiosResponse<SolicitacoesResponse>> => 
        api.get('/solicitacoes'),

    // Buscar todas as solicitações financeiras (admin/finance)
    getSolicitacoesFinanceiro: (): Promise<AxiosResponse<SolicitacoesResponse>> =>
        api.get('/solicitacoes/financeiro'),
    
    // Buscar solicitação por ID
    getSolicitacaoById: (id: string): Promise<AxiosResponse<SolicitacaoResponse>> => 
        api.get(`/solicitacoes/${id}`),
    
    // Criar nova solicitação
    createSolicitacao: (data: CreateSolicitacaoData): Promise<AxiosResponse<{ success: boolean; message: string }>> => {
        const formData = new FormData();
        formData.append('Title', data.Title);
        formData.append('Tipo', data.Tipo);
        if (data.Descricao) {
            formData.append('Descricao', data.Descricao);
        }
        if (data.Documentos) {
            formData.append('documento', data.Documentos);
        }
        // O interceptor do axios já gerencia o Content-Type para FormData
        return api.post('/solicitacoes', formData);
    },
    
    // Atualizar status da solicitação
    updateSolicitacaoStatus: (solicitacaoId: string, status: string): Promise<AxiosResponse<{ success: boolean; message: string }>> => 
        api.patch('/solicitacoes/status', { solicitacaoId, status }),
    
    // Deletar solicitação
    deleteSolicitacao: (id: string): Promise<AxiosResponse<{ success: boolean; message: string }>> => 
        api.delete(`/solicitacoes/${id}`),
    
    // Filtrar solicitações
    filterSolicitacoes: (params: FilterSolicitacoesParams): Promise<AxiosResponse<SolicitacoesResponse>> => {
        const queryParams = new URLSearchParams();
        if (params.tipo) queryParams.append('tipo', params.tipo);
        if (params.status) queryParams.append('status', params.status);
        if (params.Protocol) queryParams.append('Protocol', params.Protocol);
        if (params.Title) queryParams.append('Title', params.Title);
        if (params.startDate) queryParams.append('startDate', params.startDate.toString());
        if (params.endDate) queryParams.append('endDate', params.endDate.toString());
        
        return api.get(`/solicitacoes/filter?${queryParams.toString()}`);
    },
    
    // Adicionar resposta à thread da solicitação
    addResponse: (data: AddResponseData): Promise<AxiosResponse<{ success: boolean; message: string }>> => 
        api.post(`/solicitacoes/${data.solicitacaoId}/responder`, {
            mensagem: data.mensagem,
            status: data.status,
        }),
};
