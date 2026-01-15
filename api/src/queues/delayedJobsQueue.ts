/**
 * Fila BullMQ dedicada para delayed jobs (zero polling)
 * Todos os jobs são agendados uma única vez quando a entidade é criada
 */

import { Queue } from "bullmq";
import { getBullMQConnectionOptions, waitForIORedisReady } from "../config/redis.config";

export const DELAYED_JOBS_QUEUE_NAME = "delayedJobs";

let delayedJobsQueue: Queue | null = null;
let delayedJobsQueueInitPromise: Promise<Queue | null> | null = null;

const createDelayedJobsQueue = async (): Promise<Queue | null> => {
    try {
        const conn = await waitForIORedisReady(60000);
        await conn.ping();

        const queue = new Queue(DELAYED_JOBS_QUEUE_NAME, {
            connection: getBullMQConnectionOptions(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 3600, // Mantém jobs completos por 1 hora
                    count: 1000,
                },
                removeOnFail: {
                    age: 86400, // Mantém jobs falhos por 24 horas
                },
            },
        });

        console.log("✅ [BullMQ] delayedJobsQueue criada com conexão validada");
        return queue;
    } catch (err) {
        console.error(
            "❌ [BullMQ] delayedJobsQueue não inicializada: Redis indisponível ou não respondeu ao ping.",
            err
        );
        return null;
    }
};

export const getDelayedJobsQueue = async (): Promise<Queue | null> => {
    if (delayedJobsQueue) return delayedJobsQueue;
    if (delayedJobsQueueInitPromise) return delayedJobsQueueInitPromise;

    delayedJobsQueueInitPromise = createDelayedJobsQueue();
    delayedJobsQueue = await delayedJobsQueueInitPromise;
    delayedJobsQueueInitPromise = null;
    return delayedJobsQueue;
};

(async () => {
    delayedJobsQueue = await getDelayedJobsQueue();
})();

export { delayedJobsQueue };

