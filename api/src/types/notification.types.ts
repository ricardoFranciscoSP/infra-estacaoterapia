export type NotificationData = {
    /**
     * ID do usuário que receberá a notificação (opcional)
     * - Se não informado, será uma notificação global.
     */
    userId?: string;

    /** Título da notificação */
    title: string;

    /** Mensagem da notificação */
    message: string;

    /** Tipo (info, warning, error, etc) */
    type?: string;

    /** Indica se é para todos os usuários */
    isForAllUsers?: boolean;
};

export type NotificationStatusData = {
    userId: string;
    notificationId: string;
    status: "Lida" | "NaoLida";
    tipo?: string;
};

/**
 * Representa o resultado completo retornado após criar ou buscar notificações.
 */
export type NotificationResult = {
    Id: string;
    Title: string;
    Message: string;
    IsForAllUsers: boolean;
    CreatedAt?: Date;
    UpdatedAt?: Date;
    NotificationStatus?: {
        Id: string;
        UserId: string;
        Status: "Lida" | "NaoLida";
        CreatedAt: Date;
    }[];
};
