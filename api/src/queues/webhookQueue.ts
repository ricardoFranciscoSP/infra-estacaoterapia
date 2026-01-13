// src/queues/webhookQueue.ts
import { Queue } from "bullmq";
import type { Redis } from "ioredis";
let connection: Redis | null = null;
let queue: Queue | null = null;

async function ensureConnection() {
    if (!connection) {
        const { getIORedisClient } = await import('../config/redis.config');
        connection = getIORedisClient();
        console.log("🔌 [Queue] Conexão Redis pronta (lazy).");
    }
    return connection;
}

export async function getWebhookQueue() {
    const conn = await ensureConnection();
    if (!conn) {
        console.log('[BullMQ] webhookQueue não inicializada: Redis indisponível (ambiente de desenvolvimento).');
        return null;
    }
    if (!queue) {
        console.log("🔍 [QUEUE] Inicializando fila webhookProcessor (lazy)...");
        queue = new Queue("webhookProcessor", { connection: conn });
        queue.on("error", (err) => console.error("💥 Erro na fila webhookProcessor:", err));
        console.log("✅ [QUEUE] Fila webhookProcessor conectada ao Redis");
    }
    return queue;
}