import { Request } from 'express';
import { AuditService } from '../services/audit.service';
import { ActionType, Module } from '../generated/prisma/client';
import { createAuditMetadata } from './auditHelper.util';
import { getClientIp } from './getClientIp.util';

const auditService = new AuditService();

interface AuditLogOptions {
    userId: string;
    actionType: ActionType;
    module: Module;
    description: string;
    ipAddress?: string;
    status?: 'Sucesso' | 'Falha' | 'Alerta';
    metadata?: Record<string, unknown>;
}

/**
 * Helper para registrar auditoria de forma simples e consistente
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
    try {
        const sanitizedMetadata = options.metadata ? createAuditMetadata(options.metadata) : undefined;
        
        await auditService.log({
            userId: options.userId,
            actionType: options.actionType,
            module: options.module,
            description: options.description,
            ipAddress: options.ipAddress,
            status: options.status || 'Sucesso',
            metadata: sanitizedMetadata,
        });
    } catch (error) {
        // Não interrompe o fluxo principal se houver erro na auditoria
        console.error('[AuditLogger] Erro ao registrar auditoria:', error);
    }
}

/**
 * Registra auditoria de compra de plano
 */
export async function logPlanoPurchase(
    userId: string,
    planoId: string,
    planoNome: string,
    valor: number,
    status: 'Sucesso' | 'Falha',
    ipAddress?: string,
    error?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Create',
        module: 'Plans',
        description: `Compra de plano: ${planoNome} (ID: ${planoId}) - Valor: R$ ${valor.toFixed(2)}`,
        ipAddress,
        status,
        metadata: {
            planoId,
            planoNome,
            valor,
            ...(error && { error }),
        },
    });
}

/**
 * Registra auditoria de cancelamento de plano
 */
export async function logPlanoCancel(
    userId: string,
    assinaturaPlanoId: string,
    planoNome: string,
    motivo?: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Delete',
        module: 'Plans',
        description: `Cancelamento de plano: ${planoNome} (Assinatura ID: ${assinaturaPlanoId})`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            assinaturaPlanoId,
            planoNome,
            ...(motivo && { motivo }),
        },
    });
}

/**
 * Registra auditoria de criação de consulta
 */
export async function logConsultaCreate(
    userId: string,
    consultaId: string,
    pacienteId: string,
    psicologoId: string,
    dataHora: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Create',
        module: 'Sessions',
        description: `Consulta criada: ID ${consultaId} - Paciente: ${pacienteId}, Psicólogo: ${psicologoId}, Data/Hora: ${dataHora}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            consultaId,
            pacienteId,
            psicologoId,
            dataHora,
        },
    });
}

/**
 * Registra auditoria de cancelamento de consulta
 */
export async function logConsultaCancel(
    userId: string,
    consultaId: string,
    motivo: string,
    protocolo: string,
    tipo: 'Paciente' | 'Psicologo' | 'Admin' | 'Sistema',
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Update',
        module: 'Sessions',
        description: `Consulta cancelada: ID ${consultaId} - Protocolo: ${protocolo} - Tipo: ${tipo}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            consultaId,
            protocolo,
            tipo,
            motivo,
        },
    });
}

/**
 * Registra auditoria de atualização de status de consulta
 */
export async function logConsultaStatusUpdate(
    userId: string,
    consultaId: string,
    statusAnterior: string,
    statusNovo: string,
    origem: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Update',
        module: 'Sessions',
        description: `Status de consulta atualizado: ID ${consultaId} - ${statusAnterior} → ${statusNovo}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            consultaId,
            statusAnterior,
            statusNovo,
            origem,
        },
    });
}

/**
 * Registra auditoria de criação de comissão
 */
export async function logCommissionCreate(
    psicologoId: string,
    consultaId: string,
    valor: number,
    tipoPlano: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId: 'system', // Sistema automaticamente cria comissões
        actionType: 'Create',
        module: 'Finance',
        description: `Comissão criada: Psicólogo ${psicologoId} - Consulta ${consultaId} - Valor: R$ ${valor.toFixed(2)} - Plano: ${tipoPlano}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            psicologoId,
            consultaId,
            valor,
            tipoPlano,
        },
    });
}

/**
 * Registra auditoria de erro de pagamento
 */
export async function logPaymentError(
    userId: string,
    tipo: 'plano' | 'consulta' | 'outro',
    valor: number,
    error: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Update',
        module: 'Payments',
        description: `Erro de pagamento: ${tipo} - Valor: R$ ${valor.toFixed(2)} - ${error}`,
        ipAddress,
        status: 'Falha',
        metadata: {
            tipo,
            valor,
            error,
            ...metadata,
        },
    });
}

/**
 * Registra auditoria de aprovação/rejeição de psicólogo
 */
export async function logPsychologistApproval(
    adminId: string,
    psicologoId: string,
    action: 'approve' | 'reject',
    motivo?: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId: adminId,
        actionType: action === 'approve' ? 'Approve' : 'Update',
        module: 'Psychologists',
        description: `Psicólogo ${action === 'approve' ? 'aprovado' : 'rejeitado'}: ID ${psicologoId}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            psicologoId,
            action,
            ...(motivo && { motivo }),
        },
    });
}

/**
 * Helper para registrar auditoria a partir de um Request (extrai IP automaticamente)
 */
export async function logAuditFromRequest(
    req: Request,
    userId: string,
    actionType: ActionType,
    module: Module,
    description: string,
    status: 'Sucesso' | 'Falha' | 'Alerta' = 'Sucesso',
    metadata?: Record<string, unknown>
): Promise<void> {
    const ipAddress = getClientIp(req);
    await logAudit({
        userId,
        actionType,
        module,
        description,
        ipAddress,
        status,
        metadata,
    });
}

/**
 * Registra auditoria de criação de solicitação
 */
export async function logSolicitacaoCreate(
    userId: string,
    solicitacaoId: string,
    protocolo: string,
    tipo: string,
    titulo: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Create',
        module: 'Notifications', // Considerando que solicitações são notificações/comunicações
        description: `Solicitação criada: ${titulo} (Protocolo: ${protocolo}, Tipo: ${tipo})`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            solicitacaoId,
            protocolo,
            tipo,
            titulo,
        },
    });
}

/**
 * Registra auditoria de atualização de solicitação
 */
export async function logSolicitacaoUpdate(
    userId: string,
    solicitacaoId: string,
    protocolo: string,
    statusAnterior: string,
    statusNovo: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Update',
        module: 'Notifications',
        description: `Solicitação atualizada: Protocolo ${protocolo} - Status: ${statusAnterior} → ${statusNovo}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            solicitacaoId,
            protocolo,
            statusAnterior,
            statusNovo,
        },
    });
}

/**
 * Registra auditoria de exclusão de solicitação
 */
export async function logSolicitacaoDelete(
    userId: string,
    solicitacaoId: string,
    protocolo: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Delete',
        module: 'Notifications',
        description: `Solicitação excluída: Protocolo ${protocolo}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            solicitacaoId,
            protocolo,
        },
    });
}

/**
 * Registra auditoria de login
 */
export async function logLogin(
    userId: string,
    email: string,
    success: boolean,
    ipAddress?: string,
    error?: string
): Promise<void> {
    await logAudit({
        userId: success ? userId : 'system', // Se falhou, pode não ter userId válido
        actionType: 'Read', // Login é uma ação de leitura/acesso
        module: 'Users', // Usando Users como módulo para autenticação
        description: success 
            ? `Login realizado com sucesso: ${email}`
            : `Tentativa de login falhou: ${email}${error ? ` - ${error}` : ''}`,
        ipAddress,
        status: success ? 'Sucesso' : 'Falha',
        metadata: {
            email: email.substring(0, 2) + '***', // Mascara email parcialmente
            success,
            ...(error && { error }),
        },
    });
}

/**
 * Registra auditoria de logout
 */
export async function logLogout(
    userId: string,
    email: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType: 'Read',
        module: 'Users', // Usando Users como módulo para autenticação
        description: `Logout realizado: ${email}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            email: email.substring(0, 2) + '***',
        },
    });
}

/**
 * Registra auditoria de operação de usuário
 */
export async function logUserOperation(
    userId: string,
    actionType: ActionType,
    targetUserId: string,
    operation: string,
    details?: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType,
        module: 'Users',
        description: `Usuário ${operation}: ${targetUserId}${details ? ` - ${details}` : ''}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            targetUserId,
            operation,
            ...(details && { details }),
        },
    });
}

/**
 * Registra auditoria de operação de configuração
 */
export async function logConfigOperation(
    userId: string,
    actionType: ActionType,
    configKey: string,
    configValue?: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType,
        module: 'Configuracoes',
        description: `Configuração ${actionType.toLowerCase()}: ${configKey}${configValue ? ` = ${configValue}` : ''}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            configKey,
            ...(configValue && { configValue }),
        },
    });
}

/**
 * Registra auditoria de operação de permissão
 */
export async function logPermissionOperation(
    userId: string,
    actionType: ActionType,
    targetUserId: string,
    module: string,
    action: string,
    ipAddress?: string
): Promise<void> {
    await logAudit({
        userId,
        actionType,
        module: Module.Permission,
        description: `Permissão ${actionType.toLowerCase()}: Usuário ${targetUserId} - ${module}/${action}`,
        ipAddress,
        status: 'Sucesso',
        metadata: {
            targetUserId,
            module,
            action,
        },
    });
}

