import { Queue } from "bullmq";
import { getBullMQConnectionOptions } from "../config/redis.config";

export const CONSULTATION_QUEUE_NAME = "consultationQueue";


const redisConnection = getBullMQConnectionOptions();

export const consultationQueue = new Queue(CONSULTATION_QUEUE_NAME, { connection: redisConnection });


