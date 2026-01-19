import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { UserDataCheckService } from "../services/userDataCheck.service";
import { NotificationService } from "../services/notification.service";

export class NotificationController {
    constructor(
        private authService: AuthorizationService,
        private notificationService: NotificationService,
        private userDataCheckService: UserDataCheckService
    ) { }

    /**
     * Cria uma notificação para um usuário ou para todos e envia via websocket.
     */
    async createNotification(req: Request, res: Response): Promise<void> {
        try {
            const { userId, title, message, type } = req.body;
            const adminId: string | null = this.authService.getLoggedUserId(req);

            if (!adminId) {
                res.status(401).json({ message: "Administrador não autenticado", success: false });
                return;
            }

            if (!title || !message) {
                res.status(400).json({ message: "Título e mensagem são obrigatórios", success: false });
                return;
            }

            const notification = await this.notificationService.sendNotification({
                userId,
                title,
                message,
                type,
            });

            res.status(201).json({ message: "Notificação criada com sucesso", success: true, notification });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao criar notificações:", error);
            return;
        }
    }

    /**
     * Envia uma notificação broadcast para todos os usuários conectados (via WebSocket + banco).
     */
    async broadcastNotification(req: Request, res: Response): Promise<void> {
        try {
            const adminId: string | null = this.authService.getLoggedUserId(req);
            if (!adminId) {
                res.status(401).json({ message: "Administrador não autenticado", success: false });
                return;
            }

            const { message, title = "Aviso da plataforma", type }: { message?: string; title?: string; type?: string } = req.body;
            if (!message) {
                res.status(400).json({ message: "Mensagem é obrigatória", success: false });
                return;
            }

            // Cria no banco e envia via WebSocket
            const notification = await this.notificationService.sendNotification({
                title,
                message,
                type,
            });

            res.status(200).json({ message: "Notificação enviada para todos os usuários conectados", success: true, notification });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao enviar notificação broadcast:", error);
            return;
        }
    }

    /**
     * Marca uma notificação como lida pelo usuário.
     */
    async markNotificationAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | null = this.authService.getLoggedUserId(req);
            const { notificationId }: { notificationId?: string } = req.body;

            if (!userId) {
                res.status(401).json({ message: "Usuário não autenticado", success: false });
                return;
            }
            if (!notificationId) {
                res.status(400).json({ message: "Notification ID é obrigatório", success: false });
                return;
            }

            const notificationStatusUpdated = await this.notificationService.markNotificationAsRead(userId, notificationId);
            res.status(200).json({ message: "Notificação marcada como lida", success: true, notificationStatusUpdated });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao marcar notificação como lida", error);
            return;
        }
    }

    /**
     * Marca todas as notificações como lidas para o usuário autenticado.
     */
    async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | null = this.authService.getLoggedUserId(req);
            if (!userId) {
                res.status(401).json({ message: "Usuário não autenticado", success: false });
                return;
            }

            await this.notificationService.markAllNotificationsAsRead(userId);
            res.status(200).json({ message: "Todas as notificações marcadas como lidas", success: true });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao marcar todas notificações como lidas", error);
            return;
        }
    }

    /**
     * Verifica os dados dos usuários e envia notificações se necessário.
     */
    async checkUserData(req: Request, res: Response): Promise<void> {
        try {
            await this.userDataCheckService.checkAndNotifyUsers();
            res.status(200).json({ message: "Verificação concluída e notificações enviadas", success: true });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao verificar dados dos usuários:", error);
            return;
        }
    }

    /**
     * Recupera todas as notificações não lidas do usuário autenticado.
     */
    async fetchAllNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | null = this.authService.getLoggedUserId(req);
            if (!userId) {
                res.status(401).json({ message: "Usuário não autenticado", success: false });
                return;
            }

            console.log(`Buscando notificações para o usuário: ${userId}`);
            const notifications = await this.notificationService.findUnreadNotifications(userId);
            console.log(`Notificações encontradas: ${JSON.stringify(notifications, null, 2)}`);
            res.status(200).json({ notifications, success: true });
            return;
        } catch (error: any) {
            console.error("Erro ao listar notificações:", error);
            this.handleError(res, "Erro ao listar notificações:", error);
            return;
        }
    }

    /**
     * Exclui uma notificação pelo ID.
     */
    async deleteNotification(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | null = this.authService.getLoggedUserId(req);
            const { notificationId } = req.params as { notificationId?: string };

            if (!userId) {
                res.status(401).json({ message: "Usuário não autenticado", success: false });
                return;
            }
            if (!notificationId) {
                res.status(400).json({ message: "Notification ID é obrigatório", success: false });
                return;
            }

            await this.notificationService.deleteNotificationById(userId, notificationId);
            res.status(200).json({ message: "Notificação excluída com sucesso", success: true });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao excluir notificação:", error);
            return;
        }
    }

    /**
     * Exclui todas as notificações do usuário autenticado.
     */
    async deleteAllNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId: string | null = this.authService.getLoggedUserId(req);
            if (!userId) {
                res.status(401).json({ message: "Usuário não autenticado", success: false });
                return;
            }

            await this.notificationService.deleteAllNotificationsForUser(userId);
            res.status(200).json({ message: "Todas as notificações excluídas com sucesso", success: true });
            return;
        } catch (error: any) {
            this.handleError(res, "Erro ao excluir todas as notificações:", error);
            return;
        }
    }

    private handleError(res: Response, logMessage: string, error: unknown): void {
        console.error(logMessage, error);
        res.status(500).json({ message: logMessage, error: (error as Error).message });
    }
}
