"use client";
import { io, Socket } from "socket.io-client";
import { isPreEnvironment } from "./env-utils";
// Listener para eventos de status da consulta (ex: cancelamento automático)
export const onConsultationStatusChanged = (
    callback: (data: { status: string; consultationId: string }) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `consultation-status-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta para receber eventos
        s.emit("join-room", `consulta_${consultationId}`);
        // Depois escutar o evento
        s.on("consultation:status-changed", (data) => {
            if (data.consultationId === consultationId) {
                callback(data);
                resetDisconnectionTimer(); // Reseta timer ao receber evento
            }
        });
        resetDisconnectionTimer(); // Reseta timer após setup
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Remove o listener de status changed
export const offConsultationStatusChanged = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;
    s.off("consultation:status-changed");

    if (consultationId) {
        const listenerKey = `consultation-status-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer(); // Reavalia se pode desconectar
    }
};

// Listener para eventos de inatividade na consulta
export const onConsultationInactivity = (
    callback: (data: { consultationId: string; message: string; missingRole: string; status: string }) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `consultation-inactivity-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta para receber eventos
        s.emit("join-room", `consulta_${consultationId}`);
        // Depois escutar o evento
        s.on("consultation:inactivity", (data) => {
            if (data.consultationId === consultationId) {
                callback(data);
                resetDisconnectionTimer();
            }
        });
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Remove o listener de inatividade
export const offConsultationInactivity = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;
    s.off("consultation:inactivity");

    if (consultationId) {
        const listenerKey = `consultation-inactivity-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};

// Listener para aviso de inatividade (30s antes dos 10min)
export interface InactivityWarningData {
    event: "inactivity-warning";
    consultationId: string;
    message: string;
    missingRole: "Patient" | "Psychologist" | "Both";
    missingName: string;
    countdown: number;
}

export interface TimeRemainingWarningData {
    event: "time-remaining-warning";
    consultationId: string;
    message: string;
    minutesRemaining: number;
    timestamp: string;
}

export interface SessionStatusUpdatedData {
    consultationId: string;
    status: 'scheduled' | 'active' | 'finished';
    timestamp: string;
    userId?: string;
}

export const onInactivityWarning = (
    callback: (data: InactivityWarningData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `inactivity-warning-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta para receber eventos (garante sincronização)
        s.emit("join-room", `consulta_${consultationId}`);

        // Escuta eventos diretos de inactivity-warning (do Event Sync)
        const directHandler = (data: InactivityWarningData) => {
            if (data.consultationId === consultationId) {
                callback(data);
                resetDisconnectionTimer();
            }
        };
        s.on("inactivity-warning", directHandler);

        // Escuta eventos de consulta que podem conter inactivity-warning (compatibilidade)
        // O backend envia via emitConsultation que emite para o canal consultation:${consultationId}
        const eventName = `consultation:${consultationId}`;
        const consultationHandler = (data: { event?: string; consultationId?: string; message?: string; missingRole?: string; missingName?: string; countdown?: number }) => {
            // Verifica se é o evento de aviso de inatividade
            if (data.event === "inactivity-warning" && data.consultationId === consultationId) {
                callback(data as InactivityWarningData);
                resetDisconnectionTimer();
            }
        };
        s.on(eventName, consultationHandler);
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Remove o listener de aviso de inatividade
export const offInactivityWarning = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;

    if (consultationId) {
        // Remove ambos os listeners (direto e via consultation channel)
        s.off("inactivity-warning");
        s.off(`consultation:${consultationId}`);
        const listenerKey = `inactivity-warning-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};

// Listener para notificações de tempo restante (15, 10, 5, 3 minutos)
export const onTimeRemainingWarning = (
    callback: (data: TimeRemainingWarningData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `time-remaining-warning-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta para receber eventos (garante sincronização)
        s.emit("join-room", `consulta_${consultationId}`);

        // Escuta eventos diretos de time-remaining-warning (do Event Sync)
        const directHandler = (data: TimeRemainingWarningData) => {
            if (data.consultationId === consultationId) {
                callback(data);
                resetDisconnectionTimer();
            }
        };
        s.on("time-remaining-warning", directHandler);

        // Escuta eventos de consulta que podem conter time-remaining-warning (compatibilidade)
        const eventName = `consultation:${consultationId}`;
        const consultationHandler = (data: { event?: string; consultationId?: string; message?: string; minutesRemaining?: number; timestamp?: string }) => {
            // Verifica se é o evento de tempo restante
            if (data.event === "time-remaining-warning" && data.consultationId === consultationId) {
                callback(data as TimeRemainingWarningData);
                resetDisconnectionTimer();
            }
        };
        s.on(eventName, consultationHandler);
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Remove o listener de tempo restante
export const offTimeRemainingWarning = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;

    if (consultationId) {
        // Remove ambos os listeners (direto e via consultation channel)
        s.off("time-remaining-warning");
        s.off(`consultation:${consultationId}`);
        const listenerKey = `time-remaining-warning-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};


// O servidor Socket.IO está configurado para aceitar HTTPS, não WSS diretamente
// Detecta o ambiente e usa a URL apropriada (executado apenas no cliente)
const getSocketUrl = (): string => {
    // PRIORIDADE 1: Detecta pelo hostname (mais confiável, funciona em runtime)
    if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        console.log("🔌 [Socket] Hostname detectado:", hostname);

        // Desenvolvimento local (verifica primeiro)
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            const url = "http://localhost:3334";
            console.log("🔌 [Socket] Ambiente local detectado, usando:", url);
            return url;
        }

        // Pré-produção (Staging) - verifica múltiplas formas
        // IMPORTANTE: Verifica antes de produção para evitar fallback incorreto
        const isPre = hostname === "pre.estacaoterapia.com.br" ||
            hostname.startsWith("pre.") ||
            hostname.includes("pre.") ||
            isPreEnvironment();

        if (isPre) {
            const url = "https://ws.estacaoterapia.com.br";
            console.log("🔌 [Socket] Ambiente de pré-produção detectado (hostname:", hostname, "), usando:", url);
            return url;
        }

        // Produção - qualquer subdomínio de estacaoterapia.com.br deve usar o endpoint prd
        const isProdDomain = hostname === "estacaoterapia.com.br"
            || hostname === "www.estacaoterapia.com.br"
            || hostname.endsWith(".estacaoterapia.com.br");

        if (isProdDomain) {
            const url = "https://ws.prd.estacaoterapia.com.br";
            console.log("🔌 [Socket] Ambiente de produção detectado (hostname:", hostname, "), usando:", url);
            return url;
        }
    }

    // PRIORIDADE 2: Variável de ambiente (fallback se hostname não funcionar)
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (envUrl && envUrl !== "__PLACEHOLDER_SOCKET_URL__" && envUrl.trim() !== '') {
        // Remove barra final se houver e converte wss:// para https:// se necessário
        let cleanUrl = envUrl.replace(/\/$/, '').trim();
        // Socket.IO client espera https://, não wss://
        if (cleanUrl.startsWith('wss://')) {
            cleanUrl = cleanUrl.replace('wss://', 'https://');
        }
        // Valida que a URL não seja o domínio raiz incorreto
        if (cleanUrl === 'https://estacaoterapia.com.br' || cleanUrl === 'http://estacaoterapia.com.br') {
            console.warn("🔌 [Socket] URL da variável de ambiente é o domínio raiz, ignorando e usando detecção por hostname");
        } else {
            console.log("🔌 [Socket] Usando URL da variável de ambiente:", cleanUrl);
            return cleanUrl;
        }
    }

    // PRIORIDADE 3: Verifica isPreEnvironment como último recurso
    if (typeof window !== "undefined" && isPreEnvironment()) {
        const url = "https://ws.estacaoterapia.com.br";
        console.log("🔌 [Socket] Ambiente de pré-produção detectado via isPreEnvironment(), usando:", url);
        return url;
    }

    // PRIORIDADE 4: Fallback baseado em NODE_ENV
    if (typeof window === "undefined") {
        // SSR: fallback padrão para produção
        if (process.env.NODE_ENV === 'production') {
            return "https://ws.prd.estacaoterapia.com.br";
        }
        // Fallback padrão para desenvolvimento
        return "http://localhost:3334";
    }

    // Se não reconheceu nada, usa fallback de produção
    console.warn("🔌 [Socket] Hostname não reconhecido:", typeof window !== "undefined" ? window.location.hostname : "SSR", "- usando fallback de produção");
    return "https://ws.prd.estacaoterapia.com.br";
};
let socket: Socket | null = null;
let initialized = false;
let connectionTimeout: NodeJS.Timeout | null = null;

// ---------------------
// Tipagem dos eventos
// ---------------------
export interface ConsultationEventData {
    status:
    | "startingSoon"
    | "started"
    | "endingSoon"
    | "Concluido"
    | "Cancelado"
    | "cancelled_by_patient"
    | "cancelled_by_psychologist"
    | "inactivity-warning"
    | "room-closed";
    event?: "inactivity-warning" | "room-closed";
    agoraChannel?: string;
    agoraToken?: string;
    message?: string;
    missingRole?: string;
    missingName?: string;
    countdown?: number;
    reason?: "completed" | "cancelled" | "inactivity" | "timeout";
    consultationId?: string;
}

// Evento para atualização da próxima consulta (escopo usuário)
export interface ProximaConsultaAtualizadaEvent<T = unknown> {
    consulta: T;
    motivo: string;
}

// ---------------------
// Cria ou retorna o socket
// ---------------------
export const getSocket = (): Socket | null => {
    if (typeof window === "undefined") return null;
    if (socket && initialized) return socket;

    // Obtém a URL do socket (executado no cliente, não no build)
    const SOCKET_URL = getSocketUrl();
    console.log("🔌 [Socket] URL configurada:", SOCKET_URL);
    console.log("🔌 [Socket] Hostname atual:", window.location.hostname);

    // Configurações do socket baseadas no ambiente
    interface SocketOptions {
        autoConnect: boolean;
        transports: string[];
        withCredentials: boolean;
        reconnection: boolean;
        reconnectionAttempts: number;
        reconnectionDelay: number;
        reconnectionDelayMax: number;
        timeout: number;
        forceNew: boolean;
        path: string;
        secure?: boolean;
        upgrade?: boolean;
    }

    const socketOptions: SocketOptions = {
        autoConnect: false, // NÃO conecta automaticamente
        transports: ["websocket", "polling"], // Tenta WebSocket primeiro, depois polling como fallback
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5, // Aumenta tentativas
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000, // Aumenta timeout
        forceNew: false,
        // Alinha com caminho padrão do Socket.IO no backend (sem barra final evita 404 em reverse proxies)
        path: "/socket.io",
    };

    // Em produção, força uso de WebSocket seguro
    if (SOCKET_URL.startsWith("https://")) {
        socketOptions.transports = ["websocket", "polling"];
        socketOptions.secure = true;
        // Adiciona upgrade automático para WSS
        socketOptions.upgrade = true;
    }

    console.log("🔌 [Socket] Criando conexão com:", SOCKET_URL);
    console.log("🔌 [Socket] Opções:", JSON.stringify(socketOptions, null, 2));

    socket = io(SOCKET_URL, socketOptions);

    setupSocketListeners(socket);
    initialized = true;

    return socket;
};

// ---------------------
// Listeners globais
// ---------------------
const setupSocketListeners = (s: Socket) => {
    s.on("connect", () => {
        console.debug("🟢 [Socket] Conectado! ID:", s.id);
        // @ts-expect-error - uri é privado mas útil para debug
        const socketUri = s.io?.uri || "N/A";
        console.debug("   URL:", socketUri);
        console.debug("   Transport:", s.io?.engine?.transport?.name);

        // Desconecta automaticamente após 30 segundos de inatividade
        resetDisconnectionTimer();
    });

    s.on("disconnect", (reason) => {
        console.warn("🔴 [Socket] Desconectado:", reason);
        clearDisconnectionTimer();

        // Só reconecta se o servidor desconectou explicitamente
        if (reason === "io server disconnect") {
            console.debug("🔄 [Socket] Servidor desconectou, aguardando reconexão manual");
        }
    });

    s.on("connect_error", (err) => {
        console.error("⚠️ [Socket] Erro de conexão:", err.message);
        // @ts-expect-error - uri é privado mas útil para debug
        const socketUri = s.io?.uri || "N/A";
        console.error("   URL tentada:", socketUri);
        // @ts-expect-error - propriedades específicas do Socket.IO
        console.error("   Tipo:", err.type || "unknown");
        // @ts-expect-error - propriedades específicas do Socket.IO
        console.error("   Descrição:", err.description || "N/A");
    });

    s.on("reconnect", (attemptNumber) => {
        console.debug("🔄 [Socket] Reconectado após", attemptNumber, "tentativas");
        resetDisconnectionTimer();
    });

    s.on("reconnect_attempt", (attemptNumber) =>
        console.debug("🔄 [Socket] Tentativa de reconexão:", attemptNumber)
    );

    s.on("reconnect_error", (err: Error) =>
        console.error("❌ [Socket] Erro ao reconectar:", err.message)
    );

    s.on("reconnect_failed", () => {
        console.error("❌ [Socket] Falha ao reconectar após todas as tentativas");
        clearDisconnectionTimer();
    });

    s.on("notification", (data) => {
        console.debug("🔔 [Socket] Nova notificação:", data);
        resetDisconnectionTimer(); // Mantém vivo ao receber notificação
    });

    // Reseta timer ao receber qualquer evento (mantém conexão ativa)
    // Usa onAny se disponível (Socket.IO v3+)
    type SocketWithOnAny = Socket & { onAny?: (eventName: string, ...args: unknown[]) => void };
    const socketWithOnAny = s as SocketWithOnAny;
    if (typeof socketWithOnAny.onAny === 'function') {
        socketWithOnAny.onAny((eventName: string) => {
            if (eventName !== "connect" && eventName !== "disconnect" && eventName !== "reconnect") {
                resetDisconnectionTimer();
            }
        });
    }
};

// Rastreia listeners ativos para não desconectar enquanto houver eventos sendo escutados
const activeListeners = new Set<string>();

// Timer para desconectar automaticamente (só se não houver listeners ativos)
const resetDisconnectionTimer = () => {
    clearDisconnectionTimer();

    // Não desconecta se houver listeners ativos
    if (activeListeners.size > 0) {
        console.debug(`⏱️ [Socket] Mantendo conexão ativa (${activeListeners.size} listeners ativos)`);
        return;
    }

    // Aumenta o timeout para 5 minutos durante consultas (em vez de 30 segundos)
    // Isso evita desconexões acidentais durante sessões longas
    connectionTimeout = setTimeout(() => {
        const s = getSocket();
        if (s?.connected && activeListeners.size === 0) {
            console.debug("⏱️ [Socket] Desconectando por inatividade (sem listeners ativos)");
            s.disconnect();
        }
    }, 300000); // 5 minutos (aumentado de 30 segundos para evitar desconexões durante consultas)
};

const clearDisconnectionTimer = () => {
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }
};

// ---------------------
// Conectar / desconectar
// ---------------------
export const connectSocket = () => {
    const s = getSocket();
    if (!s) return console.warn("⚠️ Socket não disponível (SSR)");
    if (!s.connected) {
        console.debug("🔌 [Socket] Conectando sob demanda...");
        s.connect();
    } else {
        console.debug("✅ Socket já conectado");
    }
};

export const disconnectSocket = () => {
    const s = getSocket();
    if (!s?.connected) return;
    console.debug("🔌 [Socket] Desconectando...");
    clearDisconnectionTimer();
    s.disconnect();
};

// Conecta apenas se necessário (quando há uma ação que precisa do socket)
let isConnecting = false; // Flag para evitar múltiplas tentativas simultâneas
let connectionPromise: Promise<void> | null = null; // Promise para evitar múltiplas tentativas

export const ensureSocketConnection = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const s = getSocket();
        if (!s) {
            reject(new Error("Socket não disponível"));
            return;
        }

        // Se já está conectado, apenas reseta o timer e resolve
        if (s.connected) {
            resetDisconnectionTimer();
            resolve();
            return;
        }

        // Se já está tentando conectar, aguarda a promise existente
        if (connectionPromise) {
            connectionPromise.then(resolve).catch(reject);
            return;
        }

        // Se não está conectado e não está tentando, conecta
        if (!s.connected && !isConnecting) {
            isConnecting = true;
            console.debug("🔌 [Socket] Conectando para ação necessária...");

            connectionPromise = new Promise<void>((innerResolve, innerReject) => {
                const timeout = setTimeout(() => {
                    isConnecting = false;
                    connectionPromise = null;
                    innerReject(new Error("Timeout ao conectar socket"));
                }, 10000); // 10 segundos de timeout

                const onConnect = () => {
                    clearTimeout(timeout);
                    isConnecting = false;
                    connectionPromise = null;
                    resetDisconnectionTimer();
                    s.off("connect_error", onError);
                    innerResolve();
                };

                const onError = (err: Error) => {
                    clearTimeout(timeout);
                    isConnecting = false;
                    connectionPromise = null;
                    s.off("connect", onConnect);
                    innerReject(err);
                };

                s.once("connect", onConnect);
                s.once("connect_error", onError);

                s.connect();
            });

            connectionPromise.then(resolve).catch(reject);
        }
    });
};

// ---------------------
// Salas de usuário
// ---------------------
export const joinUserRoom = (userId: string) => {
    const s = getSocket();
    if (!s) return;

    const doJoin = () => {
        console.log("👤 [Socket] Entrando na sala do usuário:", userId);
        s.emit("join-user", userId);
    };

    if (!s.connected) {
        ensureSocketConnection();
        s.once("connect", doJoin);
    } else {
        doJoin();
    }
};

export const leaveUserRoom = (userId: string) => {
    const s = getSocket();
    if (!s) return;
    console.log("👤 [Socket] Saindo da sala do usuário:", userId);
    s.emit("leave-user", userId);
};

// ---------------------
// Sala de consulta (vídeo)
// ---------------------
export interface ConsultationJoinPayload {
    consultationId: string;
    userId: string;
    role: "Patient" | "Psychologist";
}

export interface UserJoinedData {
    userId: string;
    role: string;
    joinedAt: Date;
}

export interface PrivacyMessageData {
    message: string;
}

export const joinConsultation = async (data: ConsultationJoinPayload) => {
    const s = getSocket();
    if (!s) {
        console.warn("⚠️ [Socket] Socket não disponível para joinConsultation");
        return;
    }

    try {
        // Garante conexão antes de fazer join
        await ensureSocketConnection();

        // Verifica novamente se está conectado
        if (!s.connected) {
            console.warn("⚠️ [Socket] Socket não conectado após ensureSocketConnection");
            // Tenta conectar novamente
            s.connect();
            // Aguarda conexão
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
                s.once("connect", () => {
                    clearTimeout(timeout);
                    resolve();
                });
                s.once("connect_error", (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        }

        console.log("📹 [Socket] Entrando na consulta:", data);
        s.emit("consultation:join", data);

        // Também entra na sala da consulta para receber eventos
        const roomName = `consulta_${data.consultationId}`;
        s.emit("join-room", roomName);
        console.log("🏠 [Socket] Entrou na sala:", roomName);
    } catch (error) {
        console.error("❌ [Socket] Erro ao fazer join na consulta:", error);
        // Tenta fazer join mesmo assim (pode funcionar se conectar depois)
        s.emit("consultation:join", data);
        s.emit("join-room", `consulta_${data.consultationId}`);
    }
};

export const leaveConsultation = (consultationId: string, userId: string) => {
    const s = getSocket();
    if (!s) return;
    console.log("🚪 [Socket] Saindo da consulta:", { consultationId, userId });
    s.emit("consultation:leave", { consultationId, userId });
};

// Listener para quando alguém entra na consulta
export const onUserJoinedConsultation = (
    callback: (data: UserJoinedData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;

    ensureSocketConnection(); // Garante conexão para escutar eventos

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta
        s.emit("join-room", `consulta_${consultationId}`);
        // Depois escutar o evento
        s.on("user-joined", callback);
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Listener para mensagem de privacidade LGPD
export const onPrivacyMessage = (
    callback: (data: PrivacyMessageData) => void
) => {
    const s = getSocket();
    if (!s) return;
    s.on("privacy-message", callback);
};

// Limpar listener específico
export const offUserJoinedConsultation = () => {
    const s = getSocket();
    if (!s) return;
    s.off("user-joined");
};

export const offPrivacyMessage = () => {
    const s = getSocket();
    if (!s) return;
    s.off("privacy-message");
};

// ---------------------
// Levantar mão na consulta
// ---------------------
export interface RaiseHandPayload {
    consultationId: string;
    userId: string;
    role: "Patient" | "Psychologist";
    isRaised: boolean;
}

export interface HandRaisedData {
    userId: string;
    role: string;
    isRaised: boolean;
}

export const raiseHandInConsultation = (data: RaiseHandPayload) => {
    const s = getSocket();
    if (!s) {
        console.warn("✋ [Socket] Socket não disponível para enviar estado da mão");
        return;
    }

    ensureSocketConnection(); // Garante conexão

    const doRaise = () => {
        console.log("✋ [Socket] Enviando evento 'hand:raise':", data);
        s.emit("hand:raise", data);
        console.log("✅ [Socket] Evento 'hand:raise' enviado com sucesso");
    };

    if (!s.connected) {
        console.log("✋ [Socket] Socket não conectado, aguardando conexão...");
        s.once("connect", () => {
            console.log("✅ [Socket] Socket conectado, enviando estado da mão");
            doRaise();
        });
    } else {
        doRaise();
    }
};

// Listener para quando alguém levanta/abaixa a mão
export const onHandRaisedInConsultation = (
    callback: (data: HandRaisedData) => void
) => {
    const s = getSocket();
    if (!s) {
        console.warn("✋ [Socket] Socket não disponível para configurar listener de mão levantada");
        return;
    }
    console.log("✋ [Socket] Configurando listener para evento 'hand:raised'");
    s.on("hand:raised", (data: HandRaisedData) => {
        console.log("✋ [Socket] Evento 'hand:raised' recebido:", data);
        callback(data);
    });
};

export const offHandRaisedInConsultation = () => {
    const s = getSocket();
    if (!s) return;
    s.off("hand:raised");
};

// ---------------------
// Eventos de consulta
// ---------------------
const createConsultationListener =
    (status: ConsultationEventData["status"]) =>
        (callback: (data: ConsultationEventData) => void, consultationId: string) => {
            const s = getSocket();
            if (!s) return;
            s.on(`consultation:${consultationId}`, (data: ConsultationEventData) => {
                if (data.status === status) callback(data);
            });
        };

export const onConsultationStarted = createConsultationListener("started");
export const onConsultationEnded = createConsultationListener("Concluido");
export const onConsultationStartingSoon = createConsultationListener("startingSoon");
export const onConsultationEndingSoon = createConsultationListener("endingSoon");
export const onConsultationCancelled = createConsultationListener("Cancelado");
export const onConsultationCancelledByPatient = createConsultationListener("cancelled_by_patient");
export const onConsultationCancelledByPsychologist = createConsultationListener(
    "cancelled_by_psychologist"
);

// Listener para evento de sala fechada
export interface RoomClosedData {
    event: "room-closed";
    consultationId: string;
    reason: "completed" | "cancelled" | "inactivity" | "timeout";
    message: string;
}

export const onRoomClosed = (
    callback: (data: RoomClosedData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `room-closed-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        s.emit("join-room", `consulta_${consultationId}`);
        const eventName = `consultation:${consultationId}`;
        const handler = (data: { event?: string; consultationId?: string; reason?: string; message?: string }) => {
            if (data.event === "room-closed" && data.consultationId === consultationId) {
                callback(data as RoomClosedData);
                resetDisconnectionTimer();
            }
        };
        s.on(eventName, handler);
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

export const offRoomClosed = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;

    if (consultationId) {
        s.off(`consultation:${consultationId}`);
        const listenerKey = `room-closed-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};

// Escuta todos os eventos de uma consulta
export const onConsultationEvent = (
    callback: (data: ConsultationEventData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    s.on(`consultation:${consultationId}`, callback);
};

// ---------------------
// Sincronização de duração da consulta
// ---------------------
// Interface para o evento de sincronização de duração
export interface SyncSessionDurationData {
    consultationId: string;
    userId: string;
    role: "Patient" | "Psychologist";
    currentDuration: number; // em segundos
    timestamp: number; // ISO timestamp para validação
}

// Envia a duração atual para sincronizar com outros participantes
export const sendSessionDurationSync = (data: SyncSessionDurationData) => {
    const s = getSocket();
    if (!s) return;

    console.log("📤 [Socket] Enviando sincronização de duração:", {
        consultationId: data.consultationId,
        duration: data.currentDuration,
        role: data.role
    });

    s.emit("session:sync-duration", data);
};

// Recebe sincronização de duração do outro participante
export const onSessionDurationSync = (
    callback: (data: SyncSessionDurationData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `session-duration-sync-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        s.emit("join-room", `consulta_${consultationId}`);

        const handler = (data: SyncSessionDurationData) => {
            if (data.consultationId === consultationId) {
                console.log("📥 [Socket] Recebido sincronização de duração:", {
                    duration: data.currentDuration,
                    fromRole: data.role,
                    userId: data.userId
                });
                callback(data);
                resetDisconnectionTimer();
            }
        };

        s.on("session:duration-synced", handler);
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

// Remove o listener de sincronização de duração
export const offSessionDurationSync = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;

    s.off("session:duration-synced");

    if (consultationId) {
        const listenerKey = `session-duration-sync-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};

// ---------------------
// Próxima consulta atualizada (para cards de dashboard)
// ---------------------
export const onProximaConsultaAtualizada = <T = unknown>(
    callback: (data: ProximaConsultaAtualizadaEvent<T>) => void
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();
    s.on("proximaConsultaAtualizada", (data: ProximaConsultaAtualizadaEvent<T>) => callback(data));
};

export const offProximaConsultaAtualizada = () => {
    const s = getSocket();
    if (!s) return;
    s.off("proximaConsultaAtualizada");
};

// ---------------------
// Listener para eventos de status de sessão (SESSION_STATUS_UPDATED)
// ---------------------
export const onSessionStatusUpdated = (
    callback: (data: SessionStatusUpdatedData) => void,
    consultationId: string
) => {
    const s = getSocket();
    if (!s) return;
    ensureSocketConnection();

    const listenerKey = `session-status-updated-${consultationId}`;
    activeListeners.add(listenerKey);

    const doSetup = () => {
        // Primeiro, entrar na sala da consulta para receber eventos (garante sincronização)
        s.emit("join-room", `consulta_${consultationId}`);

        // Escuta eventos diretos de SESSION_STATUS_UPDATED (do Event Sync)
        const directHandler = (data: SessionStatusUpdatedData) => {
            if (data.consultationId === consultationId) {
                callback(data);
                resetDisconnectionTimer();
            }
        };
        s.on("SESSION_STATUS_UPDATED", directHandler);
        resetDisconnectionTimer();
    };

    if (!s.connected) {
        s.once("connect", doSetup);
    } else {
        doSetup();
    }
};

export const offSessionStatusUpdated = (consultationId?: string) => {
    const s = getSocket();
    if (!s) return;

    if (consultationId) {
        s.off("SESSION_STATUS_UPDATED");
        const listenerKey = `session-status-updated-${consultationId}`;
        activeListeners.delete(listenerKey);
        resetDisconnectionTimer();
    }
};

export default getSocket;
