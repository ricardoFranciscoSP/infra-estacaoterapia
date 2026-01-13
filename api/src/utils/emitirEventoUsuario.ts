import { Server } from 'socket.io';
import { emitEvent } from '../socket/utils/emitEvent';
import { getConnectedUsers } from '../socket/events/onConnect';

/**
 * Emite eventos socket para o usuário (bloqueio, status, onboarding) de forma centralizada.
 * Exemplo de uso:
 *   await emitirEventoUsuario(io, userId, 'user:blocked', { reason: 'Pagamento pendente' });
 */
export async function emitirEventoUsuario(
    io: Server,
    userId: string,
    event: 'user:blocked' | 'user:status-update' | 'user:onboarding-update',
    data: any
) {
    emitEvent(io, event, { toUserId: userId, data });
}
