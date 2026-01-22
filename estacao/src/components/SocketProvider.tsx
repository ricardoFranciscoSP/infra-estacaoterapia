"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { joinUserRoom, leaveUserRoom, getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

type SocketProviderProps = {
    children: ReactNode;
    userId?: string;
};

export const SocketProvider = ({ children, userId }: SocketProviderProps) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Só inicializa no cliente
        if (typeof window === 'undefined') return;

        // Obtém ou cria o socket
        const socketInstance = getSocket();
        if (!socketInstance) return;

        setSocket(socketInstance);

        // Listeners para atualizar o estado de conexão
        const handleConnect = () => {
            console.log('✅ [SocketProvider] Socket conectado');
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            console.log('❌ [SocketProvider] Socket desconectado');
            setIsConnected(false);
        };

        socketInstance.on('connect', handleConnect);
        socketInstance.on('disconnect', handleDisconnect);

        // Prepara listeners se houver userId, mas NÃO conecta automaticamente
        if (userId) {
            console.log('👤 [SocketProvider] Preparando socket para userId:', userId);
            console.log('ℹ️ [SocketProvider] Socket será conectado sob demanda quando necessário');

            // Aplica auth para garantir envio no handshake
            socketInstance.auth = { userId };

            // Configura listener para entrar na sala quando conectar
            socketInstance.on('connect', () => {
                console.log('🔌 [SocketProvider] Socket conectado, entrando na sala do usuário');
                joinUserRoom(userId);
            });
        } else {
            socketInstance.auth = {};
        }

        // Cleanup
        return () => {
            socketInstance.off('connect', handleConnect);
            socketInstance.off('disconnect', handleDisconnect);
            
            if (userId) {
                leaveUserRoom(userId);
            }
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
