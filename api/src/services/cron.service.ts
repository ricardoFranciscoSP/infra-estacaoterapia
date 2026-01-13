/**
 * ⚠️ DEPRECADO: Este serviço foi substituído por delayed jobs
 * 
 * REFATORADO: Todos os jobs diários/mensais devem ser convertidos para delayed jobs
 * ou executados via event-driven. NUNCA use cron - use apenas Redis + BullMQ.
 * 
 * Este arquivo é mantido apenas para compatibilidade durante a transição.
 */

import { UserDataCheckService } from "./userDataCheck.service";
import { WebSocketNotificationService } from "./websocketNotification.service";

export class CronService {
    private userDataCheckService: UserDataCheckService;

    constructor(wsService: WebSocketNotificationService) {
        this.userDataCheckService = new UserDataCheckService(wsService);
    }

    /**
     * @deprecated Não use mais - todos os jobs devem ser delayed jobs
     */
    start() {
        console.warn("⚠️ [CronService] start() foi descontinuado. Use delayed jobs ao invés de cron.");
    }

    /**
     * @deprecated Não use mais - converta para delayed jobs
     * Os jobs diários devem ser agendados quando necessário, não via cron
     */
    async executeDailyJobs(): Promise<void> {
        console.warn("⚠️ [DEPRECATED] executeDailyJobs não deve mais ser usado. Use delayed jobs.");
        // Implementação mantida apenas para compatibilidade
        // TODO: Converter cada job para delayed job quando necessário
    }

    /**
     * @deprecated Não use mais - converta para delayed jobs
     * Os jobs mensais devem ser agendados quando necessário, não via cron
     */
    async executeMonthlyJobs(): Promise<void> {
        console.warn("⚠️ [DEPRECATED] executeMonthlyJobs não deve mais ser usado. Use delayed jobs.");
        // Implementação mantida apenas para compatibilidade
        // TODO: Converter cada job para delayed job quando necessário
    }
}
