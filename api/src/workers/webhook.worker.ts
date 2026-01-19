
import { Worker, QueueEvents } from "bullmq";
import { webhookQueue } from "../queues/bullmqCentral";
import prisma from '../prisma/client';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { VindiBill } from '../types/vindi.types';
import type { Prisma } from '../generated/prisma';
import { nowBrasiliaTimestamp, nowBrasiliaDate, toBrasiliaISO, BRASILIA_TIMEZONE } from '../utils/timezone.util';
import { attachQueueEventsLogging } from '../utils/bullmqLogs';

dayjs.extend(utc);
dayjs.extend(timezone);

let started = false;
let worker: Worker | null = null;
let events: QueueEvents | null = null;


export async function startWebhookWorker() {
    if (started) return;
    started = true;

    if (!webhookQueue) {
        console.log('[BullMQ] webhook.worker não inicializado: webhookQueue indisponível (ambiente de desenvolvimento ou erro de conexão).');
        return;
    }
    // Otimizado: reduzido de 5 para 3 para economizar CPU
    const concurrency = Number(process.env.WEBHOOK_WORKER_CONCURRENCY ?? "3");

    worker = new Worker(
        webhookQueue.name,
        async (job) => {
            const startTime = nowBrasiliaTimestamp();
            const { eventId } = job.data;

            try {
                console.log(`⚡ [WebhookWorker] ========== INICIANDO PROCESSAMENTO DO JOB ==========`);
                console.log(`⚡ [WebhookWorker] Job ID: ${job.id}`);
                console.log(`⚡ [WebhookWorker] Job Name: ${job.name}`);
                console.log(`⚡ [WebhookWorker] EventId: ${eventId}`);
                console.log(`⚡ [WebhookWorker] Timestamp: ${toBrasiliaISO()} (${BRASILIA_TIMEZONE})`);

                // Busca o evento do webhook no banco
                console.log(`🔍 [WebhookWorker] Buscando evento no banco...`);
                const event = await prisma.webhookEvent.findUnique({
                    where: { id: eventId }
                });

                if (!event) {
                    console.error(`❌ [WebhookWorker] Evento não encontrado no banco: ${eventId}`);
                    throw new Error(`Evento não encontrado: ${eventId}`);
                }

                console.log(`✅ [WebhookWorker] Evento encontrado no banco:`, {
                    eventId: event.id,
                    eventType: event.eventType,
                    provider: event.provider,
                    status: event.status,
                    attempts: event.attempts,
                    hasPayload: !!event.payload
                });

                // Verifica se já foi processado com sucesso
                if (event.status === 'SUCCESS') {
                    console.log(`ℹ️ [WebhookWorker] Evento ${eventId} já foi processado com sucesso, pulando...`);
                    return;
                }

                // Atualiza status para PENDING durante processamento
                console.log(`🔍 [WebhookWorker] Atualizando status do evento para PENDING...`);
                await prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: {
                        status: 'PENDING',
                        attempts: { increment: 1 },
                        lastAttemptAt: new Date()
                    }
                });
                console.log(`✅ [WebhookWorker] Status atualizado para PENDING`);

                // Importa o WebHookService dinamicamente para evitar circular dependency
                const { WebHookService } = await import('../services/webhook.service');

                // PROCESSAMENTO RÁPIDO para bill_paid: libera consultas IMEDIATAMENTE
                const eventType = event.eventType;
                
                // Função auxiliar para converter JsonValue em objeto válido
                const normalizePayload = (payload: unknown): Record<string, unknown> | null => {
                    if (!payload) return null;
                    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
                        return payload as Record<string, unknown>;
                    }
                    if (typeof payload === 'string') {
                        try {
                            const parsed = JSON.parse(payload);
                            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                return parsed as Record<string, unknown>;
                            }
                        } catch {
                            return null;
                        }
                    }
                    return null;
                };

                const normalizedPayload = normalizePayload(event.payload);
                
                console.log(`🔍 [WebhookWorker] Evento detectado: ${eventType}`, {
                    eventId,
                    hasPayload: !!normalizedPayload,
                    payloadKeys: normalizedPayload ? Object.keys(normalizedPayload) : []
                });

                if (eventType === 'bill_paid') {
                    console.log(`⚡ [WebhookWorker] Detectado evento crítico bill_paid, processando rapidamente...`);

                    if (!normalizedPayload) {
                        console.warn('[WebhookWorker] Payload não é um objeto válido, usando processamento normal');
                        await WebHookService.processEvent({ event: normalizedPayload || {} } as Record<string, unknown>);
                        return;
                    }

                    console.log('🔍 [WebhookWorker] Estrutura do payload:', {
                        hasPayload: !!normalizedPayload,
                        hasEvent: !!(normalizedPayload.event),
                        hasData: !!(normalizedPayload.data),
                        hasBill: !!(normalizedPayload.bill),
                        payloadKeys: Object.keys(normalizedPayload)
                    });

                    // Tenta extrair bill de diferentes estruturas
                    const eventObj = normalizedPayload.event as Record<string, unknown> | undefined;
                    const dataObj = normalizedPayload.data as Record<string, unknown> | undefined;
                    const billObj = normalizedPayload.bill as Record<string, unknown> | undefined;
                    
                    const bill = (eventObj?.data as Record<string, unknown> | undefined)?.bill ||
                                dataObj?.bill ||
                                billObj ||
                                eventObj?.bill;
                    
                    const createdAt = (eventObj?.created_at as string | undefined) ||
                                     (normalizedPayload.created_at as string | undefined) ||
                                     ((eventObj?.data as Record<string, unknown> | undefined)?.created_at as string | undefined);

                    console.log('🔍 [WebhookWorker] Bill extraído:', {
                        hasBill: !!bill,
                        billId: (bill as Record<string, unknown>)?.id,
                        customerId: (bill as Record<string, unknown>)?.customer as Record<string, unknown> | undefined,
                        amount: (bill as Record<string, unknown>)?.amount,
                        status: (bill as Record<string, unknown>)?.status,
                        createdAt
                    });

                    if (bill && typeof bill === 'object' && bill !== null) {
                        // Processa rapidamente: libera consultas IMEDIATAMENTE (crítico)
                        const billTyped = bill as VindiBill;
                        
                        const resultado = await WebHookService._liberarConsultasRapido(billTyped, createdAt);

                        if (resultado.success && resultado.data) {
                            console.log(`⚡ [WebhookWorker] Consultas liberadas com sucesso em modo rápido`);

                            // Enfileira processamento de background (não-crítico) sem aguardar
                            // Só enfileira se fatura e financeiro não forem null
                            const { fatura, financeiro } = resultado.data;
                            if (fatura && financeiro) {
                                // Type assertion para garantir que TypeScript reconheça que não são null
                                const dadosRapidos: {
                                    fatura: Prisma.FaturaGetPayload<{}>;
                                    financeiro: Prisma.FinanceiroGetPayload<{}>;
                                    userId: string | null;
                                    codigoFatura: string;
                                } = {
                                    fatura: fatura as Prisma.FaturaGetPayload<{}>,
                                    financeiro: financeiro as Prisma.FinanceiroGetPayload<{}>,
                                    userId: resultado.data.userId,
                                    codigoFatura: resultado.data.codigoFatura
                                };
                                
                                await WebHookService._enfileirarProcessamentoBackground(
                                    billTyped,
                                    dadosRapidos,
                                    createdAt
                                ).catch((err: unknown) => {
                                    const errorMessage = err instanceof Error ? err.message : String(err);
                                    console.warn('[WebhookWorker] Erro ao enfileirar background (não crítico):', errorMessage);
                                });
                            } else {
                                console.warn('[WebhookWorker] Fatura ou Financeiro são null, não é possível enfileirar processamento em background');
                            }
                        } else {
                            // Se falhou o processamento rápido, tenta processamento completo
                            console.warn(`[WebhookWorker] Processamento rápido falhou (${resultado.error}), tentando processamento completo...`);
                            await WebHookService.processEvent(normalizedPayload as Record<string, unknown>);
                        }
                    } else {
                        console.warn('[WebhookWorker] Bill não encontrado no payload, usando processamento normal');
                        await WebHookService.processEvent(normalizedPayload as Record<string, unknown>);
                    }
                } else {
                    // Para outros eventos, usa processamento normal
                    // Passa o payload normalizado como objeto
                    const payloadToProcess = normalizedPayload || { event: {} };
                    await WebHookService.processEvent(payloadToProcess as Record<string, unknown>);
                }

                // Atualiza status para SUCCESS
                console.log(`🔍 [WebhookWorker] Atualizando status do evento para SUCCESS...`);
                await prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: {
                        status: 'SUCCESS',
                        processedAt: new Date()
                    }
                });

                const duration = nowBrasiliaTimestamp() - startTime;
                console.log(`✅ [WebhookWorker] ========== JOB PROCESSADO COM SUCESSO ==========`);
                console.log(`✅ [WebhookWorker] Job ID: ${job.id}`);
                console.log(`✅ [WebhookWorker] EventId: ${eventId}`);
                console.log(`✅ [WebhookWorker] Duração: ${duration}ms`);
                console.log(`✅ [WebhookWorker] Timestamp: ${toBrasiliaISO()} (${BRASILIA_TIMEZONE})`);

            } catch (error: unknown) {
                const duration = nowBrasiliaTimestamp() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                console.error(`💥 [WebhookWorker] ========== ERRO AO PROCESSAR JOB ==========`);
                console.error(`💥 [WebhookWorker] Job ID: ${job.id}`);
                console.error(`💥 [WebhookWorker] EventId: ${eventId}`);
                console.error(`💥 [WebhookWorker] Duração: ${duration}ms`);
                console.error(`💥 [WebhookWorker] Erro:`, {
                    message: errorMessage,
                    stack: errorStack,
                    timestamp: toBrasiliaISO()
                });

                // Atualiza status para FAILED
                console.log(`🔍 [WebhookWorker] Atualizando status do evento para FAILED...`);
                await prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: { 
                        status: 'FAILED',
                        lastAttemptAt: new Date()
                    }
                }).catch((err: unknown) => {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    console.error('❌ [WebhookWorker] Erro ao atualizar status FAILED:', errMsg);
                });

                // Re-throw para que o BullMQ possa fazer retry
                throw error;
            }
        },
        { connection: webhookQueue.opts.connection, concurrency }
    );

    events = new QueueEvents(webhookQueue.name, { connection: webhookQueue.opts.connection });
    attachQueueEventsLogging(webhookQueue.name, events);

    events.on("failed", ({ jobId, failedReason }) =>
        console.error(`💥 Webhook job failed: ${jobId} - ${failedReason}`)
    );
    events.on("completed", ({ jobId }) =>
        console.log(`✅ Webhook job completed: ${jobId}`)
    );

    worker.on("error", (err) => console.error("🚨 Worker error:", err));

    const shutdown = async () => {
        console.log("🛑 Finalizando Webhook Worker...");
        await Promise.allSettled([worker?.close?.(), events?.close?.()]);
        console.log("👋 Webhook Worker finalizado.");
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    console.log("✅ Webhook worker iniciado com concorrência:", concurrency);
}

// REMOVIDO: Inicialização automática ao carregar o módulo
// Os workers devem ser iniciados apenas através de controleConsultaWorkers.ts
// startWebhookWorker();
