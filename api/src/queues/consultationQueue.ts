import { Queue } from "bullmq";
import { getIORedisClient } from "../config/redis.config";

export const CONSULTATION_QUEUE_NAME = "consultationQueue";


const redisConnection = getIORedisClient();

export const consultationQueue = redisConnection
    ? new Queue(CONSULTATION_QUEUE_NAME, { connection: redisConnection })
    : null;

if (!redisConnection) {
    console.log('[BullMQ] consultationQueue não inicializada: Redis indisponível (ambiente de desenvolvimento).');
}


