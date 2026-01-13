// src/controllers/webhook.controller.ts
import { Request, Response } from "express";
import prisma from "../prisma/client";
import { WebHookService } from "../services/webhook.service";
import { JobService } from "../services/jobService";
import { getWebhookQueue } from "../workers/worker.webhook";

export class WebHookController {
    /**
     * Recebe e processa eventos de webhook.
     * @param req Request do Express contendo o evento.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    static async handleWebhook(req: Request, res: Response) {
        try {
            // Padrão unificado: salvar JSON cru + enfileirar com delay configurável (padrão: 35s)
            const provider = String(req.query.provider || req.headers['x-webhook-provider'] || 'generic');
            const eventType: string = req.body?.event?.type || req.body?.type || req.body?.eventType || 'unknown';
            const payload = req.body;

            if (eventType === 'unknown') {
                console.warn('Webhook recebido sem eventType claro. Prosseguindo como generic.');
            }

            const event = await prisma.webhookEvent.create({
                data: { provider, eventType, payload }
            });

            // Delay reduzido para processamento mais rápido (5s ao invés de 35s)
            const initialDelayMs = Number(process.env.WEBHOOK_INITIAL_DELAY_MS ?? 5_000);
            const retryBackoffMs = Number(process.env.WEBHOOK_RETRY_BACKOFF_MS ?? 5_000);
            const retryAttempts = Number(process.env.WEBHOOK_RETRY_ATTEMPTS ?? 8);

            const queue = getWebhookQueue();
            if (!queue) {
                console.error('[WebhookController] Fila de webhook não disponível');
                return res.status(500).json({ message: "Fila de webhook não disponível" });
            }

            await queue.add(
                "processWebhook",
                { eventId: event.id },
                {
                    jobId: String(event.id),
                    delay: initialDelayMs,
                    attempts: retryAttempts,
                    backoff: { type: "fixed", delay: retryBackoffMs },
                    removeOnComplete: 1000,
                    removeOnFail: false,
                }
            );

            return res.status(200).json({ message: "Webhook recebido e enfileirado com sucesso" });
        } catch (error) {
            console.error("Erro ao processar webhook:", error);
            return res.status(500).json({ message: "Erro ao processar webhook" });
        }
    }

    static async vindiWebhook(req: Request, res: Response) {
        const startTime = Date.now();
        console.log(`📥 [WebhookController] ========== WEBHOOK VINDI RECEBIDO ==========`);
        console.log(`📥 [WebhookController] Timestamp: ${new Date().toISOString()}`);
        console.log(`📥 [WebhookController] Method: ${req.method}`);
        console.log(`📥 [WebhookController] Path: ${req.path}`);
        console.log(`📥 [WebhookController] Headers:`, {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip']
        });
        console.log(`📥 [WebhookController] Body recebido:`, JSON.stringify(req.body, null, 2).substring(0, 2000));
        console.log(`📥 [WebhookController] Body type:`, typeof req.body);
        console.log(`📥 [WebhookController] Body keys:`, req.body && typeof req.body === 'object' ? Object.keys(req.body) : 'not an object');
        
        try {
            const eventType: string = req.body?.event?.type || req.body?.type || req.body?.eventType || "unknown";
            const payload = req.body;
            
            console.log(`📥 [WebhookController] EventType extraído: ${eventType}`);
            console.log(`📥 [WebhookController] Payload structure:`, {
                hasEvent: !!(payload?.event),
                hasType: !!(payload?.type),
                hasData: !!(payload?.data),
                hasBill: !!(payload?.data?.bill || payload?.bill),
                eventType: payload?.event?.type || payload?.type
            });

            // 1️⃣ Armazena o webhook cru no banco (não bloqueia)
            console.log(`💾 [WebhookController] Salvando webhook no banco...`, {
                provider: "vindi",
                eventType,
                payloadSize: JSON.stringify(payload).length
            });
            
            let event;
            try {
                event = await prisma.webhookEvent.create({
                    data: {
                        provider: "vindi",
                        eventType,
                        payload,
                    },
                });
                console.log(`✅ [WebhookController] Webhook salvo no banco com sucesso`, {
                    eventId: event.id,
                    eventType: event.eventType,
                    createdAt: event.createdAt
                });
            } catch (dbError) {
                console.error(`❌ [WebhookController] ERRO ao salvar webhook no banco:`, {
                    error: dbError instanceof Error ? dbError.message : String(dbError),
                    stack: dbError instanceof Error ? dbError.stack : undefined,
                    eventType,
                    payloadPreview: JSON.stringify(payload).substring(0, 500)
                });
                throw dbError;
            }

            // 1.5️⃣ Grava payload na tabela Job para processamento posterior
            // Isso permite processar ConsultaAvulsa e CreditoAvulso depois que todas as tabelas estiverem preenchidas
            const eventosComCompras = ['bill_paid', 'subscription_charged', 'invoice_charged'];
            if (eventosComCompras.includes(eventType)) {
                try {
                    // Job para atualizar ConsultaAvulsa e CreditoAvulso
                    await JobService.createJob(
                        `vindi_${eventType}`,
                        {
                            eventType,
                            payload,
                            webhookEventId: event.id,
                            codigoFatura: payload?.data?.bill?.id || payload?.bill?.id || payload?.data?.invoice?.id,
                            customerId: payload?.data?.bill?.customer?.id || payload?.bill?.customer?.id || payload?.data?.invoice?.customer?.id
                        },
                        new Date(), // RunAt: agora (mas será processado depois que tabelas estiverem preenchidas)
                        { maxAttempts: 3 }
                    );
                    console.log(`✅ [WebhookController] Job criado na tabela Job para evento ${eventType}`);

                    // Job para atualizar status das tabelas (Financeiro, Fatura, ConsultaAvulsa, CreditoAvulso)
                    const billId = payload?.data?.bill?.id || payload?.bill?.id || payload?.data?.invoice?.id;
                    if (billId) {
                        await JobService.createJob(
                            'update_status_tabelas',
                            {
                                eventType,
                                payload,
                                webhookEventId: event.id,
                                bill: {
                                    id: billId,
                                    status: payload?.data?.bill?.status || payload?.bill?.status || 'Paid'
                                },
                                codigoFatura: String(billId),
                                customerId: payload?.data?.bill?.customer?.id || payload?.bill?.customer?.id || payload?.data?.invoice?.customer?.id
                            },
                            new Date(), // RunAt: agora
                            { maxAttempts: 3 }
                        );
                        console.log(`✅ [WebhookController] Job de atualização de status criado para bill.id: ${billId}`);
                    }
                } catch (jobError) {
                    console.error(`⚠️ [WebhookController] Erro ao criar Job (não crítico):`, jobError);
                    // Não falha o processamento se não conseguir criar Job
                }
            }

            // 2️⃣ EVENTOS CRÍTICOS: Enfileira com PRIORIDADE MÁXIMA (delay 0) para processamento rápido
            const eventosCriticos = ['bill_paid', 'subscription_charged', 'invoice_charged'];
            const isEventoCritico = eventosCriticos.includes(eventType);

            const queue = getWebhookQueue();
            if (!queue) {
                console.error('[WebhookController] Fila de webhook não disponível');
                return res.status(500).json({ message: "Fila de webhook não disponível" });
            }

            if (isEventoCritico) {
                console.log(`⚡ [WebhookController] Evento crítico detectado (${eventType}), enfileirando com PRIORIDADE MÁXIMA...`);
                
                // Retorna sucesso à Vindi IMEDIATAMENTE (não aguarda processamento)
                res.status(200).json({ message: "Webhook recebido e processamento iniciado." });
                
                // Enfileira com prioridade máxima (100) e delay 0 para processamento imediato pelo worker
                // Isso evita problemas de memória do setImmediate e permite controle de concorrência
                const retryBackoffMs = Number(process.env.WEBHOOK_RETRY_BACKOFF_MS ?? 5_000);
                const retryAttempts = Number(process.env.WEBHOOK_RETRY_ATTEMPTS ?? 8);
                
                await queue.add(
                    "processWebhook",
                    { eventId: String(event.id) },
                    {
                        jobId: String(event.id), // evita duplicidade
                        delay: 0, // Sem delay para eventos críticos
                        priority: 100, // Prioridade máxima (BullMQ: números maiores = maior prioridade)
                        attempts: retryAttempts,
                        backoff: { type: "fixed", delay: retryBackoffMs },
                        removeOnComplete: 1000,
                        removeOnFail: false,
                    }
                );
                
                console.log(`✅ [WebhookController] Evento crítico ${eventType} enfileirado com prioridade máxima`);
                return; // Retorna imediatamente
            }

            // 3️⃣ EVENTOS NÃO-CRÍTICOS: Enfileira com delay normal e prioridade média
            console.log(`📤 [WebhookController] Enfileirando webhook não-crítico para processamento...`);
            const initialDelayMs = Number(process.env.WEBHOOK_INITIAL_DELAY_MS ?? 3_000);
            const retryBackoffMs = Number(process.env.WEBHOOK_RETRY_BACKOFF_MS ?? 5_000);
            const retryAttempts = Number(process.env.WEBHOOK_RETRY_ATTEMPTS ?? 8);

            await queue.add(
                "processWebhook",
                { eventId: String(event.id) },
                {
                    jobId: String(event.id), // evita duplicidade
                    delay: initialDelayMs,
                    priority: 10, // Prioridade média para eventos não-críticos
                    attempts: retryAttempts,
                    backoff: { type: "fixed", delay: retryBackoffMs },
                    removeOnComplete: 1000,
                    removeOnFail: false,
                }
            );

            // 4️⃣ Retorna sucesso à Vindi
            const duration = Date.now() - startTime;
            console.log(`✅ [WebhookController] Webhook processado com sucesso`, {
                eventType,
                eventId: event.id,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            res.status(200).json({ message: "Webhook recebido e armazenado com sucesso." });
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error(`❌ [WebhookController] ERRO ao registrar webhook:`, {
                error: errorMessage,
                stack: errorStack,
                duration: `${duration}ms`,
                body: req.body,
                headers: req.headers,
                timestamp: new Date().toISOString()
            });
            res.status(500).json({ error: "Erro interno ao registrar webhook" });
        }
    }
}
