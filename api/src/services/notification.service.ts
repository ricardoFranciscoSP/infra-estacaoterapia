import { INotificationRepository } from "../interfaces/notification.repository.interface";
import prisma from "../prisma/client";
import { WebSocketNotificationService } from "./websocketNotification.service";

interface NotificationInput {
    userId?: string; // se vazio → notificação para todos
    title: string;
    message: string;
    type?: string;
}

export class NotificationService implements INotificationRepository {
    private wsService: WebSocketNotificationService;

    constructor(wsService: WebSocketNotificationService) {
        this.wsService = wsService;
    }

    /**
     * Envia e grava uma notificação
     */
    async sendNotification(data: NotificationInput) {
        console.log("🔔 [NotificationService] Iniciando envio de notificação:");
        console.log("   Input data:", JSON.stringify(data, null, 2));

        const isForAll = !data.userId;
        console.log("   Tipo:", isForAll ? "BROADCAST (todos)" : "INDIVIDUAL");

        // Cria a notificação principal
        const notification = await prisma.notification.create({
            data: {
                Title: data.title,
                Message: data.message,
                Type: data.type || "info",
                IsForAllUsers: isForAll,
            },
        });

        console.log("✅ [NotificationService] Notificação criada no banco:", notification.Id);

        if (isForAll) {
            // 🔔 PRIMEIRO: Emite via WebSocket IMEDIATAMENTE para todos conectados (sem esperar criação de status)
            const wsPayload = {
                Id: notification.Id,
                Title: data.title,
                Message: data.message,
                Type: data.type || "info",
                CreatedAt: new Date(),
                IsForAllUsers: true,
            };
            console.log("🚀 [NotificationService] Enviando via WebSocket para TODOS (TEMPO REAL):");
            console.log("   Payload:", JSON.stringify(wsPayload, null, 2));

            // Emite socket SEM await para não bloquear - processa em paralelo
            this.wsService.emitToAll("notification", wsPayload).catch((err) => {
                console.error("❌ [NotificationService] Erro ao emitir socket (não bloqueia):", err);
            });

            // Cria status no banco em paralelo (não bloqueia o socket)
            prisma.user.findMany({
                where: { Status: "Ativo" },
                select: { Id: true },
            }).then((users) => {
                console.log(`📊 [NotificationService] Usuários ativos encontrados: ${users.length}`);
                const statuses = users.map((u: { Id: string }) => ({
                    UserId: u.Id,
                    NotificationId: notification.Id,
                    Status: "NaoLida",
                }));
                return prisma.notificationStatus.createMany({ data: statuses });
            }).then(() => {
                console.log(`✅ [NotificationService] Status criados no banco`);
            }).catch((err) => {
                console.error("❌ [NotificationService] Erro ao criar status (não bloqueia socket):", err);
            });
        } else {
            // Apenas para um usuário
            // 🔔 PRIMEIRO: Emite via WebSocket IMEDIATAMENTE (sem esperar criação de status)
            const wsPayload = {
                Id: notification.Id,
                Title: data.title,
                Message: data.message,
                Type: data.type || "info",
                CreatedAt: new Date(),
                IsForAllUsers: false,
            };
            console.log("🚀 [NotificationService] Enviando via WebSocket para usuário (TEMPO REAL):");
            console.log("   UserId:", data.userId);
            console.log("   Payload:", JSON.stringify(wsPayload, null, 2));

            // Emite socket SEM await para não bloquear - processa em paralelo
            this.wsService.emitToUser(data.userId!, "notification", wsPayload).catch((err) => {
                console.error("❌ [NotificationService] Erro ao emitir socket (não bloqueia):", err);
            });

            // Cria status e atualiza contador em paralelo (não bloqueia o socket)
            Promise.all([
                prisma.notificationStatus.create({
                    data: {
                        UserId: data.userId!,
                        NotificationId: notification.Id,
                        Status: "NaoLida",
                    },
                }),
                this.countUnread(data.userId!)
            ]).then(([status, unreadCount]) => {
                console.log(`✅ [NotificationService] Status criado para usuário: ${data.userId}`);
                // Atualiza contador via socket
                return this.wsService.emitUnreadCount(data.userId!, unreadCount);
            }).then(() => {
                console.log(`✅ [NotificationService] Contador atualizado`);
            }).catch((err) => {
                console.error("❌ [NotificationService] Erro ao criar status/contador (não bloqueia socket):", err);
            });
        }

        console.log("🎉 [NotificationService] Notificação enviada com sucesso!");
        return notification;
    }

    /**
     * Atualiza o status da notificação
     */
    async markNotificationAsRead(userId: string, notificationId: string) {
        await prisma.notificationStatus.updateMany({
            where: {
                UserId: userId,
                NotificationId: notificationId,
                Status: "NaoLida",
            },
            data: { Status: "Lida" },
        });

        // Atualiza o contador do sino em tempo real
        const unreadCount = await this.countUnread(userId);
        await this.wsService.emitUnreadCount(userId, unreadCount);
    }

    /**
     * Marca todas como lidas
     */
    async markAllNotificationsAsRead(userId: string) {
        await prisma.notificationStatus.updateMany({
            where: { UserId: userId, Status: "NaoLida" },
            data: { Status: "Lida" },
        });

        const unreadCount = await this.countUnread(userId);
        await this.wsService.emitUnreadCount(userId, unreadCount);
    }


    /**
     * Conta notificações não lidas
     */
    async countUnread(userId: string) {
        return prisma.notificationStatus.count({
            where: { UserId: userId, Status: "NaoLida" },
        });
    }

    /**
     * Lista todas as notificações não lidas do usuário
     */
    async findUnreadNotifications(userId: string) {
        const notificationStatuses = await prisma.notificationStatus.findMany({
            where: {
                UserId: userId,
                Status: "NaoLida",
            },
            include: {
                Notification: true,
            },
            orderBy: {
                CreatedAt: "desc",
            },
        });

        return notificationStatuses.map((status: { Notification: { Id: string; Title: string; Message: string; IsForAllUsers: boolean }; CreatedAt: Date }) => ({
            id: status.Notification.Id,
            title: status.Notification.Title,
            message: status.Notification.Message,
            type: "info",
            isForAllUsers: status.Notification.IsForAllUsers,
            createdAt: status.CreatedAt,
        }));
    }

    /**
     * Exclui uma notificação específica do usuário
     */
    async deleteNotificationById(userId: string, notificationId: string) {
        await prisma.notificationStatus.deleteMany({
            where: {
                UserId: userId,
                NotificationId: notificationId,
            },
        });
    }

    /**
     * Exclui todas as notificações do usuário
     */
    async deleteAllNotificationsForUser(userId: string) {
        await prisma.notificationStatus.deleteMany({
            where: {
                UserId: userId,
            },
        });
    }

    /**
     * Agenda uma notificação para envio futuro
     */
    async scheduleNotification(data: NotificationInput & { scheduledAt: Date, referenceId?: string }) {
        // Cria a notificação agendada no banco
        const notification = await prisma.notification.create({
            data: {
                Title: data.title,
                Message: data.message,
                Type: data.type || "info",
                IsForAllUsers: false,
                // AgendadaPara: data.scheduledAt, // use este campo se existir no seu modelo
                // ReferenceId: data.referenceId, // use este campo se existir no seu modelo
            },
        });

        await prisma.notificationStatus.create({
            data: {
                UserId: data.userId!,
                NotificationId: notification.Id,
                Status: "NaoLida",
            },
        });

        // Não envia via WebSocket agora, apenas salva para processamento futuro
        console.log(`⏰ [NotificationService] Notificação agendada para ${data.scheduledAt}:`, notification.Id);

        return notification;
    }
}
