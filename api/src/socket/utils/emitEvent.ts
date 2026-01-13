// src/utils/emitEvent.ts
import { Server } from "socket.io";
import { getConnectedUsers } from "../events/onConnect";

interface EmitEventOptions {
    toUserId?: string;
    data: unknown;
    broadcast?: boolean;
}

const isProduction = process.env.NODE_ENV === "production";
const isPre = process.env.NODE_ENV === "pre" || process.env.NODE_ENV === "staging";

// Cache de últimas notificações para evitar duplicatas
const lastEmittedEvents = new Map<string, { data: unknown; timestamp: number }>();
const DEBOUNCE_WINDOW_MS = 100; // 100ms para debounce

/**
 * Verifica se um evento é duplicado (dentro da janela de debounce)
 */
function isDuplicateEvent(key: string, data: unknown): boolean {
    const last = lastEmittedEvents.get(key);
    const now = Date.now();

    if (last && (now - last.timestamp) < DEBOUNCE_WINDOW_MS) {
        try {
            if (JSON.stringify(last.data) === JSON.stringify(data)) {
                return true;
            }
        } catch {
            // Se não conseguir serializar, não considera duplicado
        }
    }

    lastEmittedEvents.set(key, { data, timestamp: now });
    
    // Limpa cache antigo (mais de 1 minuto)
    if (lastEmittedEvents.size > 1000) {
        const cutoff = now - 60000;
        for (const [k, v] of lastEmittedEvents.entries()) {
            if (v.timestamp < cutoff) {
                lastEmittedEvents.delete(k);
            }
        }
    }

    return false;
}

export function emitEvent(io: Server, event: string, { toUserId, data, broadcast = false }: EmitEventOptions): void {
    const users = getConnectedUsers();

    // Log apenas em desenvolvimento ou pre
    if (!isProduction) {
        console.log(`📨 [emitEvent] Requisição recebida:`, {
            event,
            broadcast,
            toUserId,
            totalConnected: users.size,
        });
    }

    // Se o evento for de consulta (formato consultation:${consultationId}), envia para a sala da consulta
    if (event.startsWith('consultation:')) {
        const consultationId = event.replace('consultation:', '');
        const roomName = `consulta_${consultationId}`;
        
        // Verifica duplicatas para eventos de consulta
        const eventKey = `${roomName}:${event}`;
        if (isDuplicateEvent(eventKey, data)) {
            if (!isProduction) {
                console.log(`[emitEvent] Evento duplicado ignorado: ${eventKey}`);
            }
            return;
        }
        
        const eventData = data as { event?: string; consultationId?: string; [key: string]: unknown };
        const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
        
        // Se não há ninguém na sala, não emite (economiza CPU)
        if (roomSize === 0) {
            if (!isProduction) {
                console.log(`[emitEvent] Sala ${roomName} vazia - evento não emitido`);
            }
            return;
        }
        
        // Se data contém um campo 'event', emite também esse evento específico para a sala
        if (eventData?.event && typeof eventData.event === 'string' && typeof data === 'object' && data !== null) {
            io.to(roomName).emit(eventData.event, {
                ...(data as Record<string, unknown>),
                consultationId: consultationId || eventData.consultationId,
                timestamp: new Date().toISOString()
            });
            
            if (!isProduction || isPre) {
                console.log(`📤 [Consultation] Evento ${eventData.event} → sala ${roomName} (${roomSize} participantes)`);
            }
        }
        
        // Sempre emite também o evento geral da consulta
        if (typeof data === 'object' && data !== null) {
            io.to(roomName).emit(event, {
                ...(data as Record<string, unknown>),
                consultationId: consultationId || (eventData?.consultationId as string),
                timestamp: new Date().toISOString()
            });
        } else {
            io.to(roomName).emit(event, {
                data,
                consultationId: consultationId || (eventData?.consultationId as string),
                timestamp: new Date().toISOString()
            });
        }
        
        if (!isProduction || isPre) {
            console.log(`📤 [Consultation] Evento geral ${event} → sala ${roomName} (${roomSize} participantes)`);
        }
        return;
    }

    if (broadcast) {
        // Verifica duplicatas para broadcast
        const broadcastKey = `broadcast:${event}`;
        if (isDuplicateEvent(broadcastKey, data)) {
            if (!isProduction) {
                console.log(`[emitEvent] Broadcast duplicado ignorado: ${event}`);
            }
            return;
        }

        io.emit(event, data);
        
        if (!isProduction || isPre) {
            console.log(`📢 [Broadcast] ${event} → ${io.engine.clientsCount} conexões`);
        }
    } else if (toUserId) {
        // Verifica duplicatas para notificações de usuário
        const userEventKey = `${toUserId}:${event}`;
        if (isDuplicateEvent(userEventKey, data)) {
            if (!isProduction) {
                console.log(`[emitEvent] Notificação duplicada ignorada: ${toUserId}:${event}`);
            }
            return;
        }

        const socketId = users.get(toUserId);

        if (socketId) {
            io.to(socketId).emit(event, data);
            
            if (!isProduction || isPre) {
                console.log(`✅ [Privado] ${event} → ${toUserId} (${socketId})`);
            }
        } else {
            if (!isProduction) {
                console.warn(`❌ [emitEvent] Usuário ${toUserId} NÃO está conectado`);
            }
        }
    } else {
        if (!isProduction) {
            console.warn(`⚠️ [emitEvent] Nenhum destinatário especificado`);
        }
    }
}
