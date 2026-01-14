import { QueueEvents } from "bullmq";

const getRedisContext = () => ({
    host: process.env.REDIS_HOST || "redis",
    port: Number(process.env.REDIS_PORT || 6379),
    db: Number(process.env.REDIS_DB || 0),
    url: process.env.REDIS_URL ? "definida" : "não definida",
});

const formatError = (error: unknown) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return {
        name: "UnknownError",
        message: String(error),
        stack: undefined,
    };
};

export const attachQueueEventsLogging = (queueName: string, events: QueueEvents) => {
    events.on("error", (error) => {
        const details = formatError(error);
        const redis = getRedisContext();

        console.error(`❌ [BullMQ] QueueEvents error (${queueName})`);
        console.error(`   • Redis: ${redis.host}:${redis.port} (db ${redis.db})`);
        console.error(`   • REDIS_URL: ${redis.url}`);
        console.error(`   • Error: ${details.name}: ${details.message}`);
        if (details.stack) {
            console.error(`   • Stack: ${details.stack}`);
        }

        if (details.message.includes("Command timed out")) {
            console.error("   • Dica: erro típico de timeout em BRPOP/QueueEvents");
            console.error("   • Verifique latência do Redis, CPU/memória e rede do Swarm");
        }
    });
};
