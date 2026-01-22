/**
 * Fila BullMQ para geração de tokens Agora no horário do ScheduledAt.
 */
import { Queue } from 'bullmq';
import { getBullMQConnectionOptions, waitForIORedisReady } from '../config/redis.config';
import { TokenGenerationJobPayload } from '../types/tokenGeneration.types';

export const TOKEN_GENERATION_QUEUE_NAME = 'tokenGenerationQueue';

type TokenGenerationQueue = Queue<TokenGenerationJobPayload, any, string>;

let tokenGenerationQueue: TokenGenerationQueue | null = null;
let tokenGenerationQueueInitPromise: Promise<TokenGenerationQueue | null> | null = null;

const createTokenGenerationQueue = async (): Promise<TokenGenerationQueue | null> => {
    try {
        const conn = await waitForIORedisReady(60000);
        await conn.ping();

        const queue = new Queue<TokenGenerationJobPayload, any, string>(TOKEN_GENERATION_QUEUE_NAME, {
            connection: getBullMQConnectionOptions(),
            defaultJobOptions: {
                attempts: Number(process.env.TOKEN_QUEUE_MAX_ATTEMPTS ?? '5'),
                backoff: {
                    type: 'exponential',
                    delay: Number(process.env.TOKEN_QUEUE_BACKOFF_MS ?? '3000'),
                },
                removeOnComplete: {
                    age: 86400,
                    count: 2000,
                },
                removeOnFail: {
                    age: 86400,
                },
            },
        });

        console.log('✅ [BullMQ] tokenGenerationQueue criada com conexão validada');
        return queue;
    } catch (err) {
        console.error(
            '❌ [BullMQ] tokenGenerationQueue não inicializada: Redis indisponível ou não respondeu ao ping.',
            err
        );
        return null;
    }
};

export const getTokenGenerationQueue = async (): Promise<TokenGenerationQueue | null> => {
    if (tokenGenerationQueue) return tokenGenerationQueue;
    if (tokenGenerationQueueInitPromise) return tokenGenerationQueueInitPromise;

    tokenGenerationQueueInitPromise = createTokenGenerationQueue();
    tokenGenerationQueue = await tokenGenerationQueueInitPromise;
    tokenGenerationQueueInitPromise = null;
    return tokenGenerationQueue;
};

(async () => {
    tokenGenerationQueue = await getTokenGenerationQueue();
})();

export { tokenGenerationQueue };
