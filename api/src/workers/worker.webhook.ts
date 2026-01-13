import { Queue } from "bullmq";
import { webhookQueue } from "../queues/bullmqCentral";

export function getWebhookQueue(): Queue | null {
    console.log(`📋 [WebhookQueue] Tentando obter fila de webhook...`);
    if (webhookQueue) {
        console.log(`✅ [WebhookQueue] Fila já existe, retornando instância existente`);
        return webhookQueue;
    }
    console.log('[BullMQ] worker.webhook não inicializado: webhookQueue indisponível (ambiente de desenvolvimento ou erro de conexão).');
    return null;
}
