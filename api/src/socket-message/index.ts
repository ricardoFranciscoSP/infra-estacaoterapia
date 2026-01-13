import type http from 'http';
import { Server } from 'socket.io';

let io: Server | undefined;

export function setupSocket(server: http.Server) {
    io = new Server(server, {
        cors: {
            origin: process.env.SOCKET_CORS_ORIGIN?.split(',') ?? '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        // ping/pong simples
        socket.on('ping', () => socket.emit('pong'));

        // entrar em salas
        socket.on('join', (room: string) => {
            if (!room) return;
            socket.join(room);
            socket.emit('joined', room);
        });

        // enviar mensagens para sala ou broadcast global
        socket.on('message', (payload: { room?: string; event?: string; data?: unknown }) => {
            const event = payload?.event ?? 'message';
            if (payload?.room) {
                socket.to(payload.room).emit(event, payload.data);
            } else {
                socket.broadcast.emit(event, payload?.data);
            }
        });

        socket.on('disconnect', () => {
            // noop
        });
    });

    return io;
}

export function getIO() {
    if (!io) throw new Error('Socket.IO não inicializado. Chame setupSocket() no boot do servidor.');
    return io;
}
