import { Request, Response } from "express";

/**
 * Estrutura de um evento de auditoria
 */
export interface AuditEvent {
    eventType: string;
    userId?: string;
    paymentId?: string;
    status: string;
    message?: string;
    cardLast4?: string;
    amount?: number;
    metadata?: Record<string, any>;
}

/**
 * Interface para o controller de auditoria
 */
export interface IAuditController {
    logAudit(req: Request, res: Response): Promise<Response>;
    listAudits(req: Request, res: Response): Promise<Response>;
    getAuditById(req: Request, res: Response): Promise<Response>;
}

/**
 * Interface para o serviço de auditoria
 */
export interface IAuditService {
    logPaymentAudit(event: AuditEvent): Promise<any>;
    listAudits(): Promise<any[]>;
    getAuditById(id: string): Promise<any | null>;
}
