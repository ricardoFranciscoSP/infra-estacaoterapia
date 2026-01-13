/**
 * ⚠️ DEPRECATED - Este worker foi desativado por ser ineficiente (polling a cada 5 minutos)
 * 
 * Use em vez disso: src/workers/notification.worker.ts (event-driven via BullMQ)
 * 
 * Razão da desativação:
 * - Fazia polling ao banco a cada 5 minutos mesmo sem novas notificações
 * - Enviava notificações via WebSocket mesmo para usuários desconectados
 * - notification.worker.ts usa BullMQ (event-driven), muito mais eficiente
 * 
 * Se precisar usar novamente:
 * 1. Descomente a classe abaixo
 * 2. Certifique-se de não estar conflitando com notification.worker.ts
 * 3. Mude para event-driven se possível
 */

/*
import prisma from '../prisma/client';
import { WebSocketNotificationService } from "../services/websocketNotification.service";

export class NotificationWorker {
    private notificationService: WebSocketNotificationService;
    private interval: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = 5 * 60 * 1000; // 5 minutos

    constructor(notificationService: WebSocketNotificationService) {
        this.notificationService = notificationService;
    }

    start() {
        console.log("🚀 NotificationWorker iniciado...");
        this.interval = setInterval(() => this.processNotifications(), this.POLL_INTERVAL);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }

    private async processNotifications() {
        // Busca todos os NotificationStatus não lidos
        const pendentes = await prisma.notificationStatus.findMany({
            where: { Status: "NaoLida" },
            include: { Notification: true }
        });

        for (const status of pendentes) {
            try {
                const { UserId, Notification } = status;
                if (!Notification) continue;

                const notif = Notification;

                if (notif.IsForAllUsers) {
                    // Notificação para todos (broadcast)
                    await this.notificationService.emitToAll("notification:new", {
                        id: notif.Id,
                        title: notif.Title,
                        message: notif.Message,
                        type: "info",
                        createdAt: new Date(),
                    });
                } else {
                    // Notificação individual
                    await this.notificationService.emitToUser(UserId, "notification:new", {
                        id: notif.Id,
                        title: notif.Title,
                        message: notif.Message,
                        type: "info",
                        createdAt: new Date(),
                    });
                }

                // Marca como lida após envio
                await prisma.notificationStatus.update({
                    where: { Id: status.Id },
                    data: { Status: "Lida" }
                });
            } catch (err: any) {
                console.error("❌ Erro ao processar notificação:", err);
                // Mantém como não lida para tentar novamente
            }
        }
    }
}
*/

