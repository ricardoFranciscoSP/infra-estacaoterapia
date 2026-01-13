import type { RenovacaoJobData } from '../types/controleConsulta.types';
import type { JobsOptions } from 'bullmq';
// src/workers/controleConsultaWorkers.ts
// Centraliza inicialização dos workers BullMQ para ControleConsultaMensal

// Centraliza inicialização de todos os workers BullMQ e jobs recorrentes
export async function startControleConsultaWorkers(io?: any) {
    if (process.env.NODE_ENV === 'development') {
        console.log('🚫 [Workers] Não inicializando workers BullMQ em ambiente de desenvolvimento.');
        return;
    }
    try {
        console.log('🟡 Iniciando workers BullMQ...');
        // Inicializa o worker de webhook
        const { startWebhookWorker } = await import('../jobs/webhookWorker');
        console.log('🔹 Inicializando webhook worker (fila: webhookProcessor)...');
        await startWebhookWorker();
        console.log('✅ Webhook worker inicializado com sucesso');

        // Inicializa o worker de sessão
        try {
            const { startSessionWorker, setWorkerSocketServer } = await import('./session.worker');
            console.log('🔹 Inicializando session worker (fila: webhookQueue)...');
            await startSessionWorker(io);
            console.log('✅ Session worker inicializado com sucesso');

            // Se io for fornecido depois, permite atualizar
            if (io) {
                setWorkerSocketServer(io);
            }
        } catch (err) {
            console.error('❌ Falha ao iniciar session worker:', err);
        }

        // Inicializa o worker e agenda o job mensal de geração de agendas dos psicólogos
        try {
            const { startAgendaWorker, scheduleMonthlyAgendaJob } = await import('../jobs/agendaWorker');
            const { agendaQueue } = await import('../queues/bullmqCentral');
            console.log('🔹 Inicializando agenda worker (fila: agendaQueue)...');
            startAgendaWorker();
            console.log('🟢 Agenda worker inicializado');
            await scheduleMonthlyAgendaJob();
            // Não dispara job imediato, apenas agenda o repeatable mensal
            if (agendaQueue) {
                console.log('✅ Agenda worker inicializado e job mensal agendado (sem disparo imediato)');
            } else {
                console.log('⚠️ agendaQueue não inicializada, job não agendado');
            }
        } catch (err) {
            console.error('❌ Falha ao iniciar agenda worker ou agendar job:', err);
        }

        // Inicializa o worker de consulta para processar jobs agendados
        try {
            const { startConsultationWorker } = await import('../jobs/consultationJobs');
            console.log('🔹 Inicializando consultation worker (fila: consultationQueue)...');
            await startConsultationWorker();
            console.log('✅ Consultation worker inicializado com sucesso');
        } catch (err) {
            console.error('❌ Falha ao iniciar consultation worker:', err);
            throw err; // Falha crítica - re-throw para evitar inicialização parcial
        }

        // Inicializa os workers de ControleConsultaMensal
        try {
            const { initializeControleConsultaWorkers } = await import('../jobs/controleConsultaJobs');
            const { renovacaoQueue } = await import('../queues/bullmqCentral');
            console.log('🔹 Inicializando workers de ControleConsultaMensal (fila: controleConsultaQueue)...');
            initializeControleConsultaWorkers();
            console.log('✅ Workers de ControleConsultaMensal inicializados');
            // Exporta função para adicionar jobs de renovação centralizada
            module.exports.addRenovacaoJob = async function addRenovacaoJob(data: RenovacaoJobData, opts?: JobsOptions) {
                if (renovacaoQueue) {
                    console.log(`[RenovacaoJob] Adicionando job:`, data);
                    await renovacaoQueue.add('renovacao', data, opts);
                } else {
                    console.log('⚠️ renovacaoQueue não inicializada, job não disparado');
                }
            };
        } catch (err) {
            console.error('❌ Falha ao iniciar workers de ControleConsultaMensal:', err);
        }

        // Inicializa o worker de email para envio assíncrono
        try {
            const { startEmailWorker } = await import('./emailWorker');
            console.log('🔹 Inicializando email worker (fila: emailQueue)...');
            startEmailWorker();
            console.log('✅ Email worker inicializado com sucesso');
        } catch (err) {
            console.error('❌ Falha ao iniciar email worker:', err);
        }
    } catch (err) {
        console.error('❌ Falha ao iniciar workers:', err);
    }
}
