import { create } from 'zustand';
import { Notification, notificationService } from '@/services/notificationService';

// Tipos do estado e ações
interface NotificationStoreState {
    notificationsAll: Notification[] | null;
    notificationsUser: Notification[] | null;
    notificationSelecionada: Notification | null;
}

interface NotificationStoreActions {
    setNotificationsAll: (notifications: Notification[]) => void;
    setNotificationsUser: (notifications: Notification[]) => void;
    setNotificationSelecionada: (notification: Notification) => void;
}

// Store
export const useAdmNotificationStore = create<NotificationStoreState & NotificationStoreActions>((set) => ({
    notificationsAll: null,
    notificationsUser: null,
    notificationSelecionada: null,
    setNotificationsAll: (notifications) => set({ notificationsAll: notifications }),
    setNotificationsUser: (notifications) => set({ notificationsUser: notifications }),
    setNotificationSelecionada: (notification) => set({ notificationSelecionada: notification }),
}));

// Função para buscar todas as notificações
export const getNotificationsAll = async () => {
    try {
        const response = await notificationService().getNotificationAll();
        useAdmNotificationStore.getState().setNotificationsAll(response.data);
    } catch (error) {
        console.error('Erro ao buscar notificações gerais:', error);
    }
};

// Função para buscar notificações de um usuário
export const getNotificationsUser = async (userId: string) => {
    try {
        const response = await notificationService().getNotificationUser(userId);
        useAdmNotificationStore.getState().setNotificationsUser(response.data);
    } catch (error) {
        console.error('Erro ao buscar notificações do usuário:', error);
    }
};

// Função para adicionar notificação para todos
export const addNotificationAll = async (notification: Notification) => {
    try {
        const response = await notificationService().addNotificationAll({
            title: notification.Title,
            message: notification.Message,
        });
        // Opcional: atualizar lista após adicionar
        await getNotificationsAll();
        return response.data;
    } catch (error) {
        console.error('Erro ao adicionar notificação geral:', error);
        throw error;
    }
};

// Função para adicionar notificação para um usuário específico
export const addNotificationUser = async (notification: Notification) => {
    try {
        if (!notification.UserId) {
            throw new Error('UserId é obrigatório para notificação de usuário');
        }
        const response = await notificationService().addNotificationUser({
            userId: notification.UserId,
            title: notification.Title,
            message: notification.Message,
        });
        // Opcional: atualizar lista de usuários se necessário
        return response.data;
    } catch (error) {
        console.error('Erro ao adicionar notificação para usuário:', error);
        throw error;
    }
};