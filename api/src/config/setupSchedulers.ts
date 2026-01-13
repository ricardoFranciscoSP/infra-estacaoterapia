/**
 * Configuração de agendadores de tarefas (schedulers)
 * REFATORADO: Removido setInterval - agora usa apenas delayed jobs via BullMQ
 *
 * Responsabilidades:
 * 1. Job Redis para gerar Agenda diariamente
 * 2. Logging de status dos agendadores
 */

import { scheduleAutomaticAgendaGeneration } from '../jobs/jobGerarAgendaAutomatica';

let schedulersInitialized = false;

/**
 * Inicializa todos os agendadores necessários
 * Executa uma única vez na inicialização da aplicação
 *
 * @returns Promise<void>
 */
export async function setupSchedulers(): Promise<void> {
    if (schedulersInitialized) {
        console.log('[setupSchedulers] Agendadores já foram inicializados');
        return;
    }

    try {
        console.log('[setupSchedulers] Iniciando configuração de agendadores...');

        // 1. Agenda o job de geração de Agenda via Redis
        try {
            console.log('[setupSchedulers] Agendando job de geração diária de Agenda...');
            await scheduleAutomaticAgendaGeneration();
            console.log(
                '✅ [setupSchedulers] Job de geração de Agenda agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de Agenda:',
                error
            );
            // Não falha a inicialização por erro no Redis
        }

        // ✅ REMOVIDO: Cron de verificação de tokens (setInterval)
        // Agora os tokens são agendados quando ReservaSessao é criada (delayed jobs)
        console.log('✅ [setupSchedulers] Sistema de tokens agora usa delayed jobs (zero polling)');

        schedulersInitialized = true;
        console.log(
            '✅ [setupSchedulers] Todos os agendadores foram inicializados com sucesso'
        );
    } catch (error) {
        console.error('[setupSchedulers] Erro na inicialização de agendadores:', error);
        // Não falha a inicialização da aplicação por erro nos agendadores
    }
}

/**
 * Reinicia um agendador específico
 * Útil para recarregar configurações em tempo de execução
 *
 * @param schedulerName - Nome do agendador: 'agenda'
 * @returns Promise<void>
 */
export async function restartScheduler(
    schedulerName: 'agenda'
): Promise<void> {
    try {
        console.log(`[restartScheduler] Reiniciando agendador: ${schedulerName}`);

        if (schedulerName === 'agenda') {
            await scheduleAutomaticAgendaGeneration();
            console.log(
                '✅ [restartScheduler] Agendador de Agenda reiniciado com sucesso'
            );
        }
    } catch (error) {
        console.error(
            `[restartScheduler] Erro ao reiniciar agendador ${schedulerName}:`,
            error
        );
        throw error;
    }
}

/**
 * Verifica status dos agendadores
 * Retorna informações para debugging
 *
 * @returns objeto com status dos agendadores
 */
export function getSchedulersStatus(): {
    initialized: boolean;
    timestamp: string;
} {
    const dayjs = require('dayjs');
    const timezone = require('dayjs/plugin/timezone');
    const utc = require('dayjs/plugin/utc');
    dayjs.extend(utc);
    dayjs.extend(timezone);
    
    return {
        initialized: schedulersInitialized,
        timestamp: dayjs.tz(dayjs(), 'America/Sao_Paulo').format(
            'YYYY-MM-DD HH:mm:ss'
        ),
    };
}
