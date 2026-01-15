import { Queue } from "bullmq";
import { getBullMQConnectionOptions } from "../config/redis.config";

export const NOTIFICATION_QUEUE_NAME = "notificationQueue";

const redisConnection = getBullMQConnectionOptions();

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
    },
});
