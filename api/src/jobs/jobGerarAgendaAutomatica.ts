import { getWebhookQueue } from '../workers/worker.webhook';
import { getDelayForNextAgendaGeneration } from '../utils/scheduleAgoraTokenWithFallback';
import { toBrasiliaISO } from '../utils/timezone.util';

/**
 * Agenda um job diário para gerar Agenda automaticamente
 * Executa no horário definido em Configuracao.horarioGeracaoAutomaticaAgenda
 * Usa Redis para persistência
 */
export async function scheduleAutomaticAgendaGeneration(): Promise<boolean> {
    try {
        console.log('[scheduleAutomaticAgendaGeneration] Iniciando agendamento de geração de Agenda...');

        const delayMs = await getDelayForNextAgendaGeneration();
        if (delayMs === null) {
            console.error('[scheduleAutomaticAgendaGeneration] Não foi possível calcular delay');
            return false;
        }

        const webhookQueue = getWebhookQueue();
        if (!webhookQueue) {
            console.error('[scheduleAutomaticAgendaGeneration] WebhookQueue não disponível');
            return false;
        }

        // Remove job anterior se existir (trata jobs bloqueados)
        try {
            const existingJob = await webhookQueue.getJob('agenda-generation-daily');
            if (existingJob) {
                try {
                    // Tenta remover o job
                    await existingJob.remove();
                    console.log('[scheduleAutomaticAgendaGeneration] Job anterior removido');
                } catch (removeError: unknown) {
                    // Se falhar ao remover (ex: job locked por worker), apenas loga e continua
                    // O novo job será criado com o mesmo jobId e substituirá quando possível
                    const errorMessage = removeError instanceof Error ? removeError.message : String(removeError);
                    if (errorMessage.includes('locked') || errorMessage.includes('could not be removed')) {
                        console.warn('[scheduleAutomaticAgendaGeneration] Job anterior está bloqueado (em processamento), novo job será criado com mesmo ID');
                    } else {
                        console.warn('[scheduleAutomaticAgendaGeneration] Erro ao remover job anterior:', removeError);
                    }
                }
            }
        } catch (error: unknown) {
            // Erro ao buscar o job (pode não existir), apenas loga e continua
            console.warn('[scheduleAutomaticAgendaGeneration] Erro ao verificar job anterior:', error);
        }

        // Agenda novo job (sem repeat - será re-agendado após cada execução)
        await webhookQueue.add(
            'generateAgendaDaily',
            { timestamp: toBrasiliaISO() },
            {
                delay: delayMs,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                jobId: 'agenda-generation-daily',
                removeOnComplete: { age: 86400 },
                removeOnFail: { age: 86400 },
            }
        );

        console.log(
            `✅ [scheduleAutomaticAgendaGeneration] Job agendado com sucesso (delay: ${Math.floor(
                delayMs / (1000 * 60)
            )}min)`
        );
        return true;
    } catch (error) {
        console.error('[scheduleAutomaticAgendaGeneration] Erro:', error);
        return false;
    }
}

/**
 * Handler para executar a geração de Agenda
 * Deve ser chamado pelo worker
 */
export async function handleGenerateAgendaDaily(): Promise<boolean> {
    try {
        console.log('[handleGenerateAgendaDaily] Iniciando geração de Agenda...');

        // Importa o service de geração de agenda
        const { GerarAgendaService } = await import('../services/gerarAgenda.service');
        const { prismaAgendaRepository } = await import('../repositories/prismaAgenda.repository');
        const { prismaUserRepository } = await import('../repositories/prismaUser.repository');

        const gerarAgendaService = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);
        const result = await gerarAgendaService.generateAgendas();

        if ('error' in result && result.error) {
            console.error('[handleGenerateAgendaDaily] Erro ao gerar agendas:', result.error);
            throw new Error(result.error);
        }

        const totalCriados = (result.resultados || []).reduce((acc: number, r: { psicologoId: string; criados?: number; error?: string }) => acc + (Number(r.criados) || 0), 0);
        console.log(`✅ [handleGenerateAgendaDaily] Agenda gerada com sucesso. Total de agendas criadas: ${totalCriados}`);

        // Re-agenda o próximo job para o próximo horário configurado
        await scheduleAutomaticAgendaGeneration();

        return true;
    } catch (error) {
        console.error('[handleGenerateAgendaDaily] Erro ao gerar Agenda:', error);
        // Ainda assim, tenta re-agendar para não perder o próximo ciclo
        try {
            await scheduleAutomaticAgendaGeneration();
        } catch (rescheduleError) {
            console.error('[handleGenerateAgendaDaily] Erro ao re-agendar job:', rescheduleError);
        }
        return false;
    }
}
