import { IReservaSessaoService } from "../interfaces/reservaSessao.interface";
import prisma from '../prisma/client';
import { ReservaSessaoResponse } from '../types/reservaSessao.types';
import type { Prisma } from '../generated/prisma/client';

export class ReservaSessaoService implements IReservaSessaoService {
    async getReservaSessao(id: string): Promise<ReservaSessaoResponse> {
        try {
            // Log removido para reduzir poluição - só loga em caso de erro
            const reserva = await prisma.reservaSessao.findFirst({
                where: {
                    OR: [
                        { ConsultaId: id },
                        { AgendaId: id },
                        { Id: id },
                    ],
                },
                include: {
                    Consulta: {
                        select: {
                            Id: true,
                            Date: true,
                            Time: true,
                            Status: true,
                            PacienteId: true,
                            PsicologoId: true
                        }
                    }
                }
            });

            if (!reserva) {
                // Log apenas se não encontrar (não a cada requisição)
                console.warn(`[ReservaSessaoService] ReservaSessao não encontrada para ID: ${id}`);
                return {
                    success: false,
                    message: 'ReservaSessao não encontrada'
                };
            }

            // Converte Date para string ISO se necessário
            // Consulta.Date é DateTime no Prisma, então pode ser Date ou string
            const consultaDate = reserva.Consulta?.Date 
                ? (reserva.Consulta.Date instanceof Date 
                    ? reserva.Consulta.Date.toISOString() 
                    : typeof reserva.Consulta.Date === 'string'
                        ? reserva.Consulta.Date
                        : String(reserva.Consulta.Date))
                : undefined;
            
            const consultaTime = reserva.Consulta?.Time 
                ? String(reserva.Consulta.Time)
                : undefined;
            
            // ScheduledAt é String? no schema, então sempre é string ou null/undefined
            // Não precisa verificar instanceof Date
            const scheduledAt = reserva.ScheduledAt 
                ? String(reserva.ScheduledAt)
                : undefined;

            // 🎯 IMPORTANTE: Preenche PsychologistId se estiver vazio mas existir na Consulta
            // Isso garante que o frontend sempre tenha o PsychologistId
            let psychologistId = reserva.PsychologistId;
            if (!psychologistId && reserva.Consulta?.PsicologoId) {
                psychologistId = reserva.Consulta.PsicologoId;
                // Atualiza no banco para futuras consultas
                await prisma.reservaSessao.update({
                    where: { Id: reserva.Id },
                    data: { PsychologistId: psychologistId }
                }).catch(() => {
                    // Ignora erro de atualização (não crítico)
                });
            }

            // 🎯 IMPORTANTE: Preenche PatientId se estiver vazio mas existir na Consulta
            let patientId = reserva.PatientId;
            if (!patientId && reserva.Consulta?.PacienteId) {
                patientId = reserva.Consulta.PacienteId;
                // Atualiza no banco para futuras consultas
                await prisma.reservaSessao.update({
                    where: { Id: reserva.Id },
                    data: { PatientId: patientId }
                }).catch(() => {
                    // Ignora erro de atualização (não crítico)
                });
            }

            // Log apenas se dados críticos estiverem ausentes (para debug)
            const dadosAusentes = [];
            if (!reserva.AgoraTokenPatient) dadosAusentes.push('AgoraTokenPatient');
            if (!reserva.Uid) dadosAusentes.push('Uid');
            if (!consultaDate) dadosAusentes.push('ConsultaDate');
            if (!consultaTime) dadosAusentes.push('ConsultaTime');
            if (!scheduledAt) dadosAusentes.push('ScheduledAt');
            if (!psychologistId) dadosAusentes.push('PsychologistId');
            
            if (dadosAusentes.length > 0) {
                console.warn(`[ReservaSessaoService] ⚠️ Dados ausentes para ${id}:`, dadosAusentes.join(', '));
            }

            // IMPORTANTE: Retorna ambos os tokens separadamente
            // Não usa AgoraToken genérico para evitar confusão
            // Cada sala (paciente/psicólogo) deve usar seu token específico
            return {
                success: true,
                data: {
                    Id: reserva.Id,
                    Status: reserva.Status as import('../types/permissions.types').AgendaStatus,
                    AgoraChannel: reserva.AgoraChannel ?? undefined,
                    ReservationId: reserva.ReservationId ?? undefined,
                    // NÃO retorna AgoraToken genérico - cada role usa seu token específico
                    Uid: reserva.Uid ?? undefined,
                    UidPsychologist: reserva.UidPsychologist ?? undefined,
                    ConsultaId: reserva.ConsultaId,
                    PatientId: patientId ?? undefined,
                    PsychologistId: psychologistId ?? undefined,
                    PatientJoinedAt: reserva.PatientJoinedAt ?? undefined,
                    PsychologistJoinedAt: reserva.PsychologistJoinedAt ?? undefined,
                    // Tokens específicos por role
                    AgoraTokenPatient: reserva.AgoraTokenPatient ?? undefined,
                    AgoraTokenPsychologist: reserva.AgoraTokenPsychologist ?? undefined,
                    AgendaId: reserva.AgendaId ?? undefined,
                    ConsultaDate: consultaDate,
                    ConsultaTime: consultaTime,
                    ScheduledAt: scheduledAt,
                }
            };
        } catch (error) {
            console.error('Erro ao buscar ReservaSessao:', error);
            return {
                success: false,
                message: 'Erro ao buscar ReservaSessao'
            };
        }
    }

    /**
     * Busca todos os dados relacionados a uma consulta: ReservaSessao, Agenda e Consulta
     * @param consultationId ID da consulta
     * @returns Dados completos da consulta com todas as relações
     */
    async getConsultaCompleta(consultationId: string): Promise<{
        success: boolean;
        data?: {
            ReservaSessao?: Prisma.ReservaSessaoGetPayload<{
                select: {
                    Id: true;
                    AgoraChannel: true;
                    Status: true;
                    PatientJoinedAt: true;
                    PsychologistJoinedAt: true;
                    ReservationId: true;
                    Uid: true;
                    UidPsychologist: true;
                    ConsultaId: true;
                    AgoraTokenPatient: true;
                    AgoraTokenPsychologist: true;
                    AgendaId: true;
                    ScheduledAt: true;
                    PatientId: true;
                    PsychologistId: true;
                    createdAt: true;
                    updatedAt: true;
                };
            }> | null;
            Consulta?: {
                Id: string;
                Date: Date;
                Time: string;
                Status: string;
                PacienteId: string | null;
                PsicologoId: string | null;
                AgendaId: string | null;
                CreatedAt: Date;
                UpdatedAt: Date;
            };
            Agenda?: Prisma.AgendaGetPayload<{
                select: {
                    Id: true;
                    Data: true;
                    Horario: true;
                    DiaDaSemana: true;
                    Status: true;
                    PsicologoId: true;
                    CreatedAt: true;
                    UpdatedAt: true;
                };
            }> | null;
            Paciente?: Prisma.UserGetPayload<{
                select: {
                    Id: true;
                    Nome: true;
                    Email: true;
                    Images: { select: { Url: true } };
                };
            }> | null;
            Psicologo?: Prisma.UserGetPayload<{
                select: {
                    Id: true;
                    Nome: true;
                    Email: true;
                    Images: { select: { Url: true } };
                };
            }> | null;
        };
        message?: string;
    }> {
        try {
            console.log(`[ReservaSessaoService] Buscando consulta completa para: ${consultationId}`);
            
            // Busca a consulta com todas as relações
            const consulta = await prisma.consulta.findUnique({
                where: { Id: consultationId },
                include: {
                    ReservaSessao: {
                        select: {
                            Id: true,
                            AgoraChannel: true,
                            Status: true,
                            PatientJoinedAt: true,
                            PsychologistJoinedAt: true,
                            ReservationId: true,
                            Uid: true,
                            UidPsychologist: true,
                            ConsultaId: true,
                            AgoraTokenPatient: true,
                            AgoraTokenPsychologist: true,
                            AgendaId: true,
                            ScheduledAt: true,
                            PatientId: true,
                            PsychologistId: true,
                            createdAt: true,
                            updatedAt: true,
                        }
                    },
                    Agenda: {
                        select: {
                            Id: true,
                            Data: true,
                            Horario: true,
                            DiaDaSemana: true,
                            Status: true,
                            PsicologoId: true,
                            CreatedAt: true,
                            UpdatedAt: true,
                        }
                    },
                    Paciente: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: {
                                select: { Url: true }
                            }
                        }
                    },
                    Psicologo: {
                        select: {
                            Id: true,
                            Nome: true,
                            Email: true,
                            Images: {
                                select: { Url: true }
                            }
                        }
                    }
                }
            });

            if (!consulta) {
                console.warn(`[ReservaSessaoService] Consulta não encontrada: ${consultationId}`);
                return {
                    success: false,
                    message: `Consulta não encontrada para ID: ${consultationId}`
                };
            }
            
            // Validação adicional: garante que a consulta tem PacienteId preenchido
            if (!consulta.PacienteId) {
                console.error(`[ReservaSessaoService] Consulta encontrada mas sem PacienteId: ${consultationId}`);
                return {
                    success: false,
                    message: 'Consulta encontrada mas sem PacienteId associado'
                };
            }

            const result = {
                success: true,
                data: {
                    ReservaSessao: consulta.ReservaSessao || null,
                    Consulta: {
                        Id: consulta.Id,
                        Date: consulta.Date,
                        Time: consulta.Time,
                        Status: consulta.Status,
                        PacienteId: consulta.PacienteId,
                        PsicologoId: consulta.PsicologoId,
                        AgendaId: consulta.AgendaId,
                        CreatedAt: consulta.CreatedAt,
                        UpdatedAt: consulta.UpdatedAt,
                    },
                    Agenda: consulta.Agenda || null,
                    Paciente: consulta.Paciente || null,
                    Psicologo: consulta.Psicologo || null,
                }
            };

            console.log(`[ReservaSessaoService] Consulta completa encontrada:`, {
                consultaId: consulta.Id,
                temReservaSessao: !!consulta.ReservaSessao,
                temAgenda: !!consulta.Agenda,
                temPaciente: !!consulta.Paciente,
                temPsicologo: !!consulta.Psicologo
            });

            return result;
        } catch (error) {
            console.error(`[ReservaSessaoService] Erro ao buscar consulta completa para ${consultationId}:`, error);
            return {
                success: false,
                message: `Erro ao buscar consulta completa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            };
        }
    }

    /**
     * Busca todos os dados da ReservaSessao pelo channel (AgoraChannel)
     * Retorna todos os dados necessários para a sala de vídeo
     * @param channel Nome do channel Agora
     * @returns Dados completos da ReservaSessao ou erro
     */
    async getReservaSessaoByChannel(channel: string): Promise<ReservaSessaoResponse> {
        try {
            if (!channel || channel.trim() === '') {
                return {
                    success: false,
                    message: 'Channel é obrigatório'
                };
            }

            const reserva = await prisma.reservaSessao.findFirst({
                where: { AgoraChannel: channel },
                include: {
                    Consulta: {
                        select: {
                            Id: true,
                            Date: true,
                            Time: true,
                            Status: true,
                            PacienteId: true,
                            PsicologoId: true
                        }
                    }
                }
            });

            if (!reserva) {
                return {
                    success: false,
                    message: 'ReservaSessao não encontrada para este channel'
                };
            }

            // Converte Date para string ISO se necessário
            const consultaDate = reserva.Consulta?.Date 
                ? (reserva.Consulta.Date instanceof Date 
                    ? reserva.Consulta.Date.toISOString() 
                    : typeof reserva.Consulta.Date === 'string'
                        ? reserva.Consulta.Date
                        : String(reserva.Consulta.Date))
                : undefined;
            
            const consultaTime = reserva.Consulta?.Time 
                ? String(reserva.Consulta.Time)
                : undefined;
            
            const scheduledAt = reserva.ScheduledAt 
                ? String(reserva.ScheduledAt)
                : undefined;

            // 🎯 IMPORTANTE: Preenche PsychologistId e PatientId se estiverem vazios
            let psychologistId = reserva.PsychologistId;
            let patientId = reserva.PatientId;
            
            if (!psychologistId && reserva.Consulta?.PsicologoId) {
                psychologistId = reserva.Consulta.PsicologoId;
                // Atualiza no banco para futuras consultas
                await prisma.reservaSessao.update({
                    where: { Id: reserva.Id },
                    data: { PsychologistId: psychologistId }
                }).catch(() => {
                    // Ignora erro de atualização (não crítico)
                });
            }

            if (!patientId && reserva.Consulta?.PacienteId) {
                patientId = reserva.Consulta.PacienteId;
                // Atualiza no banco para futuras consultas
                await prisma.reservaSessao.update({
                    where: { Id: reserva.Id },
                    data: { PatientId: patientId }
                }).catch(() => {
                    // Ignora erro de atualização (não crítico)
                });
            }

            // Log apenas se dados críticos estiverem ausentes (para debug)
            const dadosAusentes = [];
            if (!reserva.AgoraTokenPatient) dadosAusentes.push('AgoraTokenPatient');
            if (!reserva.AgoraTokenPsychologist) dadosAusentes.push('AgoraTokenPsychologist');
            if (!reserva.Uid) dadosAusentes.push('Uid');
            if (!reserva.UidPsychologist) dadosAusentes.push('UidPsychologist');
            if (!consultaDate) dadosAusentes.push('ConsultaDate');
            if (!consultaTime) dadosAusentes.push('ConsultaTime');
            if (!scheduledAt) dadosAusentes.push('ScheduledAt');
            if (!psychologistId) dadosAusentes.push('PsychologistId');
            
            if (dadosAusentes.length > 0) {
                console.warn(`[ReservaSessaoService] ⚠️ Dados ausentes para channel ${channel}:`, dadosAusentes.join(', '));
            }

            return {
                success: true,
                data: {
                    Id: reserva.Id,
                    Status: reserva.Status as import('../types/permissions.types').AgendaStatus,
                    AgoraChannel: reserva.AgoraChannel ?? undefined,
                    ReservationId: reserva.ReservationId ?? undefined,
                    Uid: reserva.Uid ?? undefined,
                    UidPsychologist: reserva.UidPsychologist ?? undefined,
                    ConsultaId: reserva.ConsultaId,
                    PatientId: patientId ?? undefined,
                    PsychologistId: psychologistId ?? undefined,
                    PatientJoinedAt: reserva.PatientJoinedAt ?? undefined,
                    PsychologistJoinedAt: reserva.PsychologistJoinedAt ?? undefined,
                    AgoraTokenPatient: reserva.AgoraTokenPatient ?? undefined,
                    AgoraTokenPsychologist: reserva.AgoraTokenPsychologist ?? undefined,
                    AgendaId: reserva.AgendaId ?? undefined,
                    ConsultaDate: consultaDate,
                    ConsultaTime: consultaTime,
                    ScheduledAt: scheduledAt,
                }
            };
        } catch (error) {
            console.error(`[ReservaSessaoService] Erro ao buscar ReservaSessao por channel ${channel}:`, error);
            return {
                success: false,
                message: 'Erro ao buscar ReservaSessao'
            };
        }
    }
}