import { Queue } from "bullmq";
import { getIORedisClient } from "../config/redis.config";

export const NOTIFICATION_QUEUE_NAME = "notificationQueue";

const redisConnection = getIORedisClient();

export const notificationQueue = redisConnection
    ? new Queue(NOTIFICATION_QUEUE_NAME, {
        connection: redisConnection,
        defaultJobOptions: {
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
        },
    })
    : null;

if (!redisConnection) {
    console.log('[BullMQ] notificationQueue não inicializada: Redis indisponível (ambiente de desenvolvimento).');
}
