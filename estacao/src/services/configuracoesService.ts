import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

// Interfaces específicas para cada seção
export interface ConfiguracaoIntegracoes {
    googleTagManager?: string | null;
    googleAnalytics?: string | null;
    googleAds?: string | null;
    agoraAppId?: string | null;
    agoraAppCertificate?: string | null;
    vindiApiKey?: string | null;
}

export interface ConfiguracaoAparencia {
    darkMode?: boolean | null;
    idiomaPadrao?: string | null;
    idiomasDisponiveis?: string | null;
    logoUrl?: string | null;
    tituloSistema?: string | null;
}

export interface ConfiguracaoAgenda {
    fusoHorarioPadrao?: string | null;
    duracaoConsultaMin?: number | null;
    intervaloEntreConsultas?: number | null;
    antecedenciaMinAgendamento?: number | null;
    antecedenciaMaxAgendamento?: number | null;
    antecedenciaCancelamento?: number | null;
    lembreteAntesConsulta?: number | null;
    horarioGeracaoAutomaticaAgenda?: string | null;
}

export interface ConfiguracaoPagamentos {
    percentualRepasseJuridico?: number | null;
    percentualRepasseAutonomo?: number | null;
    emitirNotaFiscal?: boolean | null;
}

export interface ConfiguracaoComunicacao {
    emailHost?: string | null;
    emailPort?: number | null;
    emailUser?: string | null;
    emailPassword?: string | null;
    emailFrom?: string | null;
    lembreteAntesConsulta?: number | null;
    enviarNotificacaoSMS?: boolean | null;
    enviarNotificacaoPush?: boolean | null;
}

export interface ConfiguracaoLGPD {
    politicaPrivacidadeUrl?: string | null;
    termosUsoUrl?: string | null;
    consentimentoGravacao?: boolean | null;
    tempoRetencaoDadosMeses?: number | null;
    anonimizarDadosInativos?: boolean | null;
}

export interface ConfiguracaoSeguranca {
    tempoExpiracaoSessaoMinutos?: number | null;
    politicaSenhaMinCaracteres?: number | null;
    exigir2FA?: boolean | null;
    bloqueioTentativasFalhas?: number | null;
}

export interface Configuracao {
    Id: string;
    // Integrações
    googleTagManager?: string | null;
    googleAnalytics?: string | null;
    googleAds?: string | null;
    agoraAppId?: string | null;
    agoraAppCertificate?: string | null;
    vindiApiKey?: string | null;
    // Aparência
    darkMode?: boolean | null;
    idiomaPadrao?: string | null;
    idiomasDisponiveis?: string | null;
    logoUrl?: string | null;
    tituloSistema?: string | null;
    // Agenda
    fusoHorarioPadrao?: string | null;
    duracaoConsultaMin?: number | null;
    intervaloEntreConsultas?: number | null;
    antecedenciaMinAgendamento?: number | null;
    antecedenciaMaxAgendamento?: number | null;
    antecedenciaCancelamento?: number | null;
    horarioGeracaoAutomaticaAgenda?: string | null;
    // Pagamentos
    percentualRepasseJuridico?: number | null;
    percentualRepasseAutonomo?: number | null;
    emitirNotaFiscal?: boolean | null;
    // Comunicação
    emailHost?: string | null;
    emailPort?: number | null;
    emailUser?: string | null;
    emailPassword?: string | null;
    emailFrom?: string | null;
    lembreteAntesConsulta?: number | null;
    enviarNotificacaoSMS?: boolean | null;
    enviarNotificacaoPush?: boolean | null;
    // LGPD
    politicaPrivacidadeUrl?: string | null;
    termosUsoUrl?: string | null;
    consentimentoGravacao?: boolean | null;
    tempoRetencaoDadosMeses?: number | null;
    anonimizarDadosInativos?: boolean | null;
    // Segurança
    tempoExpiracaoSessaoMinutos?: number | null;
    politicaSenhaMinCaracteres?: number | null;
    exigir2FA?: boolean | null;
    bloqueioTentativasFalhas?: number | null;
    manutencao?: boolean | null;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface RedesSociais {
    Id: string;
    Facebook?: string | null;
    Instagram?: string | null;
    Linkedin?: string | null;
    X?: string | null;
    Tiktok?: string | null;
    Youtube?: string | null;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface ConfiguracoesResponse {
    configuracoes?: Configuracao[];
    configuracao?: Configuracao;
}

export const configuracoesService = {
    // Buscar todas as configurações
    getAll: (): Promise<AxiosResponse<Configuracao[]>> => 
        api.get('/admin/configuracoes'),
    
    // Buscar configuração por ID
    getById: (id: string): Promise<AxiosResponse<Configuracao>> => 
        api.get(`/admin/configuracoes/${id}`),
    
    // Criar nova configuração
    create: (data: Partial<Configuracao>): Promise<AxiosResponse<Configuracao>> => 
        api.post('/admin/configuracoes', data),
    
    // Atualizar configuração
    update: (id: string, data: Partial<Configuracao>): Promise<AxiosResponse<Configuracao>> => 
        api.patch(`/admin/configuracoes/${id}`, data),
    
    // Deletar configuração
    delete: (id: string): Promise<AxiosResponse<void>> => 
        api.delete(`/admin/configuracoes/${id}`),
};

// Service para Redes Sociais
export const redesSociaisService = {
    // Buscar todas as redes sociais (requer autenticação)
    getAll: (): Promise<AxiosResponse<RedesSociais[]>> => 
        api.get('/admin/configuracoes/redes'),
    
    // Buscar redes sociais públicas (sem autenticação)
    getPublic: (): Promise<AxiosResponse<RedesSociais[]>> => 
        api.get('/faqs/redes-sociais'),
    
    // Criar nova rede social
    create: (data: Partial<RedesSociais>): Promise<AxiosResponse<RedesSociais>> => 
        api.post('/admin/configuracoes/redes', data),
    
    // Atualizar rede social
    update: (data: Partial<RedesSociais>): Promise<AxiosResponse<RedesSociais>> => 
        api.put('/admin/configuracoes/redes', data),
    
    // Deletar rede social
    delete: (): Promise<AxiosResponse<void>> => 
        api.delete('/admin/configuracoes/redes'),
};

