import axios from "axios";

/**
 * Tipo para dados de eventos de consulta
 */
export interface ConsultationEventData {
    event?: string;
    consultationId?: string;
    message?: string;
    missingRole?: string;
    missingName?: string;
    status?: string;
    reason?: string;
    autoCancelled?: boolean;
    autoEnded?: boolean;
    tokensReady?: boolean;
    countdown?: number;
    minutesRemaining?: number;
    timestamp?: string;
}

const isProduction = process.env.NODE_ENV === "production";
const isPre = process.env.NODE_ENV === "pre" || process.env.NODE_ENV === "staging";

export class WebSocketNotificationService {
    private socketUrl: string;
    private requestQueue: Array<() => Promise<void>>;
    private processingQueue: boolean;
    private readonly MAX_CONCURRENT_REQUESTS = 5;
    private activeRequests: number;

    constructor() {
        // Em produção, usa ws.prd; em pré-produção, usa ws.estacaoterapia
        const defaultUrl = isProduction 
            ? "https://ws.prd.estacaoterapia.com.br"
            : "https://ws.estacaoterapia.com.br";
        this.socketUrl = process.env.SOCKET_URL || defaultUrl;
        this.requestQueue = [];
        this.processingQueue = false;
        this.activeRequests = 0;
        
        if (!isProduction) {
            console.log(`🔌 [WebSocketNotificationService] Socket URL configurada: ${this.socketUrl}`);
        }
    }

    /**
     * Processa fila de requisições com limite de concorrência
     */
    private async processQueue(): Promise<void> {
        if (this.processingQueue || this.requestQueue.length === 0) return;

        this.processingQueue = true;

        while (this.requestQueue.length > 0 && this.activeRequests < this.MAX_CONCURRENT_REQUESTS) {
            const request = this.requestQueue.shift();
            if (!request) break;

            this.activeRequests++;
            request()
                .catch(err => {
                    if (!isProduction) {
                        console.error("[WebSocketNotificationService] Erro na requisição:", err);
                    }
                })
                .finally(() => {
                    this.activeRequests--;
                    // Processa próximo item da fila
                    if (this.requestQueue.length > 0) {
                        setImmediate(() => this.processQueue());
                    }
                });
        }

        this.processingQueue = false;
    }

    /**
     * Adiciona requisição à fila
     */
    private enqueueRequest(request: () => Promise<void>): void {
        this.requestQueue.push(request);
        this.processQueue();
    }

    /**
     * Emite uma notificação para todos os usuários conectados
     */
    async emitToAll(event: string, data: unknown): Promise<void> {
        return new Promise((resolve) => {
            this.enqueueRequest(async () => {
                try {
                    const payload = {
                        event,
                        broadcast: true,
                        data,
                    };

                    if (!isProduction) {
                        console.log("📤 [WebSocket] Broadcast:", event);
                    }

                    await axios.post(`${this.socketUrl}/emit`, payload, {
                        timeout: 5000, // Timeout de 5s
                    });

                    if (!isProduction) {
                        console.log("✅ [WebSocket] Broadcast enviado:", event);
                    }
                } catch (error: unknown) {
                    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
                    if (!isProduction) {
                        console.error("❌ [WebSocket] Erro no broadcast:", err.message);
                    }
                } finally {
                    resolve();
                }
            });
        });
    }

    /**
     * Emite uma notificação apenas para um usuário específico
     */
    async emitToUser(userId: string, event: string, data: unknown): Promise<void> {
        return new Promise((resolve) => {
            this.enqueueRequest(async () => {
                try {
                    const payload = {
                        event,
                        toUserId: userId,
                        broadcast: false,
                        data,
                    };

                    if (!isProduction) {
                        console.log(`📤 [WebSocket] ${event} → ${userId}`);
                    }

                    await axios.post(`${this.socketUrl}/emit`, payload, {
                        timeout: 5000, // Timeout de 5s
                    });

                    if (!isProduction) {
                        console.log(`✅ [WebSocket] Notificação enviada: ${userId}:${event}`);
                    }
                } catch (error: unknown) {
                    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
                    if (!isProduction) {
                        console.error(`❌ [WebSocket] Erro ao enviar para ${userId}:`, err.message);
                    }
                } finally {
                    resolve();
                }
            });
        });
    }

    /**
     * Atualiza contador de notificações não lidas
     */
    async emitUnreadCount(userId: string, count: number): Promise<void> {
        return new Promise((resolve) => {
            this.enqueueRequest(async () => {
                try {
                    const payload = {
                        event: "notification_counter_update",
                        toUserId: userId,
                        broadcast: false,
                        data: { unreadCount: count },
                    };

                    if (!isProduction) {
                        console.log(`📤 [WebSocket] Contador → ${userId}: ${count}`);
                    }

                    await axios.post(`${this.socketUrl}/emit`, payload, {
                        timeout: 5000,
                    });

                    if (!isProduction) {
                        console.log(`✅ [WebSocket] Contador enviado: ${userId}:${count}`);
                    }
                } catch (error: unknown) {
                    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
                    if (!isProduction) {
                        console.error(`❌ [WebSocket] Erro ao enviar contador para ${userId}:`, err.message);
                    }
                } finally {
                    resolve();
                }
            });
        });
    }

    /**
     * Emite uma notificação para eventos de consulta (broadcast para canal de consulta)
     */
    async emitConsultation(channel: string, data: ConsultationEventData): Promise<void> {
        return new Promise((resolve) => {
            this.enqueueRequest(async () => {
                try {
                    const payload = {
                        event: channel,
                        broadcast: true,
                        data,
                    };

                    if (!isProduction) {
                        console.log(`📤 [WebSocket] Consulta: ${channel}`);
                    }

                    await axios.post(`${this.socketUrl}/emit`, payload, {
                        timeout: 5000,
                    });

                    if (!isProduction) {
                        console.log(`✅ [WebSocket] Evento de consulta enviado: ${channel}`);
                    }
                } catch (error: unknown) {
                    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
                    if (!isProduction) {
                        console.error(`❌ [WebSocket] Erro ao enviar evento de consulta ${channel}:`, err.message);
                    }
                } finally {
                    resolve();
                }
            });
        });
    }
}