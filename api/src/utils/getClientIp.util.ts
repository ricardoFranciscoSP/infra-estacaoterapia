import { Request } from 'express';

/**
 * Extrai o endereço IP do cliente da requisição
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const socketRemoteAddress = req.socket.remoteAddress;

    if (forwarded) {
        // x-forwarded-for pode ser uma lista de IPs separados por vírgula
        const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
        return ips[0]?.trim() || 'unknown';
    }

    if (realIp) {
        return typeof realIp === 'string' ? realIp : realIp[0] || 'unknown';
    }

    if (socketRemoteAddress) {
        return socketRemoteAddress;
    }

    return 'unknown';
}

