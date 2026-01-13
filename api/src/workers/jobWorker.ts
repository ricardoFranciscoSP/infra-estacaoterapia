/**
 * ⚠️ DEPRECADO: Este arquivo foi substituído por BullMQ
 * 
 * REFATORADO: O processamento de jobs da tabela Job agora usa BullMQ
 * através de src/workers/databaseJobsWorker.ts
 * 
 * Este arquivo é mantido apenas para compatibilidade durante a transição.
 * Use startDatabaseJobsWorker() ao invés de startJobWorker()
 */

import { Server } from "socket.io";

/**
 * @deprecated Use startDatabaseJobsWorker() ao invés disso
 */
export async function startJobWorker(io: Server, intervalMs = 10 * 60 * 1000): Promise<void> {
    console.warn("⚠️ [DEPRECATED] startJobWorker está deprecado. Use startDatabaseJobsWorker() ao invés disso.");
    
    // Inicializa o novo worker BullMQ
    const { startDatabaseJobsWorker } = await import("./databaseJobsWorker");
    startDatabaseJobsWorker();
    
    console.log("✅ [JobWorker] Worker BullMQ inicializado (substitui polling)");
}
