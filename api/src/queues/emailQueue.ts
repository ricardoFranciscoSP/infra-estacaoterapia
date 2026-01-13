import { Queue } from "bullmq";
import { waitForIORedisReady } from "../config/redis.config";

export const EMAIL_QUEUE_NAME = "emailQueue";

export interface EmailJobData {
    type: 'randomPassword' | 'resetPasswordLink' | 'other';
    to: string;
    nome: string;
    subject: string;
    htmlTemplate: string;
    templateData: Record<string, unknown>;
}

let emailQueue: Queue<EmailJobData> | null = null;
let emailQueueInitPromise: Promise<Queue<EmailJobData> | null> | null = null;

const createEmailQueue = async (): Promise<Queue<EmailJobData> | null> => {
    try {
        // Aguarda conexão estar realmente pronta e responde a ping
        const conn = await waitForIORedisReady(60000);
        await conn.ping();

        const queue = new Queue(EMAIL_QUEUE_NAME, {
            connection: conn,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000, // 2s, 4s, 8s
                },
                removeOnComplete: {
                    age: 24 * 3600, // Mantém jobs completos por 24h
                    count: 1000, // Mantém últimos 1000 jobs
                },
                removeOnFail: {
                    age: 7 * 24 * 3600, // Mantém jobs falhos por 7 dias
                },
            },
        });

        console.log('✅ [BullMQ] emailQueue criada com conexão validada');
        return queue;
    } catch (err) {
        console.error('❌ [BullMQ] emailQueue não inicializada: Redis indisponível ou não respondeu ao ping.', err);
        return null;
    }
};

export const getEmailQueue = async (): Promise<Queue<EmailJobData> | null> => {
    if (emailQueue) return emailQueue;
    if (emailQueueInitPromise) return emailQueueInitPromise;

    emailQueueInitPromise = createEmailQueue();
    emailQueue = await emailQueueInitPromise;
    emailQueueInitPromise = null;
    return emailQueue;
};

// Inicializa de forma lazy, sem bloquear import; se falhar mantém null
(async () => {
    emailQueue = await getEmailQueue();
})();

export { emailQueue };

