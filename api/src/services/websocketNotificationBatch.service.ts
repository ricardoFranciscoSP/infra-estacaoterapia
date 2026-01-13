/**
 * Serviço otimizado de notificações WebSocket com batching
 * 
 * Reduz uso de CPU ao:
 * - Agrupar múltiplas notificações para o mesmo usuário
 * - Debounce para evitar notificações duplicadas
 * - Enviar em batch quando possível
 * - Reduzir logs em produção
 */

import { WebSocketNotificationService, type ConsultationEventData } from "./websocketNotification.service";

interface BatchedNotification {
    userId: string;
    event: string;
    data: unknown;
    timestamp: number;
}

interface BatchedConsultationEvent {
    channel: string;
    data: ConsultationEventData;
    timestamp: number;
}

class WebSocketNotificationBatchService {
    private baseService: WebSocketNotificationService;
    private userNotificationQueue: Map<string, BatchedNotification[]>;
    private consultationEventQueue: Map<string, BatchedConsultationEvent[]>;
    private batchTimer: NodeJS.Timeout | null;
    private readonly BATCH_DELAY_MS = 50; // 50ms para agrupar notificações
    private readonly MAX_BATCH_SIZE = 10; // Máximo de notificações por batch
    private readonly DEBOUNCE_WINDOW_MS = 200; // 200ms para debounce
    private lastNotificationTime: Map<string, number>; // userId -> timestamp
    private isProduction: boolean;

    constructor() {
        this.baseService = new WebSocketNotificationService();
        this.userNotificationQueue = new Map();
        this.consultationEventQueue = new Map();
        this.batchTimer = null;
        this.lastNotificationTime = new Map();
        this.isProduction = process.env.NODE_ENV === "production";
    }

    /**
     * Verifica se uma notificação é duplicada (dentro da janela de debounce)
     */
    private isDuplicate(userId: string, event: string, data: unknown): boolean {
        const key = `${userId}:${event}`;
        const lastTime = this.lastNotificationTime.get(key);
        const now = Date.now();

        if (lastTime && (now - lastTime) < this.DEBOUNCE_WINDOW_MS) {
            // Compara dados para verificar se é realmente duplicado
            const lastNotification = this.userNotificationQueue
                .get(userId)
                ?.find(n => n.event === event);
            
            if (lastNotification && this.deepEqual(lastNotification.data, data)) {
                return true;
            }
        }

        this.lastNotificationTime.set(key, now);
        return false;
    }

    /**
     * Comparação profunda de objetos (simplificada)
     */
    private deepEqual(a: unknown, b: unknown): boolean {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object' || a === null || b === null) return false;
        
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }

    /**
     * Processa fila de notificações de usuário
     */
    private async processUserNotificationQueue(): Promise<void> {
        if (this.userNotificationQueue.size === 0) return;

        const promises: Promise<void>[] = [];

        for (const [userId, notifications] of this.userNotificationQueue.entries()) {
            if (notifications.length === 0) continue;

            // Agrupa notificações por evento
            const groupedByEvent = new Map<string, BatchedNotification[]>();
            
            for (const notification of notifications) {
                if (!groupedByEvent.has(notification.event)) {
                    groupedByEvent.set(notification.event, []);
                }
                groupedByEvent.get(notification.event)!.push(notification);
            }

            // Envia notificações agrupadas
            for (const [event, eventNotifications] of groupedByEvent.entries()) {
                // Se houver múltiplas notificações do mesmo evento, envia apenas a mais recente
                // ou agrupa em um array se fizer sentido
                const latestNotification = eventNotifications[eventNotifications.length - 1];
                
                promises.push(
                    this.baseService.emitToUser(userId, event, latestNotification.data)
                        .catch(err => {
                            if (!this.isProduction) {
                                console.error(`[BatchService] Erro ao enviar notificação para ${userId}:`, err);
                            }
                        })
                );
            }
        }

        await Promise.allSettled(promises);
        this.userNotificationQueue.clear();
    }

    /**
     * Processa fila de eventos de consulta
     */
    private async processConsultationEventQueue(): Promise<void> {
        if (this.consultationEventQueue.size === 0) return;

        const promises: Promise<void>[] = [];

        for (const [channel, events] of this.consultationEventQueue.entries()) {
            if (events.length === 0) continue;

            // Envia apenas o evento mais recente para cada canal
            const latestEvent = events[events.length - 1];
            
            promises.push(
                this.baseService.emitConsultation(channel, latestEvent.data)
                    .catch(err => {
                        if (!this.isProduction) {
                            console.error(`[BatchService] Erro ao enviar evento de consulta ${channel}:`, err);
                        }
                    })
            );
        }

        await Promise.allSettled(promises);
        this.consultationEventQueue.clear();
    }

    /**
     * Agenda processamento do batch
     */
    private scheduleBatch(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(async () => {
            this.batchTimer = null;
            await Promise.all([
                this.processUserNotificationQueue(),
                this.processConsultationEventQueue()
            ]);
        }, this.BATCH_DELAY_MS);
    }

    /**
     * Emite notificação para usuário (com batching)
     */
    async emitToUser(userId: string, event: string, data: unknown): Promise<void> {
        // Verifica se é duplicado
        if (this.isDuplicate(userId, event, data)) {
            if (!this.isProduction) {
                console.log(`[BatchService] Notificação duplicada ignorada: ${userId}:${event}`);
            }
            return;
        }

        // Adiciona à fila
        if (!this.userNotificationQueue.has(userId)) {
            this.userNotificationQueue.set(userId, []);
        }

        const queue = this.userNotificationQueue.get(userId)!;
        queue.push({
            userId,
            event,
            data,
            timestamp: Date.now()
        });

        // Limita tamanho da fila
        if (queue.length > this.MAX_BATCH_SIZE) {
            queue.shift(); // Remove a mais antiga
        }

        // Agenda processamento
        this.scheduleBatch();
    }

    /**
     * Emite evento de consulta (com batching)
     */
    async emitConsultation(channel: string, data: ConsultationEventData): Promise<void> {
        // Adiciona à fila
        if (!this.consultationEventQueue.has(channel)) {
            this.consultationEventQueue.set(channel, []);
        }

        const queue = this.consultationEventQueue.get(channel)!;
        queue.push({
            channel,
            data,
            timestamp: Date.now()
        });

        // Limita tamanho da fila
        if (queue.length > this.MAX_BATCH_SIZE) {
            queue.shift(); // Remove a mais antiga
        }

        // Agenda processamento
        this.scheduleBatch();
    }

    /**
     * Emite para todos (sem batching - raro e precisa ser imediato)
     */
    async emitToAll(event: string, data: unknown): Promise<void> {
        // Processa filas pendentes primeiro
        await Promise.all([
            this.processUserNotificationQueue(),
            this.processConsultationEventQueue()
        ]);

        // Emite broadcast imediatamente
        await this.baseService.emitToAll(event, data);
    }

    /**
     * Emite contador de não lidas (sem batching - precisa ser imediato)
     */
    async emitUnreadCount(userId: string, count: number): Promise<void> {
        // Processa filas pendentes primeiro
        await this.processUserNotificationQueue();

        // Emite contador imediatamente
        await this.baseService.emitUnreadCount(userId, count);
    }

    /**
     * Força processamento imediato de todas as filas
     * Útil antes de operações críticas
     */
    async flush(): Promise<void> {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        await Promise.all([
            this.processUserNotificationQueue(),
            this.processConsultationEventQueue()
        ]);
    }
}

// Singleton para reutilizar a mesma instância
let batchServiceInstance: WebSocketNotificationBatchService | null = null;

/**
 * Obtém instância singleton do serviço de batching
 */
export function getWebSocketNotificationBatchService(): WebSocketNotificationBatchService {
    if (!batchServiceInstance) {
        batchServiceInstance = new WebSocketNotificationBatchService();
    }
    return batchServiceInstance;
}

/**
 * Exporta a classe para uso direto se necessário
 */
export { WebSocketNotificationBatchService };

