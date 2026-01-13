import { Socket } from "socket.io";

export function onDisconnect(socket: Socket, userId: string, users: Map<string, string>) {
    if (userId) {
        users.delete(userId);
        console.log(`❌ Usuário desconectado: ${userId}`);
    } else {
        console.log(`❌ Socket desconectado: ${socket.id}`);
    }
}
