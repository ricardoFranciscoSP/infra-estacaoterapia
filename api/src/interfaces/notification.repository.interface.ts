export interface INotificationRepository {
    /**
     * Envia e grava uma nova notificação (para um usuário ou para todos)
     */
    sendNotification(data: any): Promise<any>;

    /**
     * Marca uma notificação específica como lida
     */
    markNotificationAsRead(userId: string, notificationId: string): Promise<void>;

    /**
     * Marca todas as notificações como lidas para um usuário
     */
    markAllNotificationsAsRead(userId: string): Promise<void>;

    /**
     * Conta quantas notificações não lidas o usuário possui
     */
    countUnread(userId: string): Promise<number>;

    /**
     * Lista todas as notificações não lidas do usuário
     */
    findUnreadNotifications(userId: string): Promise<any[]>;

    /**
     * Exclui uma notificação específica do usuário
     */
    deleteNotificationById(userId: string, notificationId: string): Promise<void>;

    /**
     * Exclui todas as notificações do usuário
     */
    deleteAllNotificationsForUser(userId: string): Promise<void>;
}
