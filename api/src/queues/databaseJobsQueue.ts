/**
 * Fila BullMQ para jobs da tabela Job do banco de dados
 * Substitui o polling com setTimeout por BullMQ otimizado
 */

import { Queue } from "bullmq";
import { getBullMQConnectionOptions, waitForIORedisReady } from "../config/redis.config";

export const DATABASE_JOBS_QUEUE_NAME = "databaseJobs";

let databaseJobsQueue: Queue | null = null;
let databaseJobsQueueInitPromise: Promise<Queue | null> | null = null;

const createDatabaseJobsQueue = async (): Promise<Queue | null> => {
    try {
        const conn = await waitForIORedisReady(60000);
        await conn.ping();

        const queue = new Queue(DATABASE_JOBS_QUEUE_NAME, {
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

        console.log("✅ [BullMQ] databaseJobsQueue criada com conexão validada");
        return queue;
    } catch (err) {
        console.error(
            "❌ [BullMQ] databaseJobsQueue não inicializada: Redis indisponível ou não respondeu ao ping.",
            err
        );
        return null;
    }
};

export const getDatabaseJobsQueue = async (): Promise<Queue | null> => {
    if (databaseJobsQueue) return databaseJobsQueue;
    if (databaseJobsQueueInitPromise) return databaseJobsQueueInitPromise;

    databaseJobsQueueInitPromise = createDatabaseJobsQueue();
    databaseJobsQueue = await databaseJobsQueueInitPromise;
    databaseJobsQueueInitPromise = null;
    return databaseJobsQueue;
};

(async () => {
    databaseJobsQueue = await getDatabaseJobsQueue();
})();

export { databaseJobsQueue };

