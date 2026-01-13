import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { NotificationService } from "../../services/notification.service";
import { WebSocketNotificationService } from "../../services/websocketNotification.service";

export class NotificationController {
    /**
     * Envia notificação para um único usuário (salva no banco e envia em tempo real via WebSocket)
     */
    static async sendToUser(req: Request, res: Response) {
        try {
            const { userId, message, title } = req.body;

            if (!userId || !message || !title) {
                return res.status(400).json({ error: "userId, title e message são obrigatórios" });
            }

            // Usa NotificationService para salvar no banco e enviar via WebSocket em tempo real
            const wsService = new WebSocketNotificationService();
            const notificationService = new NotificationService(wsService);
            
            const notification = await notificationService.sendNotification({
                userId,
                title,
                message,
                type: "info"
            });

            return res.status(201).json({ 
                success: true, 
                message: "Notificação enviada com sucesso",
                notification 
            });
        } catch (err: any) {
            console.error("❌ Erro ao enviar notificação:", err);
            return res.status(500).json({ error: "Erro interno ao enviar notificação" });
        }
    }

    /**
     * Envia notificação para todos os usuários (salva no banco e envia em tempo real via WebSocket)
     */
    static async sendToAll(req: Request, res: Response) {
        try {
            const { message, title } = req.body;

            if (!message || !title) {
                return res.status(400).json({ error: "title e message são obrigatórios" });
            }

            // Usa NotificationService para salvar no banco e enviar via WebSocket em tempo real
            const wsService = new WebSocketNotificationService();
            const notificationService = new NotificationService(wsService);
            
            const notification = await notificationService.sendNotification({
                title,
                message,
                type: "info"
            });

            return res.status(201).json({ 
                success: true, 
                message: "Notificação enviada para todos os usuários",
                notification 
            });
        } catch (err: any) {
            console.error("❌ Erro ao enviar notificação para todos:", err);
            return res.status(500).json({ error: "Erro interno ao enviar notificação para todos" });
        }
    }

    /**
     * Lista todas as notificações (com status)
     */
    static async list(req: Request, res: Response) {
        try {
            const notifications = await prisma.notification.findMany({
                include: { 
                    NotificationStatus: {
                        orderBy: { CreatedAt: 'desc' }
                    }
                }
            });
            // Ordena no código pelo CreatedAt do primeiro NotificationStatus (mais recente)
            const sorted = notifications.sort((a, b) => {
                const aStatuses = a.NotificationStatus || [];
                const bStatuses = b.NotificationStatus || [];
                const aDate = aStatuses[0]?.CreatedAt?.getTime() || 0;
                const bDate = bStatuses[0]?.CreatedAt?.getTime() || 0;
                return bDate - aDate;
            });
            return res.json(sorted);
        } catch (err: any) {
            console.error("❌ Erro ao listar notificações:", err);
            return res.status(500).json({ error: "Erro interno ao listar notificações" });
        }
    }
}