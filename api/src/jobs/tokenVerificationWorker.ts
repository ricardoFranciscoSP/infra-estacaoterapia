/**
 * REFATORADO: Removido job recorrente de verificação de tokens
 * Tokens agora são agendados quando ReservaSessao é criada (delayed jobs)
 * Este arquivo é mantido apenas para compatibilidade, mas não agenda mais jobs recorrentes
 */

import { webhookQueue } from '../queues/bullmqCentral';

let verificationWorkerStarted = false;

/**
 * REFATORADO: Não agenda mais jobs recorrentes
 * Tokens são agendados quando ReservaSessao é criada via delayed jobs
 */
export async function scheduleTokenVerificationJobs() {
    console.log('✅ [TokenVerification] Sistema de tokens agora usa delayed jobs (zero polling)');
    console.log('ℹ️ [TokenVerification] Tokens são agendados quando ReservaSessao é criada');
    // Não agenda mais jobs recorrentes - tokens são agendados via delayed jobs
}

/**
 * Inicializa o worker que processa os jobs de verificação de tokens
 * REFATORADO: Não faz mais nada, mantido apenas para compatibilidade
 */
export async function startTokenVerificationWorker() {
    if (verificationWorkerStarted) {
        console.log('⚠️ [TokenVerification] Worker já foi inicializado');
        return;
    }

    verificationWorkerStarted = true;
    console.log('✅ [TokenVerification] Sistema de tokens agora usa delayed jobs (zero polling)');
}
