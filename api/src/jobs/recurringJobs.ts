/**
 * ⚠️ DEPRECADO: Sistema de jobs recorrentes removido
 * 
 * REFATORADO: Todos os jobs recorrentes foram convertidos para delayed jobs
 * ou removidos completamente. NUNCA use cron patterns - use apenas Redis + BullMQ.
 * 
 * Este arquivo é mantido apenas para compatibilidade durante a transição.
 * NÃO USE MAIS - Todos os jobs devem ser event-driven ou delayed jobs.
 */

import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { getIORedisClient } from "../config/redis.config";

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';
const RECURRING_JOBS_QUEUE = "recurringJobs";

let queue: Queue | null = null;
let worker: Worker | null = null;

function getQueueConnection(): Redis {
    const client = getIORedisClient();
    if (!client) {
        throw new Error("Redis client is not initialized");
    }
    return client;
}

export function getRecurringJobsQueue(): Queue {
    if (queue) return queue;

    const connection = getQueueConnection();
    queue = new Queue(RECURRING_JOBS_QUEUE, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 2000,
            },
            removeOnComplete: {
                age: 3600,
                count: 1000,
            },
            removeOnFail: {
                age: 86400,
            },
        },
    });

    return queue;
}

/**
 * @deprecated Não use mais cron patterns - use delayed jobs
 */
export async function scheduleRecurringJob(
    jobName: string,
    cronPattern: string,
    jobData?: Record<string, unknown>
): Promise<void> {
    console.warn(`⚠️ [DEPRECATED] scheduleRecurringJob não deve mais ser usado. Use delayed jobs ao invés de cron patterns.`);
    // Não agenda mais jobs recorrentes
}

export function startRecurringJobsScheduler(): void {
    console.warn("⚠️ [DEPRECATED] startRecurringJobsScheduler não deve mais ser usado.");
}

/**
 * @deprecated Não use mais - todos os jobs devem ser delayed jobs
 */
export function startRecurringJobsWorker(): void {
    console.warn("⚠️ [DEPRECATED] startRecurringJobsWorker não deve mais ser usado. Use delayed jobs.");
    // Não inicia mais worker de jobs recorrentes
}

/**
 * @deprecated Não use mais - todos os jobs devem ser delayed jobs
 */
export async function scheduleAllRecurringJobs(): Promise<void> {
    console.warn("⚠️ [DEPRECATED] scheduleAllRecurringJobs não deve mais ser usado. Use delayed jobs.");
    // Não agenda mais jobs recorrentes
    console.log("✅ [RecurringJobs] Sistema de jobs recorrentes removido - use delayed jobs");
}

export async function stopRecurringJobs(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }

    if (queue) {
        await queue.close();
        queue = null;
    }
}
