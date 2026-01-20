import { ISolicitacao } from '../types/solicitacoes.types';
import { Role } from '../types/permissions.types';

export interface ISolicitacoesService {
    createSolicitacao(userId: string, data: Omit<ISolicitacao, 'Id' | 'CreatedAt' | 'UpdatedAt' | 'Protocol'>, file?: Express.Multer.File, protocol?: string): Promise<{ success: boolean; message: string; protocol?: string }>;
    getSolicitacoesByUserId(userId: string, userRole?: Role): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }>;
    updateSolicitacaoStatus(solicitacaoId: string, status: string): Promise<{ success: boolean; message: string }>;
    getAll(userId?: string, userRole?: Role): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }>;
    getFinanceSolicitacoes(): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }>;
    delete(solicitacaoId: string): Promise<{ success: boolean; message: string }>;
    filter(params: {
        tipo?: string;
        status?: string;
        Protocol?: string;
        Title?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ success: boolean; solicitacoes?: ISolicitacao[]; message?: string }>;
    getSolicitacaoDocumentUrl(solicitacaoId: string, userId: string, userRole?: Role): Promise<{ success: boolean; url?: string; expiresAt?: Date; message?: string }>;
}