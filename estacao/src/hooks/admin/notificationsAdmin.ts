import { useQuery, useMutation } from '@tanstack/react-query';
import {
    getNotificationsAll,
    getNotificationsUser,
    addNotificationAll,
    addNotificationUser,
    useAdmNotificationStore
} from '@/store/admin/notificationsStore';
import type { Notification } from '@/services/notificationService';

// Interface para dados brutos de notificação
interface NotificationRaw extends Omit<Notification, 'CreatedAt'> {
    CreatedAt?: string;
}

// Hook para buscar todas as notificações
export function useAdmNotifications() {
    const query = useQuery<Notification[]>({
        queryKey: ['notificationsAll'],
        queryFn: async () => {
            await getNotificationsAll();
            const notificationsRaw = useAdmNotificationStore.getState().notificationsAll ?? [];
            // Garantir que createdAt sempre seja string
            return notificationsRaw.map((n: NotificationRaw) => ({
                ...n,
                CreatedAt: n.CreatedAt ?? '',
            })) as Notification[];
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });

    return {
        notifications: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para buscar notificações de um usuário específico
export function useAdmNotificationsUser(userId: string | undefined) {
    const query = useQuery<Notification[]>({
        queryKey: ['notificationsUser', userId],
        queryFn: async () => {
            if (!userId) return [];
            await getNotificationsUser(userId);
            const notificationsRaw = useAdmNotificationStore.getState().notificationsUser ?? [];
            // Garantir que createdAt sempre seja string
            return notificationsRaw.map((n: NotificationRaw) => ({
                ...n,
                CreatedAt: n.CreatedAt ?? '',
            })) as Notification[];
        },
        enabled: !!userId,
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    return {
        notifications: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}

// Hook para adicionar notificação para todos
export function useAddNotificationAll() {
    return useMutation({
        mutationFn: async (notification: Notification) => {
            return await addNotificationAll(notification);
        },
    });
}

// Hook para adicionar notificação para todos usuários
export function useAddNotificationUser() {
    return useMutation({
        mutationFn: async (notification: Notification) => {
            return await addNotificationUser(notification);
        },
    });
}
