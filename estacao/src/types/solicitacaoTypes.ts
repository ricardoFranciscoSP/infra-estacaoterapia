export interface SolicitacaoDocument {
    Id: string;
    Url: string;
    Type?: string | null;
    Description?: string | null;
    CreatedAt: Date | string;
    UpdatedAt: Date | string;
}

export interface Solicitacao {
    Id: string;
    UserId: string;
    User?: {
        Id: string;
        Nome: string;
        Email: string;
    };
    Title: string;
    Tipo: string;
    Status: string;
    Protocol: string;
    Descricao?: string | null;
    Documentos?: string | null;
    Documents?: SolicitacaoDocument[];
    Log?: string | null;
    SLA?: number | null;
    PublicoTodos?: boolean;
    PublicoPacientes?: boolean;
    PublicoPsicologos?: boolean;
    PublicoFinanceiro?: boolean;
    CreatedAt: Date | string;
    UpdatedAt: Date | string;
}

export interface CreateSolicitacaoData {
    Title: string;
    Tipo: string;
    Descricao?: string;
    Documentos?: File | null;
    PublicoTodos?: boolean;
    PublicoPacientes?: boolean;
    PublicoPsicologos?: boolean;
    PublicoFinanceiro?: boolean;
    DestinatariosIds?: string[];
}

export interface UpdateSolicitacaoData {
    Title?: string;
    Tipo?: string;
    Status?: string;
    Descricao?: string;
    Log?: string;
    SLA?: number;
}

export interface FilterSolicitacoesParams {
    tipo?: string;
    status?: string;
    Protocol?: string;
    Title?: string;
    startDate?: Date | string;
    endDate?: Date | string;
}

// Thread de respostas
export interface ThreadMessage {
    id: string;
    autor: 'paciente' | 'admin';
    autorNome?: string;
    mensagem: string;
    data: Date | string;
}

export interface SolicitacaoThread {
    mensagens: ThreadMessage[];
}

export interface AddResponseData {
    solicitacaoId: string;
    mensagem: string;
    status?: string; // Opcional, para atualizar status ao responder
}