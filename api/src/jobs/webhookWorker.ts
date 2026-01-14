// src/workers/webhook.worker.ts (ou onde estiver)
import { Worker, QueueEvents } from "bullmq";
import type { Redis } from "ioredis";
import { getIORedisClient } from "../config/redis.config"; // ← ajuste o caminho se necessário
import { attachQueueEventsLogging } from "../utils/bullmqLogs";
const WEBHOOK_QUEUE_NAME = "webhookProcessor";
import { WebHookService } from "../services/webhook.service";
import prisma from "../prisma/client";
import type { VindiBill } from "../types/vindi.types";
import type { Prisma } from "../generated/prisma/client";

let started = false;
export let worker: Worker | null = null;
export let events: QueueEvents | null = null;

// Função centralizada para obter conexão compatível com BullMQ
export function getQueueConnection(): Redis {
    const client = getIORedisClient();
    if (!client) {
        throw new Error("Redis client is not initialized");
    }
    return client;
}

export async function startWebhookWorker() {
    console.log("🚀 [WebhookWorker] ========== INICIANDO WEBHOOK WORKER ==========");
    console.log("🚀 [WebhookWorker] NODE_ENV:", process.env.NODE_ENV);
    
    if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [WebhookWorker] Ambiente de desenvolvimento detectado, mas inicializando worker mesmo assim para testes');
        // Não retorna mais - permite rodar em development também
    }
    
    if (started) {
        console.log("⚠️ [WebhookWorker] Worker já está rodando");
        return;
    }
    started = true;

    console.log("🔌 [WebhookWorker] Obtendo conexão Redis...");
    let connection: Redis;
    try {
        connection = getQueueConnection();
        console.log("✅ [WebhookWorker] Conexão Redis obtida com sucesso");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ [WebhookWorker] Erro ao obter conexão Redis:", errorMessage);
        throw error;
    }
    
    const concurrency = Number(process.env.WEBHOOK_WORKER_CONCURRENCY ?? "5");
    console.log("🔌 [WebhookWorker] Concorrência configurada:", concurrency);

    worker = new Worker(
        WEBHOOK_QUEUE_NAME,
        async (job) => {
            const jobStartTime = Date.now();
            console.log(`[WebhookWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);
            
            // Processa geração de tokens de consulta exatamente no horário agendado
            if (job.name === 'executarTarefaReserva') {
                try {
                    const { consultaId } = job.data as { consultaId: string };
                    if (!consultaId) {
                        throw new Error('consultaId ausente no job executarTarefaReserva');
                    }

                    // Usa função utilitária centralizada para gerar tokens
                    const { generateAgoraTokensForConsulta } = await import('../utils/scheduleAgoraToken');
                    await generateAgoraTokensForConsulta(consultaId);

                    const duration = Date.now() - jobStartTime;
                    console.log(`✅ [WebhookWorker] Tokens gerados (executarTarefaReserva) para consulta ${consultaId} em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`[WebhookWorker] Job ${job.id} (executarTarefaReserva) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }
            
            // ✅ Processa verificação de tokens agendados (jobs recorrentes)
            if (job.name === 'verifyTokens') {
                try {
                    const { jobVerificarTokensAgendados } = await import('./jobVerificarTokensAgendados');
                    await jobVerificarTokensAgendados();
                    const duration = Date.now() - jobStartTime;
                    console.log(`✅ [WebhookWorker] Verificação de tokens concluída (${job.name}) em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`❌ [WebhookWorker] Job ${job.id} (${job.name}) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }
            
            // Processa geração de tokens Agora
            if (job.name === 'generateAgoraTokens') {
                try {
                    const { consultaId } = job.data as { consultaId: string };
                    if (!consultaId) {
                        throw new Error('consultaId ausente no job generateAgoraTokens');
                    }

                    const { generateAgoraTokensForConsulta } = await import('../utils/scheduleAgoraToken');
                    await generateAgoraTokensForConsulta(consultaId);

                    const duration = Date.now() - jobStartTime;
                    console.log(`✅ [WebhookWorker] Tokens Agora gerados (generateAgoraTokens) para consulta ${consultaId} em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`❌ [WebhookWorker] Job ${job.id} (generateAgoraTokens) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }
            
            // Processa criação de registros faltantes em background
            if (job.name === 'criarRegistrosFaltantes') {
                try {
                    const { bill, customerId, codigoFatura, userId } = job.data as { 
                        bill: Record<string, unknown>; 
                        customerId: string; 
                        codigoFatura: string; 
                        userId: string 
                    };
                    // criarRegistrosFaltantes é um método privado, então usamos type assertion
                    await (WebHookService as unknown as { criarRegistrosFaltantes: (bill: Record<string, unknown>, customerId: string, codigoFatura: string, userId: string) => Promise<unknown> }).criarRegistrosFaltantes(bill, customerId, codigoFatura, userId);
                    const duration = Date.now() - jobStartTime;
                    console.log(`[WebhookWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`[WebhookWorker] Job ${job.id} (${job.name}) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }

            // Processa job de background separadamente (não precisa de eventId)
            if (job.name === 'processWebhookBackground') {
                try {
                    const { bill, dadosRapidos, createdAt } = job.data as { 
                        bill: VindiBill; 
                        dadosRapidos: { 
                            fatura: Prisma.FaturaGetPayload<{}> | null; 
                            financeiro: Prisma.FinanceiroGetPayload<{}> | null; 
                            userId: string | null; 
                            codigoFatura: string 
                        }; 
                        createdAt: string 
                    };
                    await WebHookService._processarBackground(bill, dadosRapidos, createdAt);
                    const duration = Date.now() - jobStartTime;
                    console.log(`[WebhookWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`[WebhookWorker] Job ${job.id} (${job.name}) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }

            // Processa geração diária de Agenda
            if (job.name === 'generateAgendaDaily') {
                try {
                    const { handleGenerateAgendaDaily } = await import('./jobGerarAgendaAutomatica');
                    await handleGenerateAgendaDaily();
                    const duration = Date.now() - jobStartTime;
                    console.log(`✅ [WebhookWorker] Geração diária de Agenda concluída (${job.name}) em ${duration}ms`);
                } catch (err) {
                    const duration = Date.now() - jobStartTime;
                    console.error(`❌ [WebhookWorker] Job ${job.id} (${job.name}) falhou após ${duration}ms:`, err);
                    throw err;
                }
                return;
            }

            // Processa job normal de webhook
            if (job.name !== "processWebhook") {
                console.log(`⚠️ [WebhookWorker] Job desconhecido: ${job.name}`, { jobId: job.id, jobData: job.data });
                return;
            }

            console.log(`🔍 [WebhookWorker] Processando job processWebhook`, {
                jobId: job.id,
                jobData: job.data,
                timestamp: new Date().toISOString()
            });

            const { eventId } = job.data as { eventId: string };
            console.log(`🔍 [WebhookWorker] EventId extraído: ${eventId}`);
            
            const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
            if (!event) {
                console.error(`❌ [WebhookWorker] WebhookEvent não encontrado no banco: ${eventId}`);
                return;
            }

            console.log(`✅ [WebhookWorker] Evento encontrado no banco:`, {
                eventId: event.id,
                eventType: event.eventType,
                provider: event.provider,
                status: event.status,
                attempts: event.attempts,
                hasPayload: !!event.payload
            });

            // incrementa tentativas e registra horário
            console.log(`🔍 [WebhookWorker] Atualizando tentativas do evento...`);
            await prisma.webhookEvent.update({
                where: { id: eventId },
                data: { attempts: { increment: 1 }, lastAttemptAt: new Date() }
            });

            try {
                console.log(`🔍 [WebhookWorker] Chamando WebHookService.processEvent...`);
                // WebHookService.processEvent aceita VindiWebhookPayload | VindiWebhookEvent | Record<string, unknown>
                await WebHookService.processEvent(event.payload as Record<string, unknown>);
                
                console.log(`🔍 [WebhookWorker] processEvent concluído, atualizando status para SUCCESS...`);
                await prisma.webhookEvent.update({
                    where: { id: eventId },
                    data: { status: 'SUCCESS', processedAt: new Date() }
                });
                
                const duration = Date.now() - jobStartTime;
                console.log(`✅ [WebhookWorker] Job ${job.id} (${job.name}) concluído com sucesso em ${duration}ms`);
            } catch (err) {
                const duration = Date.now() - jobStartTime;
                const errorMessage = err instanceof Error ? err.message : String(err);
                const errorStack = err instanceof Error ? err.stack : undefined;
                const attemptsMade = job.attemptsMade ?? 0;
                const maxAttempts = (job.opts.attempts as number) ?? 1;
                const isLastAttempt = attemptsMade + 1 >= maxAttempts;
                
                console.error(`❌ [WebhookWorker] Erro ao processar job:`, {
                    jobId: job.id,
                    eventId,
                    error: errorMessage,
                    stack: errorStack,
                    duration: `${duration}ms`,
                    attemptsMade,
                    maxAttempts,
                    isLastAttempt
                });
                
                if (isLastAttempt) {
                    console.log(`🔍 [WebhookWorker] Última tentativa, atualizando status para FAILED...`);
                    await prisma.webhookEvent.update({
                        where: { id: eventId },
                        data: { status: 'FAILED' }
                    });
                }
                throw err;
            }
        },
        { connection, concurrency }
    );

    worker.on("active", (job) => {
        console.log(`[WebhookWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    worker.on("completed", (job) => {
        console.log(`✅ [WebhookWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
    });
    worker.on("failed", (job, error) => {
        console.error(`❌ [WebhookWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });

    events = new QueueEvents(WEBHOOK_QUEUE_NAME, { connection });
    attachQueueEventsLogging(WEBHOOK_QUEUE_NAME, events);

    events.on("failed", ({ jobId, failedReason }) => {
        console.error(`💥 Webhook job failed: ${jobId} - ${failedReason}`);
    });

    events.on("completed", ({ jobId }) => {
        console.log(`✅ Webhook job completed: ${jobId}`);
    });

    worker.on("error", (err) => {
        console.error("🚨 Worker error:", err);
    });

    // Não registrar shutdown aqui - já está sendo tratado globalmente no server.ts
    // Múltiplos handlers de SIGINT/SIGTERM podem causar conflitos

    console.log("✅ [WebhookWorker] ========== WEBHOOK WORKER INICIADO COM SUCESSO ==========");
    console.log("✅ [WebhookWorker] Queue:", WEBHOOK_QUEUE_NAME);
    console.log("✅ [WebhookWorker] Concorrência:", concurrency);
    console.log("✅ [WebhookWorker] Pronto para processar webhooks da Vindi");
}