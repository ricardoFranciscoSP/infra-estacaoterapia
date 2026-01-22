export interface TokenGenerationJobPayload {
    reservaSessaoId: string;
    consultaId: string;
    scheduledAt: string | null;
    source: 'cron';
    enqueuedAt: string;
}
