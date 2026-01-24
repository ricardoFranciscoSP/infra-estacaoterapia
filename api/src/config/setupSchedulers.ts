/**
 * Configuração de agendadores de tarefas (schedulers)
 * REFATORADO: Removido setInterval - agora usa apenas delayed jobs via BullMQ
 *
 * Responsabilidades:
 * 1. Job Redis para gerar Agenda diariamente
 * 2. Logging de status dos agendadores
 */

import { scheduleAutomaticAgendaGeneration } from '../jobs/jobGerarAgendaAutomatica';
import { scheduleAutomaticBackupGeneration } from '../jobs/jobGerarBackupAutomatica';
import { scheduleReservedStatusRefresh } from '../jobs/jobAtualizarStatusReservado';
import { scheduleInatividadeFailsafe } from '../jobs/jobInatividadeConsulta';
import { scheduleVerificarInatividadeScheduledAt } from '../jobs/jobVerificarInatividadeScheduledAt';
import { scheduleNotificarTempoRestante } from '../jobs/jobNotificarTempoRestante';
import { ensureStatusIndexes } from '../jobs/jobEnsureStatusIndexes';

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

        // 2. Agenda o job semanal de backup via Redis (se habilitado)
        try {
            console.log('[setupSchedulers] Agendando job semanal de backup...');
            await scheduleAutomaticBackupGeneration();
            console.log(
                '✅ [setupSchedulers] Job de backup agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de backup:',
                error
            );
        }

        // ✅ REMOVIDO: Cron de verificação de tokens (setInterval)
        // Agora os tokens são agendados quando ReservaSessao é criada (delayed jobs)
        console.log('✅ [setupSchedulers] Sistema de tokens agora usa delayed jobs (zero polling)');

        // 3. Job recorrente para atualizar status de Reservado
        try {
            console.log('[setupSchedulers] Agendando job de atualização de status Reservado...');
            await scheduleReservedStatusRefresh();
            console.log(
                '✅ [setupSchedulers] Job de atualização de status Reservado agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de status Reservado:',
                error
            );
        }

        // 4. Job recorrente de fail-safe de inatividade
        try {
            console.log('[setupSchedulers] Agendando job de fail-safe de inatividade...');
            await scheduleInatividadeFailsafe();
            console.log(
                '✅ [setupSchedulers] Job de fail-safe de inatividade agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de inatividade:',
                error
            );
        }

        // 5. Job recorrente para verificar inatividade baseado em ScheduledAt e JoinedAt
        try {
            console.log('[setupSchedulers] Agendando job de verificação de inatividade (ScheduledAt)...');
            await scheduleVerificarInatividadeScheduledAt();
            console.log(
                '✅ [setupSchedulers] Job de verificação de inatividade (ScheduledAt) agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de verificação de inatividade (ScheduledAt):',
                error
            );
        }

        // 6. Job recorrente para notificar tempo restante (15, 10, 5 minutos antes do fim)
        try {
            console.log('[setupSchedulers] Agendando job de notificação de tempo restante...');
            await scheduleNotificarTempoRestante();
            console.log(
                '✅ [setupSchedulers] Job de notificação de tempo restante agendado com sucesso'
            );
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao agendar job de notificação de tempo restante:',
                error
            );
        }

        // 7. Índices obrigatórios (criação concorrente, sem bloqueio)
        try {
            console.log('[setupSchedulers] Garantindo índices de status...');
            await ensureStatusIndexes();
            console.log('✅ [setupSchedulers] Índices de status garantidos');
        } catch (error) {
            console.error(
                '❌ [setupSchedulers] Erro ao garantir índices de status:',
                error
            );
        }

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
