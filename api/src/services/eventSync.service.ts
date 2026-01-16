/**
 * Event Sync Service
 * Sincroniza eventos entre API e Socket.io via Redis Pub/Sub
 * Garante que notificações de jobs chegam aos clientes em tempo real
 */

import { getIORedisClient, waitForIORedisReady, getBullMQConnectionOptions } from '../config/redis.config';
import IORedis, { Redis } from 'ioredis';

// Tipos para eventos
type EventHandler = (data: Record<string, unknown>) => Promise<void>;

interface NotificationData {
    [key: string]: unknown;
}

interface ConsultationEventData {
    [key: string]: unknown;
}

export class EventSyncService {
    private pubClient: Redis | null = null;
    private subClient: Redis | null = null;
    private eventHandlers: Map<string, EventHandler> = new Map();
    private isSubscribed = false;
    private initializationPromise: Promise<void> | null = null;
    private waitingForReadyPromise: Promise<void> | null = null; // Evita múltiplas esperas simultâneas

    constructor() {
        this.pubClient = getIORedisClient();
        // Inicialização assíncrona dos clientes será feita quando necessário
        // ou quando initialize() for chamado explicitamente
    }

    /**
     * Inicializa os clientes Redis (pub e sub)
     * Garante que pubClient está pronto antes de criar subClient
     */
    private async ensureClientsInitialized(): Promise<void> {
        // Se já existe uma promise de inicialização, aguarda ela
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Se clientes já estão inicializados, retorna
        if (this.pubClient && this.subClient && this.subClient.status === 'ready') {
            return;
        }

        // Cria promise de inicialização
        this.initializationPromise = this.initializeClients();

        try {
            await this.initializationPromise;
        } finally {
            // Limpa a promise após completar (sucesso ou erro)
            // Mantém null se ainda está inicializando, para permitir novas tentativas em caso de erro
            if (this.initializationPromise) {
                this.initializationPromise = null;
            }
        }
    }

    /**
     * Inicializa os clientes Redis (pub e sub)
     */
    private async initializeClients(): Promise<void> {
        if (!this.pubClient) {
            this.pubClient = getIORedisClient();
            if (!this.pubClient) {
                throw new Error('Não foi possível obter pubClient Redis');
            }
        }

        try {
            // Aguarda o pubClient estar pronto
            if (this.pubClient.status !== 'ready' && this.pubClient.status !== 'connect') {
                console.log(`⏳ [EventSync] Aguardando pubClient estar pronto (status: ${this.pubClient.status})...`);
                this.pubClient = await waitForIORedisReady(15000);
            }

            // Se subClient não existe ou está fechado, cria novo
            if (!this.subClient || this.subClient.status === 'end' || this.subClient.status === 'close') {
                if (this.subClient) {
                    try {
                        this.subClient.removeAllListeners();
                        this.subClient.disconnect();
                        this.subClient.quit().catch(() => { });
                    } catch (err) {
                        // Ignora erros ao fechar
                    }
                }

                // Cria o subClient diretamente com as mesmas credenciais (não usa .duplicate())
                const redisConfig = getBullMQConnectionOptions();
                const redisPassword = process.env.REDIS_PASSWORD || undefined;

                this.subClient = new IORedis({
                    host: redisConfig.host,
                    port: redisConfig.port,
                    db: redisConfig.db,
                    password: redisPassword,
                    maxRetriesPerRequest: null,
                    connectTimeout: 30_000,
                    commandTimeout: 15_000,
                    lazyConnect: false, // Conecta imediatamente
                    keepAlive: 30000,
                    enableOfflineQueue: true,
                    enableReadyCheck: true,
                    autoResubscribe: true,
                    connectionName: 'estacao-eventsync-sub',
                    showFriendlyErrorStack: true,
                    retryStrategy: (times: number) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });

                // Aumenta limite de listeners para suportar múltiplos canais
                this.subClient.setMaxListeners(20);

                // Adiciona handlers de erro ao subClient
                this.subClient.on('error', (err) => {
                    console.error('❌ [EventSync] Erro no subClient:', err.message);
                });

                this.subClient.on('connect', () => {
                    console.log('🔌 [EventSync] subClient conectado');
                });

                this.subClient.on('close', () => {
                    console.warn('⚠️ [EventSync] subClient fechado');
                });

                this.subClient.on('reconnecting', (delay: number) => {
                    console.log(`🔄 [EventSync] subClient reconectando em ${delay}ms...`);
                });

                // Quando ficar pronto ou reconectar, resubscribe aos canais
                this.subClient.on('ready', async () => {
                    console.log('✅ [EventSync] subClient pronto');

                    if (this.eventHandlers.size > 0 && this.subClient) {
                        console.log('🔄 [EventSync] Resubscribindo aos canais após conexão...');
                        try {
                            // Aguarda um pouco para garantir que a conexão está estável
                            await new Promise(resolve => setTimeout(resolve, 500));

                            // Verifica se ainda está pronto
                            if (this.subClient && (this.subClient.status === 'ready' || this.subClient.status === 'connect')) {
                                for (const channel of this.eventHandlers.keys()) {
                                    try {
                                        await this.subClient.subscribe(channel);
                                        console.log(`✅ [EventSync] Resubscribed ao canal '${channel}'`);
                                    } catch (err) {
                                        console.error(`❌ [EventSync] Erro ao resubscribir ao canal '${channel}':`, (err as Error)?.message);
                                    }
                                }
                                console.log('✅ [EventSync] Resubscribed com sucesso');
                            } else {
                                console.warn('⚠️ [EventSync] subClient não está pronto para resubscribe (status:', this.subClient?.status, ')');
                            }
                        } catch (err) {
                            console.error('❌ [EventSync] Erro ao resubscribir:', (err as Error)?.message);
                        }
                    }
                });
            }

            // Aumenta limite de listeners do pubClient
            this.pubClient.setMaxListeners(20);

            // Adiciona handlers ao pubClient para garantir
            this.pubClient.on('error', (err) => {
                console.error('❌ [EventSync] Erro no pubClient:', err.message);
            });

            this.pubClient.on('reconnecting', (delay: number) => {
                console.log(`🔄 [EventSync] pubClient reconectando em ${delay}ms...`);
            });
        } catch (err) {
            console.error('❌ [EventSync] Erro ao inicializar clientes Redis:', (err as Error)?.message);
            throw err;
        }
    }

    /**
     * Publica um evento que será recebido pelos subscribers (Socket.io)
     * Usado pelos jobs (BullMQ) para notificar o Socket Server
     */
    async publishEvent(channel: string, data: Record<string, unknown>): Promise<void> {
        if (!this.pubClient) {
            console.warn('⚠️ [EventSync] Redis não disponível para publicar evento:', channel);
            return;
        }

        try {
            const payload = JSON.stringify({
                timestamp: new Date().toISOString(),
                channel,
                data
            });

            const result = await this.pubClient.publish(channel, payload);
            console.log(`📤 [EventSync] Evento publicado no canal '${channel}': ${result} subscribers receberam`);
        } catch (error) {
            console.error(`❌ [EventSync] Erro ao publicar evento no canal '${channel}':`, error);
        }
    }

    /**
     * Aguarda o subClient estar pronto antes de usar
     * Reutiliza a mesma promise se múltiplas chamadas simultâneas
     */
    private async waitForSubClientReady(timeoutMs = 15000): Promise<void> {
        // Se já existe uma promise aguardando, reutiliza ela
        if (this.waitingForReadyPromise) {
            return this.waitingForReadyPromise;
        }

        if (!this.subClient) {
            throw new Error('subClient não está disponível');
        }

        // Se já está pronto, retorna imediatamente
        if (this.subClient.status === 'ready' || this.subClient.status === 'connect') {
            return;
        }

        // Cria promise de espera
        this.waitingForReadyPromise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout aguardando subClient conectar (status: ${this.subClient?.status})`));
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timeout);
                if (this.subClient) {
                    this.subClient.off('ready', onReady);
                    this.subClient.off('error', onError);
                    this.subClient.off('close', onClose);
                }
            };

            const onReady = () => {
                cleanup();
                if (this.subClient && (this.subClient.status === 'ready' || this.subClient.status === 'connect')) {
                    resolve();
                } else {
                    reject(new Error(`subClient não está pronto após evento ready (status: ${this.subClient?.status})`));
                }
            };

            const onError = (err: Error) => {
                cleanup();
                reject(err);
            };

            const onClose = () => {
                cleanup();
                reject(new Error('subClient foi fechado durante conexão'));
            };

            if (this.subClient) {
                if (this.subClient.status === 'ready' || this.subClient.status === 'connect') {
                    cleanup();
                    resolve();
                } else {
                    this.subClient.once('ready', onReady);
                    this.subClient.once('error', onError);
                    this.subClient.once('close', onClose);
                }
            } else {
                cleanup();
                reject(new Error('subClient não está disponível'));
            }
        });

        try {
            await this.waitingForReadyPromise;
        } finally {
            // Limpa a promise após completar
            this.waitingForReadyPromise = null;
        }
    }

    /**
     * Registra um handler para ser executado quando um evento é recebido
     */
    async subscribe(channel: string, handler: EventHandler): Promise<void> {
        try {
            // Garante que os clientes estão inicializados antes de usar
            await this.ensureClientsInitialized();

            if (!this.subClient) {
                console.warn('⚠️ [EventSync] Redis não disponível para subscribing ao canal:', channel);
                return;
            }

            // Aguarda conexão estar pronta antes de fazer subscribe
            await this.waitForSubClientReady();

            this.eventHandlers.set(channel, handler);

            if (!this.isSubscribed) {
                // Setup listener uma única vez
                this.subClient.on('message', async (chan, message) => {
                    try {
                        const payload = JSON.parse(message) as { timestamp: string; channel: string; data: Record<string, unknown> };
                        const handler = this.eventHandlers.get(chan);

                        if (handler) {
                            console.log(`📥 [EventSync] Evento recebido no canal '${chan}':`, payload.data);
                            await handler(payload.data);
                        }
                    } catch (error) {
                        console.error(`❌ [EventSync] Erro processando evento do canal '${chan}':`, error);
                    }
                });

                this.isSubscribed = true;
            }

            // Verifica novamente se está pronto antes de subscribe
            if (this.subClient.status !== 'ready' && this.subClient.status !== 'connect') {
                throw new Error(`subClient não está pronto para subscribe (status: ${this.subClient.status})`);
            }

            await this.subClient.subscribe(channel);
            console.log(`✅ [EventSync] Subscribed ao canal '${channel}'`);
        } catch (error) {
            const errorMsg = (error as Error)?.message || String(error);
            console.error(`❌ [EventSync] Erro ao subscribir ao canal '${channel}':`, errorMsg);

            // Se erro foi de conexão fechada, tenta reconectar
            if (errorMsg.includes('Connection is closed') || errorMsg.includes('closed')) {
                console.log(`🔄 [EventSync] Tentando reconectar subClient para canal '${channel}'...`);
                try {
                    // Aguarda reconexão
                    await this.waitForSubClientReady(10000);
                    // Tenta subscribe novamente
                    if (this.subClient && (this.subClient.status === 'ready' || this.subClient.status === 'connect')) {
                        await this.subClient.subscribe(channel);
                        console.log(`✅ [EventSync] Subscribed ao canal '${channel}' após reconexão`);
                    }
                } catch (retryError) {
                    console.error(`❌ [EventSync] Falha ao reconectar para canal '${channel}':`, (retryError as Error)?.message);
                }
            }
        }
    }

    /**
     * Desinscrever de um canal
     */
    async unsubscribe(channel: string): Promise<void> {
        if (!this.subClient) return;

        try {
            this.eventHandlers.delete(channel);
            await this.subClient.unsubscribe(channel);
            console.log(`✅ [EventSync] Unsubscribed do canal '${channel}'`);
        } catch (error) {
            console.error(`❌ [EventSync] Erro ao desinscrever do canal '${channel}':`, error);
        }
    }

    /**
     * Fecha conexões de forma segura
     */
    async close(): Promise<void> {
        try {
            if (this.subClient) {
                await this.subClient.quit();
                console.log('✅ [EventSync] Sub client fechado');
            }
            // pubClient é gerenciado globalmente, não fechamos aqui
        } catch (error) {
            console.error('❌ [EventSync] Erro ao fechar:', error);
        }
    }

    // =========== HELPERS PARA EVENTOS COMUNS ===========

    /**
     * Notifica atualização da próxima consulta para um usuário
     */
    async notifyProximaConsultaUpdate(userId: string, motivo: string): Promise<void> {
        await this.publishEvent('proximaConsultaAtualizada', {
            userId,
            motivo,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica nova notificação para um usuário
     */
    async notifyNewNotification(userId: string, notificationData: NotificationData): Promise<void> {
        await this.publishEvent('notification:new', {
            userId,
            ...notificationData,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica mudança de status da consulta
     */
    async notifyConsultationStatusChange(consultationId: string, status: string, data?: ConsultationEventData): Promise<void> {
        await this.publishEvent('consultation:status-changed', {
            consultationId,
            status,
            timestamp: new Date().toISOString(),
            ...(data || {})
        });
    }

    /**
     * Notifica início de consulta
     */
    async notifyConsultationStart(consultationId: string, tokensReady: boolean): Promise<void> {
        await this.publishEvent('consultation:started', {
            consultationId,
            tokensReady,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica aviso de inatividade
     */
    async notifyInactivityWarning(consultationId: string, message: string, missingRole: string): Promise<void> {
        await this.publishEvent('consultation:inactivity-warning', {
            consultationId,
            message,
            missingRole,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica cancelamento por inatividade
     */
    async notifyInactivityCancellation(consultationId: string, message: string, missingRole: string): Promise<void> {
        await this.publishEvent('consultation:inactivity', {
            consultationId,
            message,
            missingRole,
            status: 'Cancelado',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica aviso de término (15 minutos antes do fim)
     */
    async notifyEndingWarning(consultationId: string): Promise<void> {
        await this.publishEvent('consulta:aviso-15min', {
            consultationId,
            message: 'A consulta se encerra em 15 minutos',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Notifica contador de notificações não lidas
     */
    async notifyUnreadCount(userId: string, count: number): Promise<void> {
        await this.publishEvent('notification:count', {
            userId,
            count,
            timestamp: new Date().toISOString()
        });
    }
}

// Instância singleton
let instance: EventSyncService | null = null;

export function getEventSyncService(): EventSyncService {
    if (!instance) {
        instance = new EventSyncService();
    }
    return instance;
}
