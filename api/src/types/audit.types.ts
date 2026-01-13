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