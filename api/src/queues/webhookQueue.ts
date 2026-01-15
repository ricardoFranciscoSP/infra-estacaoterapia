// src/queues/webhookQueue.ts
import { Queue } from "bullmq";
import { getBullMQConnectionOptions } from "../config/redis.config";
let connection: ReturnType<typeof getBullMQConnectionOptions> | null = null;
let queue: Queue | null = null;

async function ensureConnection() {
    if (!connection) {
        connection = getBullMQConnectionOptions();
        console.log("🔌 [Queue] Conexão Redis pronta (lazy).");
    }
    return connection;
}

export async function getWebhookQueue() {
    const conn = await ensureConnection();
    if (!queue) {
        console.log("🔍 [QUEUE] Inicializando fila webhookProcessor (lazy)...");
        queue = new Queue("webhookProcessor", { connection: conn });
        queue.on("error", (err) => console.error("💥 Erro na fila webhookProcessor:", err));
        console.log("✅ [QUEUE] Fila webhookProcessor conectada ao Redis");
    }
    return queue;
}