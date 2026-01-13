/**
 * SessionStatusService
 * Gerencia o estado da sessão no Redis
 * Estado da sessão: scheduled | active | finished
 */

import { getIORedisClient } from "../config/redis.config";

export type SessionStatus = 'scheduled' | 'active' | 'finished';

const SESSION_STATUS_PREFIX = 'session:';
const SESSION_STATUS_SUFFIX = ':status';

export class SessionStatusService {
    private redis: ReturnType<typeof getIORedisClient>;

    constructor() {
        this.redis = getIORedisClient();
    }

    /**
     * Obtém a chave Redis para o status da sessão
     */
    private getSessionStatusKey(consultationId: string): string {
        return `${SESSION_STATUS_PREFIX}${consultationId}${SESSION_STATUS_SUFFIX}`;
    }

    /**
     * Define o status da sessão no Redis
     * @param consultationId ID da consulta
     * @param status Status da sessão
     * @param ttlSeconds TTL em segundos (opcional, apenas para status 'active')
     */
    async setSessionStatus(consultationId: string, status: SessionStatus, ttlSeconds?: number): Promise<void> {
        if (!this.redis) {
            console.warn('[SessionStatusService] Redis não disponível, não é possível definir status da sessão');
            return;
        }

        const key = this.getSessionStatusKey(consultationId);
        
        try {
            if (status === 'active' && ttlSeconds) {
                // Para status 'active', define com TTL de 50 minutos (3000 segundos)
                await this.redis.setex(key, ttlSeconds, status);
                console.log(`✅ [SessionStatusService] Status da sessão ${consultationId} definido como '${status}' com TTL de ${ttlSeconds}s`);
            } else {
                // Para outros status, não define TTL (ou define TTL muito longo para 'finished')
                await this.redis.set(key, status);
                if (status === 'finished') {
                    // Define TTL de 24 horas para status 'finished' (limpeza automática)
                    await this.redis.expire(key, 24 * 60 * 60);
                }
                console.log(`✅ [SessionStatusService] Status da sessão ${consultationId} definido como '${status}'`);
            }
        } catch (error) {
            console.error(`❌ [SessionStatusService] Erro ao definir status da sessão ${consultationId}:`, error);
            throw error;
        }
    }

    /**
     * Obtém o status atual da sessão do Redis
     * @param consultationId ID da consulta
     * @returns Status da sessão ou null se não existir
     */
    async getSessionStatus(consultationId: string): Promise<SessionStatus | null> {
        if (!this.redis) {
            console.warn('[SessionStatusService] Redis não disponível, retornando null');
            return null;
        }

        const key = this.getSessionStatusKey(consultationId);
        
        try {
            const status = await this.redis.get(key);
            if (status && (status === 'scheduled' || status === 'active' || status === 'finished')) {
                return status as SessionStatus;
            }
            return null;
        } catch (error) {
            console.error(`❌ [SessionStatusService] Erro ao obter status da sessão ${consultationId}:`, error);
            return null;
        }
    }

    /**
     * Remove o status da sessão do Redis (útil para testes ou limpeza)
     */
    async deleteSessionStatus(consultationId: string): Promise<void> {
        if (!this.redis) {
            console.warn('[SessionStatusService] Redis não disponível, não é possível remover status da sessão');
            return;
        }

        const key = this.getSessionStatusKey(consultationId);
        
        try {
            await this.redis.del(key);
            console.log(`✅ [SessionStatusService] Status da sessão ${consultationId} removido`);
        } catch (error) {
            console.error(`❌ [SessionStatusService] Erro ao remover status da sessão ${consultationId}:`, error);
            throw error;
        }
    }

    /**
     * Inicializa o status da sessão como 'scheduled' quando a consulta é criada
     */
    async initializeSession(consultationId: string): Promise<void> {
        await this.setSessionStatus(consultationId, 'scheduled');
    }
}

