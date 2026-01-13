import prisma from "../prisma/client";
import { WebSocketNotificationService } from "./websocketNotification.service";
import { IUserDataCheckService } from "../interfaces/IUserDataCheckService";

export class UserDataCheckService implements IUserDataCheckService {
    private wsService: WebSocketNotificationService;

    constructor(wsService: WebSocketNotificationService) {
        this.wsService = wsService;
    }

    async checkAndNotifyUsers(): Promise<void> {
        try {
            // Busca usuários ativos que não possuem endereço e não são Admin
            const usersWithoutAddress = await prisma.user.findMany({
                where: {
                    Role: { not: "Admin" },
                    Status: 'Ativo',
                    Address: { none: {} }, // Verifica se não há registros na tabela Address
                },
            });

            for (const user of usersWithoutAddress) {
                // Cria uma notificação no banco de dados
                const notification = await prisma.notification.create({
                    data: {
                        Title: "Atualize seus dados",
                        Message: "Mantenha seus dados atualizados para uma melhor experiência.",
                        IsForAllUsers: false,
                    },
                });

                // Cria o status de notificação para o usuário
                await prisma.notificationStatus.create({
                    data: {
                        UserId: user.Id,
                        NotificationId: notification.Id,
                        Status: "unread",
                    },
                });

                // Envia a notificação em tempo real via WebSocket
                await this.wsService.emitToUser(user.Id, "notification:new", {
                    id: notification.Id,
                    title: notification.Title,
                    message: notification.Message,
                    type: "info",
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Erro ao verificar usuários e enviar notificações:", error);
        }
    }
}
