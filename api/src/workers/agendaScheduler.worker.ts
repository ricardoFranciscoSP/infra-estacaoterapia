
import { GerarAgendaService } from '../services/gerarAgenda.service';
import { prismaAgendaRepository } from '../repositories/prismaAgenda.repository';
import { prismaUserRepository } from '../repositories/prismaUser.repository';
import { Worker } from 'bullmq';
import { agendaQueue } from '../queues/bullmqCentral';
import dayjs from 'dayjs';


export function scheduleMonthlyAgendaJob() {
    // Agenda para rodar todo dia 01 à 00:00
    const pattern = '0 0 1 * *';
    if (!agendaQueue) {
        console.log('[BullMQ] Não agendando job mensal: agendaQueue não inicializada.');
        return;
    }
    agendaQueue.add(
        'generateMonthlyAgenda',
        {},
        {
            repeat: { pattern },
            removeOnComplete: true,
            removeOnFail: true,
        }
    );
    console.log('Job mensal de geração de agendas agendado na fila do Redis.');
}

export async function scheduleAgendaForActivatedPsychologist(psicologoId: string) {
    if (!agendaQueue) {
        console.log('[BullMQ] Não agendando job para psicólogo: agendaQueue não inicializada.');
        return;
    }
    await agendaQueue.add('generateAgendaForPsychologist', { psicologoId });
    console.log(`Job de geração de agenda para psicólogo ${psicologoId} adicionado na fila.`);
}

export function startAgendaWorker() {
    if (!agendaQueue) {
        console.log('[BullMQ] agendaScheduler.worker não inicializado: agendaQueue não disponível.');
        return;
    }
    const worker = new Worker(
        'agendaQueue',
        async job => {
            const gerarAgendaService = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);
            if (job.name === 'generateMonthlyAgenda') {
                const result = await gerarAgendaService.generateAgendas();
                if ('error' in result) {
                    console.error('❌ Geração mensal de agendas falhou:', result.error);
                    throw new Error(result.error);
                }
                console.log('Geração mensal de agendas finalizada:', result.message);
            }
            if (job.name === 'generateAgendaForPsychologist') {
                // ...existing code...
            }
        },
        { connection: agendaQueue.opts.connection }
    );
    console.log('AgendaScheduler worker iniciado e jobs agendados automaticamente no deploy.');
}

// REMOVIDO: Inicialização automática ao carregar o módulo
// Os workers devem ser iniciados apenas através de controleConsultaWorkers.ts
// startAgendaWorker();
// scheduleMonthlyAgendaJob();
