// store/useNotificacoes.ts
import { create } from "zustand";
import { notificationService } from "@/services/notificationService";

export type Notificacao = {
    Id: string;
    Title: string;
    Message: string;
    CreatedAt: string;
    IsForAllUsers: boolean;
    Lida: boolean;
};

// ✅ Tipo para notificações brutas vindas da API
type RawNotificationFromAPI = {
    id?: string;
    Id?: string;
    title?: string;
    Title?: string;
    message?: string;
    Message?: string;
    createdAt?: string;
    CreatedAt?: string;
    isForAllUsers?: boolean;
    IsForAllUsers?: boolean;
    status?: string;
    Status?: string;
    Notification?: {
        Title?: string;
        Message?: string;
    };
};

type State = {
    notificacoes: Notificacao[];
    unseenCount: number;
    addNotificacao: (n: Notificacao) => void;
    marcarComoLidas: () => void;
    setTodas: (notificacoes: Notificacao[]) => void;
    fetchNotificacoes: () => Promise<void>;
    marcarNotificacaoComoLida: () => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
    enviarNotificacaoViaAPI: (payload: {
        toAll?: boolean;
        userId?: string;
        message: string;
        title?: string;
        type?: string;
    }) => Promise<void>;
    updateUnseenCount: (count: number) => void;
};

export const useNotificacoes = create<State>((set) => ({
    notificacoes: [],
    unseenCount: 0,

    // ✅ Adiciona uma nova notificação (usado pelo socket)
    addNotificacao: (n) => {
        console.debug('🔔 [Store] addNotificacao chamado com:', n);

        set((state) => {
            console.debug('📊 [Store] Estado atual antes:', {
                totalNotificacoes: state.notificacoes.length,
                unseenCount: state.unseenCount,
                notificacoes: state.notificacoes.map(x => ({ Id: x.Id, Title: x.Title }))
            });

            // Evita duplicatas
            const jaExiste = state.notificacoes.some(notif => notif.Id === n.Id);
            if (jaExiste) {
                console.debug('⚠️ [Store] Notificação duplicada, ignorando:', n.Id);
                return state;
            }

            // ✅ Adiciona no INÍCIO do array para aparecer primeiro
            const notificacoes = [n, ...state.notificacoes];
            const unseenCount = notificacoes.filter((item) => !item.Lida).length;

            console.debug('✅ [Store] Estado NOVO:', {
                totalNotificacoes: notificacoes.length,
                unseenCount: unseenCount,
                novaNotificacao: n,
                primeiraNotificacao: notificacoes[0]
            });

            // ✅ Retorna novo objeto para forçar re-render
            return {
                notificacoes: [...notificacoes],
                unseenCount
            };
        });
    },

    marcarComoLidas: () =>
        set((state) => {
            const notificacoes = state.notificacoes.map((n) => ({ ...n, Lida: true }));
            return { notificacoes, unseenCount: 0 };
        }),

    setTodas: (notificacoes) =>
        set(() => ({
            notificacoes,
            unseenCount: notificacoes.filter((n) => !n.Lida).length,
        })),

    fetchNotificacoes: async () => {
        try {
            const response = await notificationService().getNotifications();
            // A resposta pode estar em response.data.notifications ou diretamente em response.data
            const notificationsRaw = Array.isArray(response.data?.notifications)
                ? response.data.notifications
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            const notificacoes: Notificacao[] = notificationsRaw.map((item: RawNotificationFromAPI) => {
                // Ajuste para a estrutura real da API
                const notificacao: Notificacao = {
                    Id: item.id || item.Id || "",
                    Title: item.title || item.Title || item.Notification?.Title || "",
                    Message: item.message || item.Message || item.Notification?.Message || "",
                    CreatedAt: item.createdAt || item.CreatedAt || new Date().toISOString(),
                    IsForAllUsers: item.isForAllUsers ?? item.IsForAllUsers ?? false,
                    Lida: item.status === "Lida" || item.Status === "Lida" || false,
                };

                return notificacao;
            });

            set({
                notificacoes,
                unseenCount: notificacoes.filter((n) => !n.Lida).length,
            });
        } catch (err) {
            console.error("❌ [useNotificacoes] Erro ao buscar notificações:", err);
        }
    },

    marcarNotificacaoComoLida: async () => {
        await notificationService().marcarNotificacaoComoLida();
        set((state) => {
            const notificacoes = state.notificacoes.map((n) => ({ ...n, Lida: true }));
            return {
                notificacoes,
                unseenCount: 0,
            };
        });
    },

    removeNotification: async (id: string) => {
        await notificationService().removeNotification(id);
        set((state) => {
            const notificacoes = state.notificacoes.filter((n) => n.Id !== id);
            return {
                notificacoes,
                unseenCount: notificacoes.filter((n) => !n.Lida).length,
            };
        });
    },

    enviarNotificacaoViaAPI: async (payload) => {
        try {
            if (payload.toAll) {
                await notificationService().addNotificationAll({
                    title: payload.title || "Nova Notificação",
                    message: payload.message,
                });
            } else if (payload.userId) {
                await notificationService().addNotificationUser({
                    userId: payload.userId,
                    title: payload.title || "Nova Notificação",
                    message: payload.message,
                });
            } else {
                throw new Error("Payload inválido para notificação");
            }
        } catch (err) {
            console.error("Erro ao enviar notificação via API:", err);
        }
    },

    // ✅ Atualiza o contador de não lidas diretamente (usado pelo socket)
    updateUnseenCount: (count) => {
        console.debug('🔢 [Store] updateUnseenCount chamado com:', count);
        set({ unseenCount: count });
    },
}));