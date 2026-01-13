/**
 * ⚠️ DEPRECADO: Este arquivo foi substituído por delayed jobs
 * 
 * REFATORADO: A lógica de encerrar salas sem presença agora é executada via delayed jobs
 * quando a consulta é criada (10 minutos após ScheduledAt).
 * 
 * Este arquivo é mantido apenas para referência histórica.
 * A funcionalidade está implementada em:
 * - src/workers/delayedJobsWorker.ts (handleCancelConsultationNoShow)
 * - src/utils/scheduleDelayedJobs.ts (scheduleConsultationJobs)
 * 
 * NÃO USE ESTE ARQUIVO DIRETAMENTE - Use delayed jobs ao invés disso.
 */

import prisma from '../prisma/client';
import { ConsultaRoomService } from '../services/consultaRoom.service';
import { ConsultaStatusService } from '../services/consultaStatus.service';
import { WebSocketNotificationService } from '../services/websocketNotification.service';
import { AgendaStatus, AutorTipoCancelamento } from '../types/permissions.types';

const wsNotify = new WebSocketNotificationService();

/**
 * @deprecated Use delayed jobs ao invés disso
 * A funcionalidade está em src/workers/delayedJobsWorker.ts
 */
export const encerrarSalasSemPresenca = async () => {
    console.warn('⚠️ [DEPRECATED] encerrarSalasSemPresenca não deve mais ser usado. Use delayed jobs.');
    // Implementação mantida apenas para compatibilidade, mas não deve ser chamada
    // ... (código original mantido para referência)
};
