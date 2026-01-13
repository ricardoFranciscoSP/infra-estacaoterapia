import { Worker } from "bullmq";
import { waitForIORedisReady } from "../config/redis.config";
import { EMAIL_QUEUE_NAME, EmailJobData, getEmailQueue } from "../queues/emailQueue";
import { sendEmail } from "../services/send.email.service";

let emailWorkerStarted = false;
export let emailWorker: Worker<EmailJobData> | null = null;

/**
 * Inicializa o worker de email para processar envios assíncronos
 */
export async function startEmailWorker() {
    if (emailWorkerStarted) {
        console.log("⚠️ [EmailWorker] Worker já está rodando");
        return;
    }

    // Aguarda Redis realmente pronto
    const connection = await waitForIORedisReady(60000).catch((err) => {
        console.error('[EmailWorker] Redis indisponível ou não respondeu ao ping:', err);
        return null;
    });
    if (!connection) {
        console.log('[BullMQ] EmailWorker não inicializado: Redis indisponível.');
        return;
    }

    const queue = await getEmailQueue();
    if (!queue) {
        console.log('[BullMQ] EmailWorker não inicializado: emailQueue indisponível.');
        return;
    }

    // Reduzido para 2-3 para não sobrecarregar Redis e SMTP
    const concurrency = Number(process.env.EMAIL_WORKER_CONCURRENCY ?? "2");

    emailWorkerStarted = true;
    emailWorker = new Worker<EmailJobData>(
        EMAIL_QUEUE_NAME,
        async (job) => {
            const jobStartTime = Date.now();
            console.log(`[EmailWorker] INICIANDO job: ${job.id} (${job.name || 'sendEmail'})`, {
                type: job.data.type,
                to: job.data.to,
                subject: job.data.subject,
            });

            try {
                const { to, subject, htmlTemplate, templateData } = job.data;

                // Validação básica
                if (!to || !subject || !htmlTemplate) {
                    throw new Error('Dados de email incompletos');
                }

                // Envia o email usando o serviço existente
                await sendEmail({
                    to,
                    subject,
                    htmlTemplate,
                    templateData,
                });

                const duration = Date.now() - jobStartTime;
                console.log(`✅ [EmailWorker] Email enviado com sucesso em ${duration}ms - Job: ${job.id}`, {
                    to,
                    subject,
                });

                return { success: true, sentAt: new Date().toISOString() };
            } catch (error: unknown) {
                const duration = Date.now() - jobStartTime;
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                console.error(`❌ [EmailWorker] Erro ao enviar email após ${duration}ms - Job: ${job.id}:`, errorMessage);

                // Re-lança o erro para que o BullMQ possa fazer retry
                throw error;
            }
        },
        {
            connection,
            concurrency,
            limiter: {
                max: 10, // Máximo 10 emails por intervalo
                duration: 1000, // Por segundo
            },
        }
    );

    emailWorker.on('completed', (job) => {
        console.log(`✅ [EmailWorker] Job ${job.id} completado`);
    });

    emailWorker.on('failed', (job, err) => {
        console.error(`❌ [EmailWorker] Job ${job?.id} falhou:`, err.message);
    });

    emailWorker.on('error', (err) => {
        console.error(`❌ [EmailWorker] Erro no worker:`, err);
    });

    console.log(`✅ [EmailWorker] Worker inicializado com concorrência: ${concurrency}`);
}

/**
 * Para o worker de email
 */
export function stopEmailWorker() {
    if (emailWorker) {
        emailWorker.close();
        emailWorker = null;
        emailWorkerStarted = false;
        console.log('👋 EmailWorker finalizado');
    }
}

