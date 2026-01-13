import prisma from "../prisma/client";
import { INotificationRepository } from "../interfaces/notification.repository.interface";
import { NotificationData, NotificationStatusData } from "../types/notification.types";

export class NotificationRepository implements INotificationRepository {
    async sendNotification(data: any): Promise<any> {
        const result = await prisma.notification.create({
            data: {
                Title: data.title,
                Message: data.message,
                IsForAllUsers: data.isForAllUsers ?? false,
            },
        });
        return result;
    }

    async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
        await prisma.notificationStatus.updateMany({
            where: {
                UserId: userId,
                NotificationId: notificationId,
                Status: "NaoLida"
            },
            data: {
                Status: "Lida"
            }
        });
    }

    async countUnread(userId: string): Promise<number> {
        return prisma.notificationStatus.count({
            where: { UserId: userId, Status: "NaoLida" },
        });
    }

    async createNotification(data: NotificationData): Promise<NotificationData> {
        const result = await prisma.notification.create({
            data: {
                Title: data.title,
                Message: data.message,
                IsForAllUsers: data.isForAllUsers ?? false,
            },
        });
        return {
            title: result.Title,
            message: result.Message,
            isForAllUsers: result.IsForAllUsers,
            // adicione outros campos se necessário
        };
    }

    async createNotificationStatus(data: NotificationStatusData): Promise<NotificationStatusData> {
        const result = await prisma.notificationStatus.create({
            data: {
                UserId: data.userId,
                NotificationId: data.notificationId,
                Status: data.status,
            },
        });
        return {
            userId: result.UserId,
            notificationId: result.NotificationId,
            status: result.Status as "Lida" | "NaoLida",
        };
    }

    async createManyNotificationStatus(data: NotificationStatusData[]): Promise<NotificationStatusData[]> {
        await prisma.notificationStatus.createMany({
            data: data.map(d => ({
                UserId: d.userId,
                NotificationId: d.notificationId,
                Status: d.status,
            })),
        });
        // Retorne um array vazio ou os dados inseridos, conforme a interface espera
        return data;
    }

    async findActiveUsers() {
        return prisma.user.findMany({
            where: { Status: "Ativo", Role: { not: "Admin" } },
        });
    }

    async findUserById(id: string) {
        return prisma.user.findUnique({ where: { Id: id } });
    }

    async findNotificationStatus(userId: string, notificationId: string) {
        return prisma.notificationStatus.findFirst({ where: { UserId: userId, NotificationId: notificationId } });
    }

    async updateNotificationStatus(id: string, status: "unread" | "read") {
        const statusMap: Record<"unread" | "read", "NaoLida" | "Lida"> = {
            unread: "NaoLida",
            read: "Lida"
        };
        return prisma.notificationStatus.update({ where: { Id: id }, data: { Status: statusMap[status] } });
    }

    async findUnreadNotifications(userId: string) {
        return prisma.notificationStatus.findMany({
            where: { UserId: userId, Status: "NaoLida" },
            include: {
                Notification: {
                    select: { Title: true, Message: true, IsForAllUsers: true },
                },
            },
            orderBy: { CreatedAt: 'desc' },
        });
    }

    async markAllNotificationsAsRead(userId: string): Promise<any> {
        return prisma.notificationStatus.updateMany({
            where: {
                UserId: userId,
                Status: "NaoLida"
            },
            data: {
                Status: "Lida"
            }
        });
    }

    async deleteNotificationById(userId: string, notificationId: string): Promise<void> {
        await prisma.notificationStatus.updateMany({
            where: {
                UserId: userId,
                NotificationId: notificationId,
                Status: "NaoLida"
            },
            data: {
                Status: "Lida"
            }
        });
    }

    async deleteAllNotificationsForUser(userId: string): Promise<void> {
        await prisma.notificationStatus.updateMany({
            where: {
                UserId: userId,
                Status: "NaoLida"
            },
            data: {
                Status: "Lida"
            }
        });
    }
}
