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
        // Inicializa todos os workers em background, sem travar a API
        (async () => {
            try {
                const { startWebhookWorker } = await import('../jobs/webhookWorker');
                console.log('🔹 Inicializando webhook worker (fila: webhookProcessor)...');
                startWebhookWorker().catch(err => console.error('❌ Falha ao iniciar webhook worker:', err));
                console.log('✅ Webhook worker inicialização disparada');
            } catch (err) {
                console.error('❌ Falha ao importar webhook worker:', err);
            }
            try {
                const { startSessionWorker, setWorkerSocketServer } = await import('./session.worker');
                console.log('🔹 Inicializando session worker (fila: webhookQueue)...');
                startSessionWorker(io).catch(err => console.error('❌ Falha ao iniciar session worker:', err));
                if (io) setWorkerSocketServer(io);
                console.log('✅ Session worker inicialização disparada');
            } catch (err) {
                console.error('❌ Falha ao importar session worker:', err);
            }
            try {
                const { startAgendaWorker, scheduleMonthlyAgendaJob } = await import('../jobs/agendaWorker');
                const { agendaQueue } = await import('../queues/bullmqCentral');
                console.log('🔹 Inicializando agenda worker (fila: agendaQueue)...');
                startAgendaWorker();
                scheduleMonthlyAgendaJob().catch(err => console.error('❌ Falha ao agendar job mensal:', err));
                if (agendaQueue) {
                    console.log('✅ Agenda worker inicialização disparada e job mensal agendamento disparado');
                } else {
                    console.log('⚠️ agendaQueue não inicializada, job não agendado');
                }
            } catch (err) {
                console.error('❌ Falha ao importar agenda worker:', err);
            }
            try {
                const { startConsultationWorker } = await import('../jobs/consultationJobs');
                console.log('🔹 Inicializando consultation worker (fila: consultationQueue)...');
                startConsultationWorker().catch(err => console.error('❌ Falha ao iniciar consultation worker:', err));
                console.log('✅ Consultation worker inicialização disparada');
            } catch (err) {
                console.error('❌ Falha ao importar consultation worker:', err);
            }
            try {
                const { initializeControleConsultaWorkers } = await import('../jobs/controleConsultaJobs');
                const { renovacaoQueue } = await import('../queues/bullmqCentral');
                console.log('🔹 Inicializando workers de ControleConsultaMensal (fila: controleConsultaQueue)...');
                initializeControleConsultaWorkers();
                module.exports.addRenovacaoJob = async function addRenovacaoJob(data: RenovacaoJobData, opts?: JobsOptions) {
                    if (renovacaoQueue) {
                        console.log(`[RenovacaoJob] Adicionando job:`, data);
                        await renovacaoQueue.add('renovacao', data, opts);
                    } else {
                        console.log('⚠️ renovacaoQueue não inicializada, job não disparado');
                    }
                };
                console.log('✅ Workers de ControleConsultaMensal inicialização disparada');
            } catch (err) {
                console.error('❌ Falha ao importar workers de ControleConsultaMensal:', err);
            }
            try {
                const { startEmailWorker } = await import('./emailWorker');
                console.log('🔹 Inicializando email worker (fila: emailQueue)...');
                startEmailWorker().catch(err => console.error('❌ Falha ao iniciar email worker:', err));
                console.log('✅ Email worker inicialização disparada');
            } catch (err) {
                console.error('❌ Falha ao importar email worker:', err);
            }
        })();
    } catch (err) {
        console.error('❌ Falha ao disparar inicialização dos workers:', err);
    }
}
