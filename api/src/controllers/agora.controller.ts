// src/controllers/AgoraController.ts
import { Request, Response } from 'express';
import { IAgoraService } from '../interfaces/IAgoraService';
import { AuthorizationService } from '../services/authorization.service';
import prisma from "../prisma/client";
import { PrismaClient, CommissionStatus, CommissionTipoPlano, ReservaSessao } from "../generated/prisma/client";
import { deriveUidFromUuid } from '../utils/uid.util';
import { getRepassePercentForPsychologist } from '../utils/repasse.util';
import { ConsultaStatusService } from '../services/consultaStatus.service';

interface TokenGenerationResult {
    success: boolean;
    patientToken?: string | null;
    psychologistToken?: string | null;
    error?: string;
}

export class AgoraController {

    constructor(
        private agoraService: IAgoraService,
        private authService: AuthorizationService,
        private prisma: PrismaClient
    ) { }

    /**
     * Método privado para gerar ambos os tokens (paciente e psicólogo) em uma única operação
     * Garante que os tokens sejam sempre gerados de forma sincronizada
     * Sempre gera ambos os tokens, mesmo se um já existir, para garantir consistência
     * 
     * @param reservaSessao - Reserva de sessão com dados da consulta
     * @returns Promise<TokenGenerationResult> - Resultado da geração com tokens ou erro
     */
    private async generateBothTokens(reservaSessao: ReservaSessao & { Consulta: any }): Promise<TokenGenerationResult> {
        try {
            const consultaId = reservaSessao.ConsultaId;
            const channelName = reservaSessao.AgoraChannel ?? `sala_${consultaId}`;

            // 🎯 IMPORTANTE: Preenche PatientId e PsychologistId se estiverem vazios
            // Isso garante que os tokens possam ser gerados mesmo se os IDs não foram preenchidos na criação
            let patientId = reservaSessao.PatientId;
            let psychologistId = reservaSessao.PsychologistId;
            
            if (!patientId && reservaSessao.Consulta?.PacienteId) {
                patientId = reservaSessao.Consulta.PacienteId;
            }
            
            if (!psychologistId && reservaSessao.Consulta?.PsicologoId) {
                psychologistId = reservaSessao.Consulta.PsicologoId;
            }
            
            // Atualiza no banco se necessário
            if ((!reservaSessao.PatientId && patientId) || (!reservaSessao.PsychologistId && psychologistId)) {
                await this.prisma.reservaSessao.update({
                    where: { Id: reservaSessao.Id },
                    data: {
                        ...(patientId && !reservaSessao.PatientId ? { PatientId: patientId } : {}),
                        ...(psychologistId && !reservaSessao.PsychologistId ? { PsychologistId: psychologistId } : {})
                    }
                });
            }
            
            // Valida que temos os IDs necessários
            if (!patientId || !psychologistId) {
                const errorMsg = `PatientId ou PsychologistId não encontrado para consulta ${consultaId}. PatientId: ${patientId || 'ausente'}, PsychologistId: ${psychologistId || 'ausente'}`;
                console.error(`❌ [AgoraController] ${errorMsg}`);
                return {
                    success: false,
                    error: errorMsg
                };
            }

            // Sempre usa deriveUidFromUuid para garantir consistência dos UIDs
            const patientUid = deriveUidFromUuid(patientId);
            const psychologistUid = deriveUidFromUuid(psychologistId);

            // Validação rigorosa: ambos os UIDs devem existir
            if (!patientUid || !psychologistUid) {
                const errorMsg = `Falha ao gerar UIDs para consulta ${consultaId}. PatientId: ${patientId}, PsychologistId: ${psychologistId}`;
                console.error(`❌ [AgoraController] ${errorMsg}`);
                return {
                    success: false,
                    error: errorMsg
                };
            }

            // Sempre gera ambos os tokens, mesmo se um já existir
            // Isso garante que os tokens estejam sempre atualizados e sincronizados
            console.log(
                `🔄 [AgoraController] Gerando tokens para consulta ${consultaId}. ` +
                `Channel: ${channelName}, PatientUID: ${patientUid}, PsychologistUID: ${psychologistUid}`
            );

            const [patientToken, psychologistToken] = await Promise.all([
                this.agoraService.generateToken(channelName, patientUid, 'patient'),
                this.agoraService.generateToken(channelName, psychologistUid, 'psychologist')
            ]);

            // Valida que ambos os tokens foram gerados com sucesso
            if (!patientToken || !psychologistToken) {
                const errorMsg = `Falha ao gerar tokens: PatientToken=${!!patientToken}, PsychologistToken=${!!psychologistToken}`;
                console.error(`❌ [AgoraController] ${errorMsg}`);
                return {
                    success: false,
                    error: errorMsg
                };
            }

            // Atualiza a reserva com os tokens e UIDs
            await this.prisma.reservaSessao.update({
                where: { Id: reservaSessao.Id },
                data: {
                    AgoraTokenPatient: patientToken,
                    AgoraTokenPsychologist: psychologistToken,
                    Uid: patientUid,
                    UidPsychologist: psychologistUid
                }
            });

            console.log(
                `✅ [AgoraController] Ambos os tokens gerados e salvos com sucesso para consulta ${consultaId}`
            );

            return {
                success: true,
                patientToken,
                psychologistToken
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(
                `❌ [AgoraController] Erro ao gerar tokens de forma sincronizada:`,
                error
            );
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Endpoint para gerar token de acesso Agora
     * Fluxo:
     * 1. Valida autenticação do usuário
     * 2. Busca a reserva de sessão
     * 3. Se tokens não existem, gera ambos de forma sincronizada
     * 4. Retorna o token específico do usuário
     * 
     * @param req - Request com channelName no body
     * @param res - Response com token gerado
     */
    async generateAccessToken(req: Request, res: Response): Promise<Response> {
        try {
            const { channelName } = req.body;

            if (!channelName) {
                return res.status(400).json({ error: 'channelName é obrigatório' });
            }

            console.log('[generateAccessToken] Chamado com:', { channelName });

            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            // Busca a reserva de sessão pelo channelName
            const reservaSessao = await this.prisma.reservaSessao.findFirst({
                where: { AgoraChannel: channelName },
                include: {
                    Consulta: true
                }
            });

            if (!reservaSessao) {
                return res.status(404).json({ error: 'Consulta não encontrada' });
            }

            // Valida se o usuário é paciente ou psicólogo da consulta
            // IMPORTANTE: Se PatientId ou PsychologistId estiverem vazios, preenche a partir da Consulta
            let isPatient = reservaSessao.PatientId === userId;
            let isPsychologist = reservaSessao.PsychologistId === userId;

            // Se não encontrou correspondência, verifica na Consulta e atualiza se necessário
            if (!isPatient && !isPsychologist && reservaSessao.Consulta) {
                const consultaPatientId = reservaSessao.Consulta.PacienteId;
                const consultaPsychologistId = reservaSessao.Consulta.PsicologoId;

                if (consultaPatientId === userId) {
                    isPatient = true;
                    console.log(`[AgoraController] ⚠️ PatientId estava vazio, preenchendo a partir da Consulta: ${userId}`);
                } else if (consultaPsychologistId === userId) {
                    isPsychologist = true;
                    console.log(`[AgoraController] ⚠️ PsychologistId estava vazio, preenchendo a partir da Consulta: ${userId}`);
                }
            }

            if (!isPatient && !isPsychologist) {
                return res.status(403).json({ error: 'Você não tem acesso a esta consulta' });
            }

            const consultaId = reservaSessao.ConsultaId;
            const role: 'patient' | 'psychologist' = isPatient ? 'patient' : 'psychologist';

            // 🔄 VALIDAÇÃO E GERAÇÃO DE TOKENS
            // Se ambos os tokens não existem, gera de forma sincronizada
            if (!reservaSessao.AgoraTokenPatient || !reservaSessao.AgoraTokenPsychologist) {
                console.log(
                    `🔄 [generateAccessToken] Tokens ausentes para consulta ${consultaId}. ` +
                    `Patient: ${!!reservaSessao.AgoraTokenPatient}, ` +
                    `Psychologist: ${!!reservaSessao.AgoraTokenPsychologist}`
                );

                const tokenResult = await this.generateBothTokens(reservaSessao);

                if (!tokenResult.success) {
                    return res.status(500).json({
                        error: 'Falha ao gerar tokens',
                        details: tokenResult.error
                    });
                }
            }

            // Recarrega a reserva para obter os tokens mais recentes
            const reservaAtualizada = await this.prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultaId },
                include: { Consulta: true }
            });

            if (!reservaAtualizada) {
                return res.status(500).json({ error: 'Erro ao recuperar tokens gerados' });
            }

            // Obtém o token específico do usuário atual
            const token = isPatient
                ? reservaAtualizada.AgoraTokenPatient
                : reservaAtualizada.AgoraTokenPsychologist;

            if (!token) {
                return res.status(500).json({
                    error: 'Token não disponível após geração'
                });
            }

            // Determina o UID do usuário atual
            const currentUserUid = isPatient
                ? reservaAtualizada.Uid
                : reservaAtualizada.UidPsychologist;

            if (!currentUserUid) {
                return res.status(500).json({
                    error: 'UID não disponível'
                });
            }

            // Atualiza o timestamp de entrada do usuário e os IDs se necessário
            const updateData: {
                PatientJoinedAt?: Date;
                PsychologistJoinedAt?: Date;
                PatientId?: string;
                PsychologistId?: string;
            } = {};

            // IMPORTANTE: Atualiza PatientId e PsychologistId se estiverem vazios
            // Isso garante que os IDs sejam preenchidos no exato momento que cada um entra na room
            // Usa horário de Brasília para timestamps
            const { nowBrasiliaDate } = await import('../utils/timezone.util');
            
            if (isPatient) {
                updateData.PatientJoinedAt = nowBrasiliaDate();
                if (!reservaSessao.PatientId || reservaSessao.PatientId !== userId) {
                    updateData.PatientId = userId;
                    console.log(`[AgoraController] ✅ Atualizando PatientId: ${userId}`);
                }
            } else if (isPsychologist) {
                updateData.PsychologistJoinedAt = nowBrasiliaDate();
                if (!reservaSessao.PsychologistId || reservaSessao.PsychologistId !== userId) {
                    updateData.PsychologistId = userId;
                    console.log(`[AgoraController] ✅ Atualizando PsychologistId: ${userId}`);
                }
            }

            const updatedReserva = await this.prisma.reservaSessao.update({
                where: { Id: reservaSessao.Id },
                data: updateData
            });

            // Logs detalhados para debug de áudio e vídeo
            console.log(`[AgoraController] ===== ENTRADA NA SALA =====`);
            console.log(`[AgoraController] Role: ${role}`);
            console.log(`[AgoraController] ConsultaId: ${consultaId}`);
            console.log(`[AgoraController] Channel: ${channelName}`);
            console.log(`[AgoraController] Uid: ${currentUserUid}`);
            console.log(`[AgoraController] Token gerado: ${token ? '✅' : '❌'}`);
            console.log(`[AgoraController] PatientId: ${updatedReserva.PatientId || 'VAZIO'}`);
            console.log(`[AgoraController] PsychologistId: ${updatedReserva.PsychologistId || 'VAZIO'}`);
            console.log(`[AgoraController] PatientJoinedAt: ${updatedReserva.PatientJoinedAt || 'Nunca'}`);
            console.log(`[AgoraController] PsychologistJoinedAt: ${updatedReserva.PsychologistJoinedAt || 'Nunca'}`);
            console.log(`[AgoraController] ============================`);

            console.log(
                `✅ [generateAccessToken] Token obtido para ${role}: ` +
                `ConsultaId=${consultaId}, Uid=${currentUserUid}`
            );

            // ℹ️ NOTA: O status EmAndamento é atualizado automaticamente pelo job startConsultation
            // no horário exato do ScheduledAt, independente de quem entrou ou não.
            // Não é necessário atualizar aqui quando alguém entra.

            // Processa repasse se ambos entraram
            if (updatedReserva.PatientJoinedAt && updatedReserva.PsychologistJoinedAt) {
                console.log(
                    `✅ [generateAccessToken] Ambos participantes entraram na consulta ` +
                    `${consultaId} - processando repasse`
                );
                processRepasseAsync(consultaId).catch(err => {
                    console.error(`[generateAccessToken] Erro ao processar repasse:`, err);
                });
            }

            return res.json({
                token,
                uid: currentUserUid,
                role,
                participants: {
                    patient: { uid: reservaAtualizada.Uid },
                    psychologist: { uid: reservaAtualizada.UidPsychologist }
                }
            });
        } catch (error) {
            console.error('[generateAccessToken] Erro:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({
                error: 'Erro ao gerar token de acesso',
                details: errorMessage
            });
        }
    }

    /**
     * Marca a consulta como EmAndamento se estiver dentro da janela de 10 minutos
     * do horário agendado
     */
    private async markConsultationStartIfEligible(
        reservaSessao: ReservaSessao & { Consulta: any }
    ): Promise<void> {
        try {
            const consultaId = reservaSessao.ConsultaId;
            const consultaStatus = reservaSessao.Consulta?.Status;

            // Determina o horário agendado (prioriza ScheduledAt)
            const scheduledAt = reservaSessao.ScheduledAt || reservaSessao.Consulta?.Date;

            if (!scheduledAt) {
                console.warn(`[markConsultationStartIfEligible] Horário não encontrado para consulta ${consultaId}`);
                return;
            }

            // Verifica se está dentro de 10 minutos após o horário agendado
            const start = new Date(scheduledAt).getTime();
            const now = Date.now();
            const withinTenMinutes = now <= start + 10 * 60 * 1000;

            if (!withinTenMinutes) {
                console.log(
                    `[markConsultationStartIfEligible] Consulta ${consultaId} ` +
                    `fora da janela de 10 minutos`
                );
                return;
            }

            // Verifica o status atual
            const invalidStatuses = [
                'EmAndamento',
                'Cancelado',
                'CanceladaPorPaciente',
                'CanceladaPorPsicologo',
                'CanceladaPorInatividade',
                'PacienteNaoCompareceu',
                'PsicologoNaoCompareceu',
                'Realizada'
            ];

            if (!consultaStatus || invalidStatuses.includes(consultaStatus)) {
                return;
            }

            // Marca como EmAndamento
            const statusService = new ConsultaStatusService();
            await statusService.iniciarConsulta(consultaId);
            console.log(`✅ [markConsultationStartIfEligible] Consulta ${consultaId} marcada como EmAndamento`);
        } catch (error) {
            console.error(`[markConsultationStartIfEligible] Erro:`, error);
            throw error;
        }
    }

    /**
     * Endpoint para gerar token RTM (Realtime Message) da Agora
     * Token específico para comunicação em tempo real
     * 
     * @param req - Request com channelName no body
     * @param res - Response com token RTM
     */
    async generateRtmToken(req: Request, res: Response): Promise<Response> {
        try {
            const { channelName } = req.body;

            if (!channelName) {
                return res.status(400).json({ error: 'channelName é obrigatório' });
            }

            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            // Busca a reserva de sessão pelo channelName
            const reservaSessao = await this.prisma.reservaSessao.findFirst({
                where: { AgoraChannel: channelName },
                include: {
                    Consulta: true
                }
            });

            if (!reservaSessao) {
                return res.status(404).json({ error: 'Consulta não encontrada' });
            }

            // Valida se o usuário é paciente ou psicólogo
            const isPatient = reservaSessao.PatientId === userId;
            const isPsychologist = reservaSessao.PsychologistId === userId;

            if (!isPatient && !isPsychologist) {
                return res.status(403).json({ error: 'Você não tem acesso a esta consulta' });
            }

            const role: 'patient' | 'psychologist' = isPatient ? 'patient' : 'psychologist';
            const currentUserId = isPatient
                ? reservaSessao.PatientId
                : reservaSessao.PsychologistId;

            if (!currentUserId) {
                return res.status(500).json({ error: 'ID do usuário não encontrado' });
            }

            // Gera token RTM usando o ID do usuário como account
            const rtmToken = await this.agoraService.generateRtmToken(channelName, currentUserId);

            console.log(
                `✅ [generateRtmToken] Token RTM gerado para ${role}: ` +
                `ConsultaId=${reservaSessao.ConsultaId}, Channel=${channelName}`
            );

            return res.json({
                token: rtmToken,
                role
            });
        } catch (error) {
            console.error('[generateRtmToken] Erro:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({
                error: 'Erro ao gerar token RTM',
                details: errorMessage
            });
        }
    }

    /**
     * Endpoint para verificar e gerar tokens da Agora
     * 
     * Fluxo:
     * 1. Valida autenticação e acesso do usuário
     * 2. Busca ou cria a ReservaSessao se não existir
     * 3. Se tokens não existem, chama generateBothTokens() para criar ambos
     * 4. Retorna status e confirmação de geração
     * 
     * @param req - Request com consultaId no body
     * @param res - Response com status de tokens
     */
    async checkAndGenerateTokens(req: Request, res: Response): Promise<Response> {
        try {
            const { consultaId } = req.body;
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            if (!consultaId) {
                return res.status(400).json({ error: 'consultaId é obrigatório' });
            }

            console.log(`[checkAndGenerateTokens] Verificando tokens para consulta ${consultaId}`);

            // Busca a consulta
            const consulta = await this.prisma.consulta.findUnique({
                where: { Id: consultaId },
                select: {
                    PacienteId: true,
                    PsicologoId: true,
                    Status: true,
                    Date: true,
                    Time: true,
                    AgendaId: true,
                }
            });

            if (!consulta) {
                return res.status(404).json({ error: 'Consulta não encontrada' });
            }

            // Valida acesso do usuário
            const isPatient = consulta.PacienteId === userId;
            const isPsychologist = consulta.PsicologoId === userId;

            if (!isPatient && !isPsychologist) {
                return res.status(403).json({ error: 'Você não tem acesso a esta consulta' });
            }

            // Busca ou cria a ReservaSessao
            let reservaSessao = await this.prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultaId },
                include: {
                    Consulta: {
                        select: {
                            PacienteId: true,
                            PsicologoId: true,
                            Status: true,
                        },
                    },
                },
            });

            // Se não existe, cria a ReservaSessao
            if (!reservaSessao) {
                console.log(
                    `🔄 [checkAndGenerateTokens] ReservaSessao não encontrada. Criando para consulta ${consultaId}...`
                );

                if (!consulta.PacienteId || !consulta.PsicologoId) {
                    return res.status(400).json({
                        error: 'Consulta sem paciente ou psicólogo definidos'
                    });
                }

                try {
                    // Usa deriveUidFromUuid para garantir consistência dos UIDs
                    const uidPaciente = deriveUidFromUuid(consulta.PacienteId);
                    const uidPsicologo = deriveUidFromUuid(consulta.PsicologoId);

                    reservaSessao = await this.prisma.reservaSessao.create({
                        data: {
                            ConsultaId: consultaId,
                            ReservationId: consultaId,
                            Status: 'Reservado',
                            PatientId: consulta.PacienteId,
                            PsychologistId: consulta.PsicologoId,
                            AgoraChannel: `sala_${consultaId}`,
                            Uid: uidPaciente,
                            UidPsychologist: uidPsicologo,
                            AgendaId: consulta.AgendaId,
                        },
                        include: {
                            Consulta: {
                                select: {
                                    PacienteId: true,
                                    PsicologoId: true,
                                    Status: true,
                                },
                            },
                        },
                    });

                    console.log(
                        `✅ [checkAndGenerateTokens] ReservaSessao criada com sucesso`
                    );
                } catch (createError) {
                    console.error(
                        `❌ [checkAndGenerateTokens] Erro ao criar ReservaSessao:`,
                        createError
                    );
                    throw createError;
                }
            }

            // Verifica se ambos os tokens já existem e são válidos (não null, não vazios)
            const hasPatientToken = !!reservaSessao.AgoraTokenPatient &&
                reservaSessao.AgoraTokenPatient.trim().length > 0;
            const hasPsychologistToken = !!reservaSessao.AgoraTokenPsychologist &&
                reservaSessao.AgoraTokenPsychologist.trim().length > 0;

            // Se ambos os tokens já existem e são válidos, retorna sucesso
            if (hasPatientToken && hasPsychologistToken) {
                console.log(
                    `✅ [checkAndGenerateTokens] Tokens já existem e são válidos para consulta ${consultaId}`
                );
                return res.json({
                    success: true,
                    tokensExist: true,
                    tokensGenerated: false,
                    message: 'Tokens já foram gerados anteriormente',
                    consultaId,
                    patientTokenExists: hasPatientToken,
                    psychologistTokenExists: hasPsychologistToken,
                });
            }

            // Se algum token estiver ausente ou inválido, gera ambos de forma sincronizada
            // Isso garante que sempre teremos ambos os tokens válidos
            console.log(
                `🔄 [checkAndGenerateTokens] Gerando tokens (algum ausente ou inválido). ` +
                `Patient: ${hasPatientToken ? '✅' : '❌'}, Psychologist: ${hasPsychologistToken ? '✅' : '❌'}`
            );

            const tokenResult = await this.generateBothTokens(reservaSessao);

            if (!tokenResult.success) {
                return res.status(500).json({
                    success: false,
                    tokensExist: hasPatientToken && hasPsychologistToken,
                    tokensGenerated: false,
                    message: 'Falha ao gerar tokens',
                    consultaId,
                    error: tokenResult.error,
                });
            }

            // Recarrega a reserva para confirmar
            const reservaAtualizada = await this.prisma.reservaSessao.findUnique({
                where: { ConsultaId: consultaId },
            });

            console.log(
                `✅ [checkAndGenerateTokens] Tokens gerados com sucesso para consulta ${consultaId}`
            );

            return res.json({
                success: true,
                tokensExist: true,
                tokensGenerated: true,
                message: 'Tokens foram gerados com sucesso',
                consultaId,
                patientTokenExists: !!reservaAtualizada?.AgoraTokenPatient,
                psychologistTokenExists: !!reservaAtualizada?.AgoraTokenPsychologist,
            });
        } catch (error) {
            console.error(`[checkAndGenerateTokens] Erro geral:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({
                success: false,
                error: 'Erro ao verificar e gerar tokens',
                details: errorMessage,
            });
        }
    }

    /**
     * Endpoint para geração manual de token Agora
     * Permite gerar um token diretamente fornecendo channelName, uid e role
     * Útil para testes e geração manual de tokens
     * 
     * @param req - Request com { channelName, uid, role? } no body
     * @param res - Response com token gerado
     */
    async generateManualToken(req: Request, res: Response): Promise<Response> {
        try {
            const { channelName, uid, role } = req.body;

            // Validações
            if (!channelName) {
                return res.status(400).json({ 
                    error: 'channelName é obrigatório',
                    message: 'Forneça o nome do canal Agora'
                });
            }

            if (!uid) {
                return res.status(400).json({ 
                    error: 'uid é obrigatório',
                    message: 'Forneça o UID do usuário (número ou string)'
                });
            }

            // Role padrão é 'patient' se não fornecido
            const userRole: 'patient' | 'psychologist' = role === 'psychologist' ? 'psychologist' : 'patient';

            console.log(`[AgoraController] Geração manual de token solicitada:`, {
                channelName,
                uid,
                role: userRole
            });

            // Gera o token usando o serviço
            const token = await this.agoraService.generateToken(channelName, uid, userRole);

            console.log(`✅ [AgoraController] Token gerado manualmente com sucesso para ${userRole} no canal ${channelName}`);

            return res.status(200).json({
                success: true,
                token,
                channelName,
                uid: typeof uid === 'string' ? Number(uid) : uid,
                role: userRole,
                expiresIn: 3000, // 50 minutos em segundos
                message: 'Token gerado com sucesso'
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`❌ [AgoraController] Erro ao gerar token manual:`, error);
            
            return res.status(500).json({
                success: false,
                error: 'Erro ao gerar token',
                message: errorMessage
            });
        }
    }
}


/**
 * Processa o repasse de forma assíncrona para qualquer cenário permitido (concluída, cancelada por paciente ou inatividade).
 * @param consultationId Id da consulta
 * @param motivoCancelamento Opcional: motivo do repasse (ex: 'cancelamento_paciente', 'cancelamento_inatividade', 'concluida')
 */
export async function processRepasseAsync(
    consultationId: string,
    motivoCancelamento?: 'cancelamento_paciente' | 'cancelamento_inatividade' | 'concluida'
): Promise<void> {
    try {
        // Busca a consulta com todos os dados necessários, incluindo cancelamentos
        const consulta = await prisma.consulta.findUnique({
            where: { Id: consultationId },
            include: {
                Paciente: {
                    include: {
                        AssinaturaPlanos: {
                            where: { Status: 'Ativo' },
                            include: {
                                PlanoAssinatura: true
                            }
                        }
                    }
                },
                Psicologo: true,
                Cancelamentos: {
                    orderBy: { Data: 'desc' },
                    take: 1
                }
            }
        });

        if (!consulta) {
            console.error(`[AgoraController] Consulta não encontrada para repasse: ${consultationId}`);
            return;
        }

        // Determina o status normalizado da consulta
        const { determinarStatusNormalizado, determinarRepasse } = await import('../utils/statusConsulta.util');

        const cancelamentoMaisRecente = consulta.Cancelamentos?.[0];
        const cancelamentoDeferido = cancelamentoMaisRecente?.Status === 'Deferido';

        const statusNormalizado = await determinarStatusNormalizado(consulta.Status, {
            tipoAutor: cancelamentoMaisRecente?.Tipo,
            dataConsulta: consulta.Date,
            motivo: cancelamentoMaisRecente?.Motivo,
            cancelamentoDeferido,
            pacienteNaoCompareceu: consulta.Status === 'PacienteNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoMaisRecente?.Tipo === 'Paciente'),
            psicologoNaoCompareceu: consulta.Status === 'PsicologoNaoCompareceu' || (consulta.Status === 'Cancelado' && cancelamentoMaisRecente?.Tipo === 'Psicologo')
        });

        // Verifica se deve fazer repasse baseado no status normalizado
        const deveFazerRepasse = determinarRepasse(statusNormalizado, cancelamentoDeferido);

        if (!deveFazerRepasse) {
            console.log(`[AgoraController] Repasse não aplicável para consulta ${consultationId} com status ${statusNormalizado}`);

            // Remove comissão existente se houver (caso o status mude para não repassável)
            const comissaoExistente = await prisma.commission.findFirst({
                where: { ConsultaId: consultationId }
            });

            if (comissaoExistente) {
                await prisma.commission.delete({
                    where: { Id: comissaoExistente.Id }
                });
                console.log(`[AgoraController] Comissão removida para consulta ${consultationId} (status não repassável)`);
            }

            return;
        }

        // Calcula o valor base da consulta
        let valorBase = consulta.Valor ?? 0;
        let tipoPlano: CommissionTipoPlano = CommissionTipoPlano.avulsa;

        // Se o paciente tem plano ativo, calcula o valor base conforme o tipo de plano
        const planoAssinatura = consulta.Paciente?.AssinaturaPlanos?.find(
            p => p.Status === "Ativo" && (!p.DataFim || new Date(p.DataFim) >= consulta.Date)
        );

        if (planoAssinatura && planoAssinatura.PlanoAssinatura) {
            const tipo = planoAssinatura.PlanoAssinatura.Tipo?.toLowerCase();
            if (tipo === "mensal") {
                tipoPlano = CommissionTipoPlano.mensal;
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 4;
            } else if (tipo === "trimestral") {
                tipoPlano = CommissionTipoPlano.trimestral;
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 12;
            } else if (tipo === "semestral") {
                tipoPlano = CommissionTipoPlano.semestral;
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 24;
            } else {
                tipoPlano = CommissionTipoPlano.avulsa;
                valorBase = consulta.Valor ?? 0;
            }
        }

        // Obtém o percentual de repasse (40% para PJ, 32% para autônomo)
        const repassePercent = await getRepassePercentForPsychologist(consulta.PsicologoId);
        const valorPsicologo = valorBase * repassePercent;

        // Verifica se já existe uma comissão para esta consulta
        const comissaoExistente = await prisma.commission.findFirst({
            where: { ConsultaId: consultationId }
        });

        const now = new Date();
        const ano = now.getFullYear();
        const mes = now.getMonth() + 1;
        if (!consulta.PsicologoId || !consulta.PacienteId) {
            console.error(`[AgoraController] PsicologoId ou PacienteId não encontrado para consulta ${consultationId}`);
            return;
        }
        const psicologoId: string = consulta.PsicologoId;
        const pacienteId: string = consulta.PacienteId;
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId }
        });
        const statusRepasse: CommissionStatus = psicologo?.Status === "Ativo" ? CommissionStatus.disponivel : CommissionStatus.retido;

        // Define o tipo do repasse baseado no status normalizado
        let typeRepasse = "repasse";
        if (motivoCancelamento === 'cancelamento_paciente') typeRepasse = 'repasse_cancelamento_paciente';
        if (motivoCancelamento === 'cancelamento_inatividade') typeRepasse = 'repasse_cancelamento_inatividade';

        const dataComissao = {
            ConsultaId: consultationId,
            PsicologoId: psicologoId,
            PacienteId: pacienteId,
            Valor: valorPsicologo,
            Status: statusRepasse,
            Periodo: `${ano}-${mes}`,
            TipoPlano: tipoPlano,
            Type: typeRepasse
        };

        if (comissaoExistente) {
            await prisma.commission.update({
                where: { Id: comissaoExistente.Id },
                data: dataComissao
            });
            console.log(`✅ [AgoraController] Comissão atualizada para consulta ${consultationId}: R$ ${valorPsicologo.toFixed(2)} [${typeRepasse}] - Status: ${statusNormalizado}`);
        } else {
            if (!psicologoId) {
                console.error(`[AgoraController] PsicologoId não encontrado para consulta ${consultationId}`);
                return;
            }
            await prisma.commission.create({ data: dataComissao });
            console.log(`✅ [AgoraController] Comissão criada para consulta ${consultationId}: R$ ${valorPsicologo.toFixed(2)} [${typeRepasse}] - Status: ${statusNormalizado}`);

            // Registra criação de comissão na auditoria
            try {
                const { logCommissionCreate } = await import('../utils/auditLogger.util');
                await logCommissionCreate(
                    psicologoId,
                    consultationId,
                    valorPsicologo,
                    tipoPlano,
                    undefined // IP não disponível aqui
                );
            } catch (auditError) {
                console.error('[AgoraController] Erro ao registrar auditoria de comissão:', auditError);
                // Não interrompe o fluxo
            }
        }
    } catch (error) {
        console.error(`❌ [AgoraController] Erro ao processar repasse para consulta ${consultationId}:`, error);
    }
}

