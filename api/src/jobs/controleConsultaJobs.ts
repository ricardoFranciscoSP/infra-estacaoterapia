
import { Worker, Job, QueueEvents } from 'bullmq';
import { notificacaoQueue } from '../queues/controleConsultaQueue';
import { RenovacaoJobData, PagamentoJobData, NotificacaoJobData } from '../types/controleConsulta.types';
import prisma from '../prisma/client';
import { getBullMQConnectionOptions } from '../config/redis.config';
import { attachQueueEventsLogging } from '../utils/bullmqLogs';
import { nowBrasiliaTimestamp, nowBrasiliaDate, toBrasilia } from '../utils/timezone.util';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const redisConnection = getBullMQConnectionOptions();

// Workers de ControleConsultaMensal
// Workers: Renovação automática após 30 dias
export let renovacaoWorker: Worker<RenovacaoJobData> | null = null;
export let renovacaoEvents: QueueEvents | null = null;
let renovacaoWorkerStarted = false;

// Worker: Confirmação de pagamento via webhook
export let pagamentoWorker: Worker<PagamentoJobData> | null = null;
export let pagamentoEvents: QueueEvents | null = null;
let pagamentoWorkerStarted = false;

// Worker: Notificação ao cliente
export let notificacaoWorker: Worker<NotificacaoJobData> | null = null;
export let notificacaoEvents: QueueEvents | null = null;
let notificacaoWorkerStarted = false;

/**
 * Inicializa os workers de ControleConsultaMensal
 * Garante que sejam iniciados apenas uma vez
 */
export function initializeControleConsultaWorkers() {
    startRenovacaoWorker();
    startPagamentoWorker();
    startNotificacaoWorker();
}

function startRenovacaoWorker() {
    if (renovacaoWorkerStarted) {
        console.log("⚠️ [RenovacaoWorker] Worker já está rodando");
        return;
    }

    renovacaoWorkerStarted = true;
    renovacaoWorker = new Worker<RenovacaoJobData>(
        'renovacao-controle-consulta',
        async (job: Job<RenovacaoJobData>) => {
            const jobStartTime = nowBrasiliaTimestamp();
            console.log(`[RenovacaoWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);
            try {
                const { controleConsultaId, usuarioId, assinaturaPlanoId } = job.data;

                // Busca o ciclo relacionado ao ControleConsultaMensal
                const controleConsulta = await prisma.controleConsultaMensal.findUnique({
                    where: { Id: controleConsultaId },
                    include: { CicloPlano: true }
                });

                if (controleConsulta) {
                    // Marca o ControleConsultaMensal como completo
                    await prisma.controleConsultaMensal.update({
                        where: { Id: controleConsultaId },
                        data: { Status: 'Completo' }
                    });

                    // Se houver ciclo vinculado, marca como completo também
                    if (controleConsulta.CicloPlanoId && controleConsulta.CicloPlano) {
                        await prisma.cicloPlano.update({
                            where: { Id: controleConsulta.CicloPlanoId },
                            data: { Status: 'Completo' }
                        });
                        console.log(`[RenovacaoWorker] Ciclo ${controleConsulta.CicloPlanoId} marcado como completo`);
                    }
                }

                // Nota: A criação de novo ciclo é feita pelo webhook quando o pagamento é aprovado
                // Este job apenas marca o ciclo anterior como completo
                // O webhook.handleBillPaid() cria o novo ciclo automaticamente
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.log(`[RenovacaoWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
            } catch (error) {
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.error(`❌ [RenovacaoWorker] Erro ao processar job ${job.name} após ${duration}ms:`, error);
            }
        },
        { connection: redisConnection }
    );
    renovacaoWorker.on("active", (job) => {
        console.log(`[RenovacaoWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    renovacaoWorker.on("completed", (job) => {
        console.log(`✅ [RenovacaoWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
    });
    renovacaoWorker.on("failed", (job, error) => {
        console.error(`❌ [RenovacaoWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });
    renovacaoEvents = new QueueEvents('renovacao-controle-consulta', { connection: redisConnection });
    attachQueueEventsLogging('renovacao-controle-consulta', renovacaoEvents);
    renovacaoEvents.on("waiting", ({ jobId }: { jobId: string }) => {
        console.log(`[RenovacaoWorker] Job WAITING: ${jobId}`);
    });
    renovacaoEvents.on("delayed", ({ jobId, delay }: { jobId: string; delay: number }) => {
        console.log(`[RenovacaoWorker] Job DELAYED: ${jobId}, delay: ${delay}ms`);
    });

    // Não registrar shutdown aqui - já está sendo tratado globalmente no server.ts
    // Múltiplos handlers de SIGINT/SIGTERM podem causar conflitos

    console.log("✅ [RenovacaoWorker] Worker iniciado");
}

function startPagamentoWorker() {
    if (pagamentoWorkerStarted) {
        console.log("⚠️ [PagamentoWorker] Worker já está rodando");
        return;
    }

    pagamentoWorkerStarted = true;
    pagamentoWorker = new Worker<PagamentoJobData>(
        'pagamento-controle-consulta',
        async (job: Job<PagamentoJobData>) => {
            const jobStartTime = nowBrasiliaTimestamp();
            console.log(`[PagamentoWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);
            try {
                const { controleConsultaId, usuarioId, faturaId } = job.data;
                const tipoFatura: 'Plano' | 'ConsultaAvulsa' | 'PrimeiraConsulta' =
                    job.data.tipo === 'ConsultaAvulsa' ? 'ConsultaAvulsa' :
                        job.data.tipo === 'PrimeiraConsulta' ? 'PrimeiraConsulta' : 'Plano';
                await prisma.fatura.create({
                    data: {
                        CodigoFatura: faturaId,
                        Valor: job.data.valor ?? 0,
                        Status: 'Paid',
                        DataEmissao: job.data.dataEmissao ? toBrasilia(job.data.dataEmissao).toDate() : nowBrasiliaDate(),
                        DataVencimento: job.data.dataVencimento ? toBrasilia(job.data.dataVencimento).toDate() : nowBrasiliaDate(),
                        Tipo: tipoFatura,
                        CustomerId: job.data.customerId ?? '',
                        UserId: usuarioId,
                    }
                });
                const controle = await prisma.controleConsultaMensal.update({
                    where: { Id: controleConsultaId },
                    data: { Status: 'Ativo' }
                });
                const validade = controle.Validade instanceof Date ? controle.Validade : new Date(controle.Validade);
                const mensagem = `Seu plano foi renovado. Suas 4 consultas estão válidas até ${validade.toLocaleDateString('pt-BR')}.`;
                if (notificacaoQueue) {
                    await notificacaoQueue.add('notificacao', {
                        usuarioId,
                        mensagem,
                        validade
                    }, {
                        jobId: `notificacao-${controleConsultaId}`,
                        removeOnComplete: true
                    });
                } else {
                    console.log('⚠️ notificacaoQueue não inicializada, job não disparado');
                }
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.log(`[PagamentoWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
            } catch (error) {
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.error(`❌ [PagamentoWorker] Erro ao processar job ${job.name} após ${duration}ms:`, error);
            }
        },
        { connection: redisConnection }
    );
    pagamentoWorker.on("active", (job) => {
        console.log(`[PagamentoWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    pagamentoWorker.on("completed", (job) => {
        console.log(`✅ [PagamentoWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
    });
    pagamentoWorker.on("failed", (job, error) => {
        console.error(`❌ [PagamentoWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });
    pagamentoEvents = new QueueEvents('pagamento-controle-consulta', { connection: redisConnection });
    attachQueueEventsLogging('pagamento-controle-consulta', pagamentoEvents);
    pagamentoEvents.on("waiting", ({ jobId }: { jobId: string }) => {
        console.log(`[PagamentoWorker] Job WAITING: ${jobId}`);
    });
    pagamentoEvents.on("delayed", ({ jobId, delay }: { jobId: string; delay: number }) => {
        console.log(`[PagamentoWorker] Job DELAYED: ${jobId}, delay: ${delay}ms`);
    });

    // Não registrar shutdown aqui - já está sendo tratado globalmente no server.ts

    console.log("✅ [PagamentoWorker] Worker iniciado");
}

function startNotificacaoWorker() {
    if (notificacaoWorkerStarted) {
        console.log("⚠️ [NotificacaoWorker] Worker já está rodando");
        return;
    }

    notificacaoWorkerStarted = true;
    notificacaoWorker = new Worker<NotificacaoJobData>(
        'notificacao-controle-consulta',
        async (job: Job<NotificacaoJobData>) => {
            const jobStartTime = nowBrasiliaTimestamp();
            console.log(`[NotificacaoWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);
            try {
                const { usuarioId, mensagem, validade } = job.data;
                // Integração com serviço de notificação via WebSocket
                // ...existing code...
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.log(`[NotificacaoWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
            } catch (error) {
                const duration = nowBrasiliaTimestamp() - jobStartTime;
                console.error(`❌ [NotificacaoWorker] Erro ao processar job ${job.name} após ${duration}ms:`, error);
            }
        },
        { connection: redisConnection }
    );
    notificacaoWorker.on("active", (job) => {
        console.log(`[NotificacaoWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    notificacaoWorker.on("completed", (job) => {
        console.log(`✅ [NotificacaoWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
    });
    notificacaoWorker.on("failed", (job, error) => {
        console.error(`❌ [NotificacaoWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });
    notificacaoEvents = new QueueEvents('notificacao-controle-consulta', { connection: redisConnection });
    attachQueueEventsLogging('notificacao-controle-consulta', notificacaoEvents);
    notificacaoEvents.on("waiting", ({ jobId }: { jobId: string }) => {
        console.log(`[NotificacaoWorker] Job WAITING: ${jobId}`);
    });
    notificacaoEvents.on("delayed", ({ jobId, delay }: { jobId: string; delay: number }) => {
        console.log(`[NotificacaoWorker] Job DELAYED: ${jobId}, delay: ${delay}ms`);
    });

    // Não registrar shutdown aqui - já está sendo tratado globalmente no server.ts

    console.log("✅ [NotificacaoWorker] Worker iniciado");
}
