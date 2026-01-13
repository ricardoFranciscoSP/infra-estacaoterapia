import { Socket, Server } from "socket.io";
import { onDisconnect } from "./onDisconnect";
import { handleMessage } from "./message";

const connectedUsers = new Map<string, string>(); // userId → socketId

export function onConnect(io: Server, socket: Socket) {
    console.log(`🔌 [onConnect] Nova conexão recebida:`, {
        socketId: socket.id,
        auth: socket.handshake.auth,
        query: socket.handshake.query,
        headers: socket.handshake.headers.authorization
    });

    const userId = socket.handshake.auth?.userId as string;
    // Armazena userId no socket para uso em outros handlers
    if (userId) {
        socket.data.userId = userId;
    }

    if (userId) {
        connectedUsers.set(userId, socket.id);
        console.log(`✅ Usuário registrado no Map:`, {
            userId,
            socketId: socket.id,
            totalConnected: connectedUsers.size
        });
        console.log(`📋 Usuários conectados:`, Array.from(connectedUsers.keys()));
    } else {
        console.warn(`⚠️ Socket conectado SEM userId:`, {
            socketId: socket.id,
            auth: socket.handshake.auth,
            query: socket.handshake.query
        });
    }

    // Mensagens e eventos recebidos do cliente
    handleMessage(io, socket);

    // Desconexão
    socket.on("disconnect", () => onDisconnect(socket, userId, connectedUsers));
}

export function getConnectedUsers() {
    return connectedUsers;
}
