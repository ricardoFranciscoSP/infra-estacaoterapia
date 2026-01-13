import { api } from "@/lib/axios";

// Definição do tipo Notification
export interface Notification {
    Id: string;
    Title: string;
    Message: string;
    UserId?: string;
    CreatedAt: string;
    IsForAllUsers?: boolean;
    Read?: boolean;
}

export const notificationService = () => {
    return {
        addNotificationAll: (data: { title: string; message: string }) => api.post('/admin/notifications/all', data),
        addNotificationUser: (data: { userId: string; title: string; message: string }) => api.post('/admin/notifications/user', data),
        getNotificationAll: () => api.get('/admin/notifications/list'),
        getNotificationUser: (userId: string) => api.get(`/admin/notifications/user/${userId}`),
        getNotifications: () => api.get('/notification'),
        marcarNotificacaoComoLida: () => api.delete('/notification/'),
        removeNotification: (id: string) => api.delete(`/notification/${id}`),
    };
}