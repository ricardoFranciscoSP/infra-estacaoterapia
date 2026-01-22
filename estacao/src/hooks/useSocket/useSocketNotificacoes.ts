"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/components/SocketProvider";
import { connectSocket } from "@/lib/socket";
import { useNotificacoes } from "@/store/useNotificacoes";

// Tipos dos payloads dos eventos
type NotificationCounterUpdate = { unreadCount: number };

interface PaymentNotificationData {
    title?: string;
    message?: string;
    [key: string]: unknown;
}

type Handlers<
    TNotification = unknown,
    TCounterUpdate extends NotificationCounterUpdate = NotificationCounterUpdate,
    TSystemAnnouncement = unknown
> = {
    onNotification?: (data: TNotification) => void;
    onCounterUpdate?: (data: TCounterUpdate) => void;
    onSystemAnnouncement?: (data: TSystemAnnouncement) => void;
};

export function useSocketNotifications<
    TNotification = unknown,
    TCounterUpdate extends NotificationCounterUpdate = NotificationCounterUpdate,
    TSystemAnnouncement = unknown
>(userId: string, handlers?: Handlers<TNotification, TCounterUpdate, TSystemAnnouncement>) {
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket } = useSocket();
    const { updateUnseenCount, fetchNotificacoes } = useNotificacoes();

    useEffect(() => {
        if (!userId || !socket) {
            console.log('⚠️ [useSocketNotifications] Socket não disponível ou userId vazio');
            return;
        }

        console.log('🔌 [useSocketNotifications] Registrando listeners para userId:', userId);

        const handleSystem = (data: TSystemAnnouncement) => {
            console.log('📢 [useSocketNotifications] system_announcement recebido:', data);
            handlers?.onSystemAnnouncement?.(data);
        };
        const handleCounter = (data: TCounterUpdate) => {
            console.log('🔢 [useSocketNotifications] notification_counter_update recebido:', data);
            const count = data.unreadCount ?? 0;
            setUnreadCount(count);
            // ✅ Atualiza o store imediatamente quando receber atualização do contador
            updateUnseenCount(count);
            // ✅ Recarrega notificações para garantir sincronização completa
            fetchNotificacoes();
            handlers?.onCounterUpdate?.(data);
        };
        
        // ✅ Handler para notification:count (compatibilidade)
        const handleCount = (data: { count?: number }) => {
            const count = data.count ?? 0;
            console.log('🔢 [useSocketNotifications] notification:count recebido:', count);
            handleCounter({ unreadCount: count } as TCounterUpdate);
        };
        const handleNotification = (data: TNotification) => {
            console.log('🔔 [useSocketNotifications] notification recebido:', data);
            handlers?.onNotification?.(data);
        };
        const handlePaymentConfirmed = (data: TNotification) => {
            console.log('💰 [useSocketNotifications] payment_confirmed recebido:', data);
            // Exibe notificação de pagamento confirmado
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    const paymentData = data as PaymentNotificationData;
                    new Notification(paymentData?.title || 'Pagamento Confirmado', {
                        body: paymentData?.message || 'Seu pagamento foi aprovado!',
                        icon: '/icons/icon-192x192.png'
                    });
                }
            }
            // Chama callback de notificação se fornecido
            handlers?.onNotification?.(data);
        };

        socket.on("system_announcement", handleSystem);
        socket.on("notification_counter_update", handleCounter);
        socket.on("notification:count", handleCount);
        socket.on("notification", handleNotification);
        socket.on("payment_confirmed", handlePaymentConfirmed);

        // ✅ Força reconexão se não estiver conectado
        if (!socket.connected) {
            console.log('🔄 [useSocketNotifications] Socket desconectado, forçando reconexão...');
            connectSocket();
        }

        // ✅ Emite evento para o servidor saber que o cliente está pronto
        socket.emit("subscribe_notifications", { userId });
        console.log('✅ [useSocketNotifications] Listeners registrados e subscribe enviado');

        return () => {
            console.log('🔌 [useSocketNotifications] Removendo listeners');
            socket.off("system_announcement", handleSystem);
            socket.off("notification_counter_update", handleCounter);
            socket.off("notification:count", handleCount);
            socket.off("notification", handleNotification);
            socket.off("payment_confirmed", handlePaymentConfirmed);
        };
    }, [userId, socket, handlers, updateUnseenCount, fetchNotificacoes]);

    return unreadCount;
}

// Mantém a legacy como proxy do Provider
type NotificationCallback = (data: unknown) => void;

export const useSocketNotificationsLegacy = (
    userId: string,
    options?: { onNotification?: NotificationCallback }
) => {
    const { socket, isConnected } = useSocket();
    const onNotificationRef = useRef<NotificationCallback | undefined>(options?.onNotification);

    useEffect(() => {
        onNotificationRef.current = options?.onNotification;
    }, [options?.onNotification]);

    useEffect(() => {
        if (!userId || !socket) return;

        const handleNotification = (data: unknown) => {
            console.log("🔔 [useSocketNotifications] Notificação recebida:", data);
            onNotificationRef.current?.(data);
        };

        socket.on("notification", handleNotification);
        return () => { socket.off("notification", handleNotification); };
    }, [userId, socket]);

    return { isConnected };
};
