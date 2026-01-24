/**
 * ⚠️ DEPRECADO: Este arquivo foi substituído por delayed jobs
 * 
 * REFATORADO: A lógica de encerrar salas expiradas agora é executada via delayed jobs
 * quando a consulta é criada (60 minutos após ScheduledAt).
 * 
 * Este arquivo é mantido apenas para referência histórica.
 * A funcionalidade está implementada em:
 * - src/workers/delayedJobsWorker.ts (handleFinalizeConsultation)
 * - src/utils/scheduleDelayedJobs.ts (scheduleConsultationJobs)
 * 
 * NÃO USE ESTE ARQUIVO DIRETAMENTE - Use delayed jobs ao invés disso.
 */

import prisma from '../prisma/client';
import { AgendaStatus } from '../generated/prisma';
import { WebSocketNotificationService } from '../services/websocketNotification.service';

const wsNotify = new WebSocketNotificationService();

/**
 * @deprecated Use delayed jobs ao invés disso
 * A funcionalidade está em src/workers/delayedJobsWorker.ts
 */
export const encerrarSalasExpiradas = async () => {
    console.warn('⚠️ [DEPRECATED] encerrarSalasExpiradas não deve mais ser usado. Use delayed jobs.');
    // Implementação mantida apenas para compatibilidade, mas não deve ser chamada
    try {
        const agora = new Date();
        
        // Busca todas as reservas de sessão que:
        // 1. Têm ScheduledAt definido
        // 2. Estão em status que permitem estar ativas (Reservado, Em Andamento, Andamento)
        // 3. Já passaram 60 minutos desde o ScheduledAt
        // Otimizado: adicionado limite para reduzir carga
        const reservasExpiradas = await prisma.reservaSessao.findMany({
            where: {
                ScheduledAt: {
                    not: null
                },
                Status: {
                    in: [AgendaStatus.Reservado, AgendaStatus.Andamento]
                }
            },
            take: 50, // Limita a 50 reservas por execução para economizar CPU
            include: {
                Consulta: {
                    select: {
                        Id: true,
                        PacienteId: true,
                        PsicologoId: true,
                        AgendaId: true,
                        Status: true
                    }
                }
            }
        });

        // Filtra as reservas que já passaram 60 minutos do ScheduledAt
        const salasParaEncerrar = reservasExpiradas.filter(reserva => {
            if (!reserva.ScheduledAt) return false;
            
            try {
                // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
                const [datePart, timePart] = reserva.ScheduledAt.split(' ');
                if (!datePart || !timePart) return false;
                
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second = 0] = timePart.split(':').map(Number);
                
                const inicioConsulta = new Date(year, month - 1, day, hour, minute, second);
                
                // 🎯 CRÍTICO: Só processa consultas que JÁ COMEÇARAM (ScheduledAt <= agora)
                // Isso evita encerrar consultas antes do horário agendado
                if (inicioConsulta > agora) {
                    return false; // Consulta ainda não começou, não encerra
                }
                
                const fimConsulta = new Date(inicioConsulta.getTime() + 60 * 60 * 1000); // 60 minutos
                
                // Se já passou do horário de término (60 minutos após ScheduledAt)
                return agora >= fimConsulta;
            } catch (error) {
                console.error(`Erro ao processar ScheduledAt da reserva ${reserva.Id}:`, error);
                return false;
            }
        });

        // Encerra cada sala expirada
        for (const reserva of salasParaEncerrar) {
            try {
                const consultationId = reserva.ConsultaId;
                
                // Atualiza apenas Consulta (trigger sincroniza ReservaSessao e Agenda)
                await prisma.consulta.update({
                    where: { Id: consultationId },
                    data: { Status: "Realizada" },
                });

                    // Correção: usar enum do Prisma
                    // await prisma.consulta.update({
                    //     where: { Id: consultationId },
                    //     data: { Status: $Enums.AgendaStatus.Realizada },
                    // });
                
                // Notifica ambos os participantes sobre o encerramento
                await wsNotify.emitConsultation(`consultation:${consultationId}`, { 
                    status: "Concluido",
                    reason: "Sala encerrada automaticamente após 60 minutos",
                    autoEnded: true
                });
                
                // Notifica atualização da próxima consulta
                if (reserva.Consulta) {
                    try {
                        const { ProximaConsultaService } = await import('../services/proximaConsulta.service');
                        const proximaConsultaService = new ProximaConsultaService();
                        await proximaConsultaService.notificarAmbosUsuarios(
                            reserva.Consulta.PsicologoId || '',
                            reserva.Consulta.PacienteId,
                            'atualizacao'
                        );
                    } catch (err) {
                        console.error('Erro ao notificar atualização:', err);
                    }
                }
            } catch (error) {
                console.error(`Erro ao encerrar sala ${reserva.ConsultaId}:`, error);
            }
        }
        
        if (salasParaEncerrar.length > 0) {
            console.log(`✅ ${salasParaEncerrar.length} sala(s) expirada(s) encerrada(s).`);
        }
    } catch (error) {
        console.error('Erro ao verificar salas expiradas:', error);
    }
};
