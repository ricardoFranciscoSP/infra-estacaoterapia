/**
 * ⚠️ DEPRECADO: Este arquivo foi substituído por delayed jobs
 * 
 * REFATORADO: A lógica de expirar consultas após cancelamento de plano agora é executada
 * via delayed jobs quando o plano é cancelado (30 dias após cancelamento).
 * 
 * Este arquivo é mantido apenas para referência histórica.
 * A funcionalidade está implementada em:
 * - src/workers/delayedJobsWorker.ts (handleExpireConsultationAfterPlanCancellation)
 * - src/utils/scheduleDelayedJobs.ts (scheduleConsultationExpirationAfterPlanCancellation)
 * 
 * NÃO USE ESTE ARQUIVO DIRETAMENTE - Use delayed jobs ao invés disso.
 */

import prisma from '../prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { WebSocketNotificationService } from '../services/websocketNotification.service';
import { AgendaStatus } from '../types/permissions.types';

dayjs.extend(utc);
dayjs.extend(timezone);

const wsNotify = new WebSocketNotificationService();

/**
 * @deprecated Use delayed jobs ao invés disso
 * A funcionalidade está em src/workers/delayedJobsWorker.ts
 */
export const expirarConsultasPlanoCancelado = async () => {
    console.warn('⚠️ [DEPRECATED] expirarConsultasPlanoCancelado não deve mais ser usado. Use delayed jobs.');
    // Implementação mantida apenas para compatibilidade, mas não deve ser chamada
    // ... (código original mantido para referência)
};
