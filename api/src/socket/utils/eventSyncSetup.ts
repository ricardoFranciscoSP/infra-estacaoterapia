/**
 * Event Sync Setup para Socket.io
 * Inicializa listeners para eventos da API e os propaga para os clientes
 */

import { Server } from 'socket.io';
import { getEventSyncService } from '../../services/eventSync.service';

export async function initializeEventSync(io: Server): Promise<void> {
    const eventSync = getEventSyncService();

    // === Eventos de Consulta ===
    // Jobs disparam eventos para canais específicos de consulta
    // Este listener recebe e propaga para o Socket.io

    await eventSync.subscribe('consultation:events', async (data) => {
        const { consultationId, event, payload } = data;
        if (!consultationId) return;

        // Type guards para garantir tipos corretos
        if (typeof event !== 'string') {
            console.error('❌ [Event Sync] Event deve ser uma string');
            return;
        }

        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            console.error('❌ [Event Sync] Payload deve ser um objeto');
            return;
        }

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Propagando evento de consulta para sala ${roomName}:`, event);

        // Emite para todos na sala da consulta
        io.to(roomName).emit(event, {
            ...(payload as Record<string, unknown>),
            consultationId,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Notificação ===
    // Notificações criadas no backend são propagadas para o frontend

    await eventSync.subscribe('notification:created', async (data) => {
        const { userId, notificationData } = data;
        if (!userId) return;

        // Type guard para garantir que notificationData é um objeto
        if (!notificationData || typeof notificationData !== 'object' || Array.isArray(notificationData)) {
            console.error('❌ [Event Sync] notificationData deve ser um objeto');
            return;
        }

        console.log(`📡 [Event Sync] Notificação criada para usuário ${userId}`);

        // Emite para o usuário específico
        io.emit('notification:new', {
            userId,
            ...(notificationData as Record<string, unknown>),
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Atualização de Próxima Consulta ===
    // Quando uma consulta é concluída, actualizado é enviado para ambos os usuários

    await eventSync.subscribe('proximaConsulta:updated', async (data) => {
        const { pacienteId, psicologoId, motivo } = data;

        console.log(`📡 [Event Sync] Próxima consulta atualizada`);

        // Notifica paciente
        if (pacienteId) {
            io.emit('proximaConsultaAtualizada', {
                userId: pacienteId,
                data: { motivo },
                timestamp: new Date().toISOString()
            });
        }

        // Notifica psicólogo
        if (psicologoId) {
            io.emit('proximaConsultaAtualizada', {
                userId: psicologoId,
                data: { motivo },
                timestamp: new Date().toISOString()
            });
        }
    });

    // === Eventos de Status de Consulta ===
    // Mudanças de status (EmAndamento, Concluído, Cancelado, etc)

    await eventSync.subscribe('consultation:status-changed', async (data) => {
        const { consultationId, status, reason } = data;
        if (!consultationId) return;

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Status da consulta ${consultationId} mudou para ${status}`);

        io.to(roomName).emit('consultation:status-changed', {
            consultationId,
            status,
            reason,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Inatividade ===
    // Quando um participante não comparece

    await eventSync.subscribe('consultation:inactivity', async (data) => {
        const { consultationId, message, missingRole } = data;
        if (!consultationId) return;

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Inatividade detectada na consulta ${consultationId}`);

        io.to(roomName).emit('consultation:inactivity', {
            consultationId,
            message,
            missingRole,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Aviso (15 minutos antes do fim) ===

    await eventSync.subscribe('consultation:warning', async (data) => {
        const { consultationId, type, message } = data;
        if (!consultationId) return;

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Aviso na consulta ${consultationId}: ${type}`);

        io.to(roomName).emit('consultation:warning', {
            consultationId,
            type,
            message,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Tempo Restante (15, 10, 5, 3 minutos) ===
    // Sincroniza notificações de tempo restante entre paciente e psicólogo

    await eventSync.subscribe('consultation:time-remaining', async (data) => {
        const { consultationId, minutesRemaining, message } = data;
        if (!consultationId) return;

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Notificação de tempo restante na consulta ${consultationId}: ${minutesRemaining} minutos`);

        // Emite para todos na sala da consulta (paciente e psicólogo)
        io.to(roomName).emit('time-remaining-warning', {
            event: 'time-remaining-warning',
            consultationId,
            message,
            minutesRemaining,
            timestamp: new Date().toISOString()
        });

        // Também emite no canal geral da consulta para garantir compatibilidade
        io.to(roomName).emit(`consultation:${consultationId}`, {
            event: 'time-remaining-warning',
            consultationId,
            message,
            minutesRemaining,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Aviso de Inatividade ===
    // Sincroniza avisos de inatividade entre paciente e psicólogo

    await eventSync.subscribe('consultation:inactivity-warning', async (data) => {
        const { consultationId, message, missingRole, missingName, countdown } = data;
        if (!consultationId) return;

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Aviso de inatividade na consulta ${consultationId}: ${missingRole}`);

        // Emite para todos na sala da consulta (paciente e psicólogo)
        io.to(roomName).emit('inactivity-warning', {
            event: 'inactivity-warning',
            consultationId,
            message,
            missingRole,
            missingName,
            countdown,
            timestamp: new Date().toISOString()
        });

        // Também emite no canal geral da consulta para garantir compatibilidade
        io.to(roomName).emit(`consultation:${consultationId}`, {
            event: 'inactivity-warning',
            consultationId,
            message,
            missingRole,
            missingName,
            countdown,
            timestamp: new Date().toISOString()
        });
    });

    // === Eventos de Status de Sessão ===
    // Controle de estado da sessão (scheduled | active | finished)
    // Atualiza UI instantaneamente quando sessão inicia/finaliza

    await eventSync.subscribe('session:status-updated', async (data) => {
        const { consultationId, status, patientId, psychologistId } = data;
        if (!consultationId || !status) return;

        // Valida que status é válido
        if (status !== 'scheduled' && status !== 'active' && status !== 'finished') {
            console.error('❌ [Event Sync] Status de sessão inválido:', status);
            return;
        }

        const roomName = `consulta_${consultationId}`;
        console.log(`📡 [Event Sync] Status de sessão atualizado para ${consultationId}: ${status}`);

        // Emite evento SESSION_STATUS_UPDATED para a sala da consulta (paciente e psicólogo)
        io.to(roomName).emit('SESSION_STATUS_UPDATED', {
            consultationId,
            status,
            timestamp: new Date().toISOString()
        });

        // Também emite para os canais individuais dos usuários (caso não estejam na sala)
        if (patientId && typeof patientId === 'string') {
            io.emit('SESSION_STATUS_UPDATED', {
                consultationId,
                status,
                userId: patientId,
                timestamp: new Date().toISOString()
            });
        }

        if (psychologistId && typeof psychologistId === 'string') {
            io.emit('SESSION_STATUS_UPDATED', {
                consultationId,
                status,
                userId: psychologistId,
                timestamp: new Date().toISOString()
            });
        }
    });

    // === Eventos de Atualização de Pagamento ===
    // Quando um pagamento é atualizado via webhook, notifica o frontend
    await eventSync.subscribe('payment:updated', async (data) => {
        const { userId, financeiroId, codigoFatura, status, tipo, valor } = data;
        if (!userId) return;

        console.log(`📡 [Event Sync] Pagamento atualizado para usuário ${userId}`);

        // Emite para o usuário específico
        io.emit('payment:updated', {
            userId,
            financeiroId,
            codigoFatura,
            status,
            tipo,
            valor,
            timestamp: new Date().toISOString()
        });

        // Também emite evento para atualizar histórico de pagamentos
        io.emit('financeiro:updated', {
            userId,
            financeiroId,
            timestamp: new Date().toISOString()
        });
    });

    console.log('✅ Event Sync inicializado com sucesso');
    console.log('   Escutando: consultation:events, notification:created, proximaConsulta:updated, consultation:status-changed, consultation:inactivity, consultation:warning, consultation:time-remaining, consultation:inactivity-warning, session:status-updated, payment:updated');
}
