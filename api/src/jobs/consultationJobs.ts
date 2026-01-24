import prisma from "../prisma/client";
import { consultationQueue } from "../queues/consultationQueue";
import { Worker, QueueEvents } from "bullmq";
import { getBullMQConnectionOptions } from "../config/redis.config";
import { attachQueueEventsLogging } from "../utils/bullmqLogs";
import { WebSocketNotificationService } from "./../services/websocketNotification.service";
import { getEventSyncService } from "./../services/eventSync.service";
import { getRepassePercentForPsychologist } from "../utils/repasse.util";
import { EmailService } from "../services/email.service";
import { ConsultaRoomService } from "../services/consultaRoom.service";
import { ConsultaStatusService } from "../services/consultaStatus.service";
import { SessionStatusService } from "../services/sessionStatus.service";
import { AutorTipoCancelamento, AgendaStatus } from "../types/permissions.types";
import type { Prisma } from "../generated/prisma";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BRASILIA_TIMEZONE, nowBrasiliaTimestamp, nowBrasiliaDate, toBrasiliaISO, toBrasilia, nowBrasilia } from "../utils/timezone.util";

dayjs.extend(utc);
dayjs.extend(timezone);


let started = false;
export let worker: Worker | null = null;
export let events: QueueEvents | null = null;

// Função centralizada para obter conexão compatível com BullMQ
export function getQueueConnection() {
    return getBullMQConnectionOptions();
}

const wsNotify = new WebSocketNotificationService();
const eventSync = getEventSyncService();

export async function scheduleConsultationJobs(consultationId: string, scheduledAt: Date) {
    // Calcula o atraso até o horário agendado usando timezone de Brasília
    // Garante que todos os cálculos sejam feitos no fuso horário correto
    const scheduledTimeBr = dayjs.tz(scheduledAt, BRASILIA_TIMEZONE);
    const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
    const baseDelayMs = Math.max(0, scheduledTimeBr.valueOf() - nowBr.valueOf());
    const delay = (ms: number) => Math.max(0, baseDelayMs + ms);

    if (!consultationQueue) {
        console.log('[BullMQ] Não agendando jobs: consultationQueue não inicializada.');
        return;
    }

    // Inicializa estado da sessão no Redis como 'scheduled'
    const sessionStatusService = new SessionStatusService();
    await sessionStatusService.initializeSession(consultationId);

    await consultationQueue.add("notifyStart", { consultationId }, { delay: delay(-10 * 60 * 1000) });
    
    // Job para iniciar sessão no horário exato (controla estado da sessão no Redis)
    await consultationQueue.add("start-session", { consultationId }, { delay: delay(0) });
    
    // Gera tokens exatamente no horário da consulta (server-time aligned)
    await consultationQueue.add("startConsultation", { consultationId }, { delay: delay(0) });
    // Notifica 30 segundos antes dos 10 minutos (9min30s após o início)
    await consultationQueue.add("warnInactivity", { consultationId }, { delay: delay(9 * 60 * 1000 + 30 * 1000) });
    await consultationQueue.add("cancelIfNoJoin", { consultationId }, { delay: delay(10 * 60 * 1000) });
    
    // 🎯 Notificações de tempo restante (baseado em 50 minutos de duração)
    // 50 - 15 = 35 minutos após o início
    await consultationQueue.add("notifyTimeRemaining", { consultationId, minutesRemaining: 15 }, { delay: delay(35 * 60 * 1000) });
    // 50 - 10 = 40 minutos após o início
    await consultationQueue.add("notifyTimeRemaining", { consultationId, minutesRemaining: 10 }, { delay: delay(40 * 60 * 1000) });
    // 50 - 5 = 45 minutos após o início
    await consultationQueue.add("notifyTimeRemaining", { consultationId, minutesRemaining: 5 }, { delay: delay(45 * 60 * 1000) });
    // 50 - 3 = 47 minutos após o início
    await consultationQueue.add("notifyTimeRemaining", { consultationId, minutesRemaining: 3 }, { delay: delay(47 * 60 * 1000) });
    
    // 🎯 Job para finalizar sessão após 50 minutos (controla estado da sessão no Redis)
    await consultationQueue.add("finish-session", { consultationId }, { delay: delay(50 * 60 * 1000) });
    
    // 🎯 Finaliza consulta automaticamente após 50 minutos se ambos estiverem na sala
    await consultationQueue.add("finalizeConsultation", { consultationId }, { delay: delay(50 * 60 * 1000) });
    // Job de segurança para garantir finalização (após 50 minutos + 1 minuto de margem)
    await consultationQueue.add("endConsultation", { consultationId }, { delay: delay(51 * 60 * 1000) });
}

/**
 * Processa o repasse de 40% (ou 32% para autônomo) para o psicólogo quando ambos entrarem na consulta
 */
export async function processRepasse(
    consultationId: string,
    _reservaSessao: Prisma.ReservaSessaoGetPayload<Record<string, never>> | null = null
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
            console.error(`[ConsultationWorker] Consulta não encontrada para repasse: ${consultationId}`);
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
            console.log(`[ConsultationWorker] Repasse não aplicável para consulta ${consultationId} com status ${statusNormalizado}`);

            // Remove comissão existente se houver (caso o status mude para não repassável)
            const comissaoExistente = await prisma.commission.findFirst({
                where: { ConsultaId: consultationId }
            });

            if (comissaoExistente) {
                await prisma.commission.delete({
                    where: { Id: comissaoExistente.Id }
                });
                console.log(`[ConsultationWorker] Comissão removida para consulta ${consultationId} (status não repassável)`);
            }

            return;
        }

        // Calcula o valor base da consulta
        let valorBase = consulta.Valor ?? 0;
        let tipoPlano: "mensal" | "trimestral" | "semestral" | "avulsa" = "avulsa";

        // Se o paciente tem plano ativo, calcula o valor base conforme o tipo de plano
        const planoAssinatura = consulta.Paciente?.AssinaturaPlanos?.find(
            p => p.Status === "Ativo" && (!p.DataFim || new Date(p.DataFim) >= consulta.Date)
        );

        if (planoAssinatura && planoAssinatura.PlanoAssinatura) {
            const tipo = planoAssinatura.PlanoAssinatura.Tipo?.toLowerCase();
            if (tipo === "mensal") {
                tipoPlano = "mensal";
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 4;
            } else if (tipo === "trimestral") {
                tipoPlano = "trimestral";
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 12;
            } else if (tipo === "semestral") {
                tipoPlano = "semestral";
                valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 24;
            } else {
                tipoPlano = "avulsa";
                valorBase = consulta.Valor ?? 0;
            }
        }

        // 🎯 Se não tem valor base (consulta avulsa/promocional sem valor), busca do PlanoAssinatura
        if (valorBase === 0) {
            // Busca plano avulsa ou única para obter o valor (189.99 avulsa, 59.99 promocional)
            const planoAvulsa = await prisma.planoAssinatura.findFirst({
                where: {
                    Tipo: { in: ["Avulsa", "Unica"] },
                    Status: "Ativo"
                },
                orderBy: { Preco: 'desc' } // Pega o mais caro primeiro (189.99)
            });
            
            if (planoAvulsa && planoAvulsa.Preco) {
                valorBase = planoAvulsa.Preco;
                console.log(`[ConsultationWorker] Consulta ${consultationId}: Usando valor do plano avulsa: R$ ${valorBase.toFixed(2)}`);
            }
        }

        // Obtém o percentual de repasse (40% para PJ, 32% para autônomo)
        const repassePercent = await getRepassePercentForPsychologist(consulta.PsicologoId);
        const valorPsicologo = valorBase * repassePercent;

        // Verifica se já existe uma comissão para esta consulta
        const comissaoExistente = await prisma.commission.findFirst({
            where: { ConsultaId: consultationId }
        });

        // Usa horário de Brasília para período
        const nowBr = dayjs.tz(dayjs(), BRASILIA_TIMEZONE);
        const ano = nowBr.year();
        const mes = nowBr.month() + 1;
        const psicologoId: string | undefined = consulta.PsicologoId ?? undefined;
        const psicologo = await prisma.user.findUnique({
            where: { Id: psicologoId }
        });
        
        // 🎯 Calcula status baseado na data de corte (dia 20)
        // A partir do dia 21, saldo não solicitado fica retido para o próximo mês
        let statusRepasse: "disponivel" | "retido";
        if (psicologo?.Status !== "Ativo") {
            statusRepasse = "retido";
        } else {
            const { calcularStatusRepassePorDataCorte } = await import('../scripts/processarRepassesConsultas');
            const statusCalculado = calcularStatusRepassePorDataCorte(consulta.Date, psicologo.Status);
            statusRepasse = statusCalculado === "disponivel" ? "disponivel" : "retido";
        }

        if (comissaoExistente) {
            // Atualiza a comissão existente
            await prisma.commission.update({
                where: { Id: comissaoExistente.Id },
                data: {
                    Valor: valorPsicologo,
                    Status: statusRepasse,
                    Periodo: `${ano}-${mes}`,
                    TipoPlano: tipoPlano,
                    Type: "repasse"
                }
            });
            console.log(`✅ [ConsultationWorker] Comissão atualizada para consulta ${consultationId}: R$ ${valorPsicologo.toFixed(2)} - Status: ${statusNormalizado}`);
        } else {
            // Cria nova comissão
            // PsicologoId é obrigatório no schema, então valida antes de criar
            if (!consulta.PsicologoId) {
                console.error(`[ConsultationWorker] PsicologoId não encontrado para consulta ${consultationId}`);
                return;
            }
            const psicologoId: string = consulta.PsicologoId;
            const pacienteId: string | undefined = consulta.PacienteId ?? undefined;
            await prisma.commission.create({
                data: {
                    ConsultaId: consultationId,
                    PsicologoId: psicologoId,
                    PacienteId: pacienteId,
                    Valor: valorPsicologo,
                    Status: statusRepasse,
                    Periodo: `${ano}-${mes}`,
                    TipoPlano: tipoPlano,
                    Type: "repasse"
                }
            });
            console.log(`✅ [ConsultationWorker] Comissão criada para consulta ${consultationId}: R$ ${valorPsicologo.toFixed(2)} (${(repassePercent * 100).toFixed(0)}%) - Status: ${statusNormalizado}`);

            // Registra criação de comissão na auditoria
            try {
                const { logCommissionCreate } = await import('../utils/auditLogger.util');
                await logCommissionCreate(
                    psicologoId,
                    consultationId,
                    valorPsicologo,
                    tipoPlano,
                    undefined // IP não disponível em jobs
                );
            } catch (auditError) {
                console.error('[ConsultationWorker] Erro ao registrar auditoria de comissão:', auditError);
                // Não interrompe o fluxo
            }
        }
    } catch (error) {
        console.error(`❌ [ConsultationWorker] Erro ao processar repasse para consulta ${consultationId}:`, error);
        throw error;
    }
}

export async function startConsultationWorker() {
    if (started) {
        console.log("⚠️ [ConsultationWorker] Worker já está rodando");
        return;
    }
    started = true;

    const connection = getQueueConnection();
    // Otimizado: reduzido de 5 para 3 para economizar CPU
    const concurrency = Number(process.env.CONSULTATION_WORKER_CONCURRENCY ?? "3");

    if (!consultationQueue) {
        console.log('[BullMQ] ConsultationWorker não inicializado: consultationQueue não disponível.');
        return;
    }
    worker = new Worker(
        consultationQueue.name,
        async (job) => {
            const jobStartTime = Date.now();
            console.log(`[ConsultationWorker] INICIANDO job: ${job.id} (${job.name})`, job.data);
            try {
                switch (job.name) {
                    case "notifyStart":
                        await wsNotify.emitConsultation(`consultation:${job.data.consultationId}`, { status: "startingSoon" });
                        // Publica via Event Sync para Socket.io
                        await eventSync.publishEvent('consultation:events', {
                            consultationId: job.data.consultationId,
                            event: 'consultation:starting-soon',
                            payload: { status: "startingSoon" }
                        });
                        break;
                    case "start-session":
                        {
                            const { consultationId } = job.data;
                            console.log(`🟢 [ConsultationWorker] Iniciando sessão no Redis: ${consultationId}`);
                            
                            try {
                                const sessionStatusService = new SessionStatusService();
                                
                                // Busca a consulta para obter patientId e psychologistId
                                const consulta = await prisma.consulta.findUnique({
                                    where: { Id: consultationId },
                                    select: {
                                        PacienteId: true,
                                        PsicologoId: true
                                    }
                                });

                                if (!consulta) {
                                    console.error(`❌ [ConsultationWorker] Consulta não encontrada: ${consultationId}`);
                                    break;
                                }

                                // Define status como 'active' com TTL de 60 minutos (3600 segundos)
                                await sessionStatusService.setSessionStatus(consultationId, 'active', 60 * 60);
                                
                                console.log(`✅ [ConsultationWorker] Sessão ${consultationId} marcada como 'active' no Redis`);

                                // Publica evento SESSION_STATUS_UPDATED via Event Sync
                                await eventSync.publishEvent('session:status-updated', {
                                    consultationId,
                                    status: 'active',
                                    patientId: consulta.PacienteId,
                                    psychologistId: consulta.PsicologoId
                                });

                                console.log(`📤 [ConsultationWorker] Evento SESSION_STATUS_UPDATED emitido para consulta ${consultationId}`);
                            } catch (error) {
                                console.error(`❌ [ConsultationWorker] Erro ao iniciar sessão ${consultationId}:`, error);
                                // Não lança erro para não interromper outros jobs
                            }
                        }
                        break;
                    case "finish-session":
                        {
                            const { consultationId } = job.data;
                            console.log(`🔴 [ConsultationWorker] Finalizando sessão no Redis: ${consultationId}`);
                            
                            try {
                                const sessionStatusService = new SessionStatusService();
                                
                                // Busca a consulta para obter patientId e psychologistId
                                const consulta = await prisma.consulta.findUnique({
                                    where: { Id: consultationId },
                                    select: {
                                        PacienteId: true,
                                        PsicologoId: true
                                    }
                                });

                                if (!consulta) {
                                    console.error(`❌ [ConsultationWorker] Consulta não encontrada: ${consultationId}`);
                                    break;
                                }

                                // Define status como 'finished'
                                await sessionStatusService.setSessionStatus(consultationId, 'finished');
                                
                                console.log(`✅ [ConsultationWorker] Sessão ${consultationId} marcada como 'finished' no Redis`);

                                // Publica evento SESSION_STATUS_UPDATED via Event Sync
                                await eventSync.publishEvent('session:status-updated', {
                                    consultationId,
                                    status: 'finished',
                                    patientId: consulta.PacienteId,
                                    psychologistId: consulta.PsicologoId
                                });

                                console.log(`📤 [ConsultationWorker] Evento SESSION_STATUS_UPDATED emitido para consulta ${consultationId}`);
                            } catch (error) {
                                console.error(`❌ [ConsultationWorker] Erro ao finalizar sessão ${consultationId}:`, error);
                                // Não lança erro para não interromper outros jobs
                            }
                        }
                        break;
                    case "startConsultation":
                        {
                            const { consultationId } = job.data;
                            console.log(`[ConsultationWorker] Iniciando consulta: ${consultationId}`);

                            // Busca a reserva de sessão
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                include: {
                                    Consulta: true
                                }
                            });

                            if (!reservaSessao) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            // 🎯 REGRA: Muda status para EmAndamento automaticamente no horário do ScheduledAt
                            // Independente de quem entrou ou não
                            const consultaAtual = await prisma.consulta.findUnique({
                                where: { Id: consultationId },
                                select: { Status: true }
                            });

                            if (consultaAtual && consultaAtual.Status !== 'EmAndamento') {
                                try {
                                    const statusService = new ConsultaStatusService();
                                    await statusService.iniciarConsulta(consultationId);
                                    console.log(`✅ [ConsultationWorker] Status da consulta ${consultationId} atualizado para EmAndamento automaticamente no horário do ScheduledAt`);
                                } catch (statusError) {
                                    console.error(`❌ [ConsultationWorker] Erro ao atualizar status para EmAndamento:`, statusError);
                                }
                            } else if (consultaAtual?.Status === 'EmAndamento') {
                                console.log(`ℹ️ [ConsultationWorker] Consulta ${consultationId} já está em EmAndamento`);
                            }

                            // Inicializa sala no Redis
                            const roomService = new ConsultaRoomService();
                            const consulta = reservaSessao.Consulta;
                            // Usa horário de Brasília para scheduledAt
                            const scheduledAt = reservaSessao.ScheduledAt
                                ? toBrasilia(reservaSessao.ScheduledAt).toDate()
                                : (consulta?.Date ? toBrasilia(consulta.Date).toDate() : nowBrasiliaDate());

                            await roomService.initializeRoom(consultationId, scheduledAt);

                            // Inicia duração no Redis no momento inicial da consulta
                            try {
                                // Busca duração padrão da consulta nas configurações (minutos)
                                const config = await prisma.configuracao.findFirst({
                                    select: { duracaoConsultaMin: true }
                                });
                                const duracaoMin = config?.duracaoConsultaMin || 50; // padrão 50 min
                                const totalSegundos = duracaoMin * 60;
                                const timestamp = nowBrasiliaTimestamp();

                                // No start, duration = 0 e timeRemaining = totalSegundos
                                await roomService.saveSessionDuration(
                                    consultationId,
                                    0,
                                    totalSegundos,
                                    timestamp
                                );
                                console.log(`⏱️ [ConsultationWorker] Duração iniciada no Redis para ${consultationId} (0/${totalSegundos}s)`);
                            } catch (err) {
                                console.error(`❌ [ConsultationWorker] Erro ao iniciar duração no Redis:`, err);
                            }

                            // Gera/garante ambos os tokens exatamente no horário da consulta
                            // Alinhado ao horário do servidor (server-time)
                            try {
                                const { ensureAgoraTokensForConsulta } = await import('../services/agoraToken.service');
                                const tokenResult = await ensureAgoraTokensForConsulta(prisma, consultationId, {
                                    source: 'worker',
                                });

                                const patientToken = tokenResult.patientToken;
                                const psychologistToken = tokenResult.psychologistToken;

                                console.log(`✅ [ConsultationWorker] Tokens garantidos para consulta ${consultationId} no horário da consulta`);

                                // Registra tokens no Redis (garante sincronização)
                                await roomService.registerParticipantJoin(consultationId, 'patient', patientToken);
                                await roomService.registerParticipantJoin(consultationId, 'psychologist', psychologistToken);

                                // Atualiza status da consulta para EmAndamento
                                try {
                                    const statusService = new ConsultaStatusService();
                                    await statusService.iniciarConsulta(consultationId);
                                    console.log(`✅ [ConsultationWorker] Status da consulta ${consultationId} atualizado para EmAndamento`);
                                    
                                    // Notifica atualização via WebSocket
                                    try {
                                        const { ProximaConsultaService } = await import('../services/proximaConsulta.service');
                                        const proximaConsultaService = new ProximaConsultaService();
                                        if (consulta.PsicologoId && consulta.PacienteId) {
                                            await proximaConsultaService.notificarAmbosUsuarios(
                                                consulta.PsicologoId,
                                                consulta.PacienteId,
                                                'atualizacao'
                                            );
                                        }
                                    } catch (notifyErr) {
                                        console.error('[ConsultationWorker] Erro ao notificar atualização:', notifyErr);
                                    }
                                } catch (statusError) {
                                    console.error(`❌ [ConsultationWorker] Erro ao atualizar status para EmAndamento:`, statusError);
                                    // Não lança erro para não interromper o fluxo de tokens
                                }

                                // Notifica ambos sobre o início da consulta
                                await wsNotify.emitConsultation(`consultation:${consultationId}`, {
                                    status: "started",
                                    tokensReady: true
                                });

                                // Publica via Event Sync para Socket.io
                                await eventSync.publishEvent('consultation:events', {
                                    consultationId,
                                    event: 'consultation:started',
                                    payload: {
                                        status: "started",
                                        tokensReady: true,
                                        patientToken: patientToken,
                                        psychologistToken: psychologistToken
                                    }
                                });
                            } catch (error) {
                                console.error(`❌ [ConsultationWorker] Erro ao gerar tokens para consulta ${consultationId}:`, error);
                                throw error;
                            }
                        }
                        break;
                    case "notifyEndWarning":
                        await wsNotify.emitConsultation(`consultation:${job.data.consultationId}`, { status: "endingSoon" });
                        break;
                    case "warnInactivity":
                        {
                            const { consultationId } = job.data;
                            console.log(`⚠️ [ConsultationWorker] Verificando inatividade 30s antes dos 10min: ${consultationId}`);

                            // Busca a reserva de sessão para verificar se ambos entraram
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                include: {
                                    Consulta: {
                                        include: {
                                            Paciente: { select: { Id: true, Nome: true } },
                                            Psicologo: { select: { Id: true, Nome: true } }
                                        }
                                    }
                                }
                            });

                            if (!reservaSessao || !reservaSessao.Consulta) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            const patientJoined = reservaSessao.PatientJoinedAt !== null;
                            const psychologistJoined = reservaSessao.PsychologistJoinedAt !== null;

                            // Se algum não entrou, envia aviso
                            if (!patientJoined || !psychologistJoined) {
                                let missingRole: "Patient" | "Psychologist" | "Both";
                                let missingName: string;

                                if (!patientJoined && !psychologistJoined) {
                                    // Ambos não entraram - mostra mensagem genérica
                                    missingRole = "Both";
                                    missingName = "participante";
                                } else if (!patientJoined) {
                                    missingRole = "Patient";
                                    missingName = reservaSessao.Consulta.Paciente?.Nome || "Paciente";
                                } else {
                                    missingRole = "Psychologist";
                                    missingName = reservaSessao.Consulta.Psicologo?.Nome || "Psicólogo";
                                }

                                // Envia notificação via socket (estilo Google Meet)
                                // Mensagem específica conforme as regras de negócio
                                let mensagemAviso: string;
                                if (missingRole === "Both") {
                                    mensagemAviso = "Esta sala será encerrada em 30 segundos por inatividade.";
                                } else if (missingRole === "Patient") {
                                    mensagemAviso = "Esta sala será encerrada em 30 segundos por inatividade do paciente.";
                                } else {
                                    mensagemAviso = "Esta sala será encerrada em 30 segundos por inatividade do psicólogo.";
                                }

                                await wsNotify.emitConsultation(`consultation:${consultationId}`, {
                                    event: "inactivity-warning",
                                    consultationId,
                                    message: mensagemAviso,
                                    missingRole: missingRole,
                                    missingName: missingName,
                                    countdown: 30
                                });

                                // Publica via Event Sync para Socket.io (sincronização redundante)
                                await eventSync.publishEvent('consultation:inactivity-warning', {
                                    consultationId,
                                    message: mensagemAviso,
                                    missingRole,
                                    missingName: missingName,
                                    countdown: 30
                                });

                                console.log(`⚠️ [ConsultationWorker] Aviso de inatividade enviado para consulta ${consultationId} - ${missingName} não entrou`);
                            } else {
                                console.log(`✅ [ConsultationWorker] Ambos participantes já entraram na consulta ${consultationId} - não é necessário aviso`);
                            }
                        }
                        break;
                    case "finalizeConsultation":
                        {
                            const { consultationId } = job.data;
                            console.log(`⏰ [ConsultationWorker] Finalizando consulta ${consultationId} (50 minutos após início)`);

                            // Busca a reserva de sessão para verificar se ambos estiveram na sala
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                select: {
                                    PatientJoinedAt: true,
                                    PsychologistJoinedAt: true,
                                    Consulta: {
                                        select: {
                                            Status: true,
                                            PacienteId: true,
                                            PsicologoId: true,
                                            AgendaId: true
                                        }
                                    }
                                }
                            });

                            if (!reservaSessao) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            // Verifica se ambos estiveram na sala
                            const ambosEstiveramNaSala =
                                reservaSessao.PatientJoinedAt !== null &&
                                reservaSessao.PatientJoinedAt !== undefined &&
                                reservaSessao.PsychologistJoinedAt !== null &&
                                reservaSessao.PsychologistJoinedAt !== undefined;

                            if (!ambosEstiveramNaSala) {
                                console.log(`⚠️ [ConsultationWorker] Consulta ${consultationId} não será finalizada automaticamente: ambos não estiveram na sala`);
                                break;
                            }

                            // Verifica se já está finalizada (idempotência)
                            const jaFinalizada = reservaSessao.Consulta?.Status === "Realizada";
                            if (jaFinalizada) {
                                console.log(`ℹ️ [ConsultationWorker] Consulta ${consultationId} já está finalizada - ignorando job`);
                                break;
                            }

                            console.log(`✅ [ConsultationWorker] Ambos estiveram na sala para consulta ${consultationId} - finalizando automaticamente`);

                            // Finaliza a consulta usando ConsultaStatusService (que já tem idempotência interna)
                            try {
                                const statusService = new ConsultaStatusService();
                                await statusService.finalizarConsulta(consultationId);
                                console.log(`✅ [ConsultationWorker] Consulta ${consultationId} finalizada com sucesso (Status: Realizada)`);

                                // Notifica atualização da próxima consulta
                                if (reservaSessao.Consulta) {
                                    try {
                                        const { ProximaConsultaService } = await import('../services/proximaConsulta.service');
                                        const proximaConsultaService = new ProximaConsultaService();
                                        await proximaConsultaService.notificarAmbosUsuarios(
                                            reservaSessao.Consulta.PsicologoId || '',
                                            reservaSessao.Consulta.PacienteId,
                                            'atualizacao'
                                        );
                                    } catch (err) {
                                        console.error('[ConsultationWorker] Erro ao notificar atualização:', err);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ [ConsultationWorker] Erro ao finalizar consulta ${consultationId}:`, error);
                                // Não relança o erro para não falhar o job
                            }
                        }
                        break;
                    case "notifyTimeRemaining":
                        {
                            const { consultationId, minutesRemaining } = job.data;
                            console.log(`⏰ [ConsultationWorker] Notificando tempo restante: ${minutesRemaining} minutos para consulta ${consultationId}`);

                            // Verifica se a consulta ainda está ativa e ambos estão na sala
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                select: {
                                    PatientJoinedAt: true,
                                    PsychologistJoinedAt: true,
                                    Consulta: {
                                        select: {
                                            Status: true
                                        }
                                    }
                                }
                            });

                            if (!reservaSessao) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            // Verifica se a consulta ainda está ativa
                            const status = reservaSessao.Consulta?.Status;
                            const consultaAtiva = status === 'EmAndamento' || status === 'Reservado';

                            // Verifica se ambos estão na sala
                            const ambosNaSala = reservaSessao.PatientJoinedAt !== null && reservaSessao.PsychologistJoinedAt !== null;

                            if (!consultaAtiva) {
                                console.log(`⚠️ [ConsultationWorker] Consulta ${consultationId} não está mais ativa (Status: ${status}) - não enviando notificação`);
                                break;
                            }

                            if (!ambosNaSala) {
                                console.log(`⚠️ [ConsultationWorker] Ambos não estão na sala para consulta ${consultationId} - não enviando notificação de tempo`);
                                break;
                            }

                            // Envia notificação via socket
                            const mensagem = minutesRemaining === 15
                                ? "A sessão se encerra em 15 minutos"
                                : minutesRemaining === 10
                                ? "A sessão se encerra em 10 minutos"
                                : minutesRemaining === 5
                                ? "A sessão se encerra em 5 minutos"
                                : "A sessão se encerra em 3 minutos";

                            await wsNotify.emitConsultation(`consultation:${consultationId}`, {
                                event: "time-remaining-warning",
                                consultationId,
                                message: mensagem,
                                minutesRemaining: minutesRemaining,
                                timestamp: toBrasiliaISO()
                            });

                            // Publica via Event Sync para Socket.io
                            await eventSync.publishEvent('consultation:time-remaining', {
                                consultationId,
                                minutesRemaining,
                                message: mensagem
                            });

                            console.log(`✅ [ConsultationWorker] Notificação de ${minutesRemaining} minutos enviada para consulta ${consultationId}`);
                        }
                        break;
                    case "endConsultation":
                        {
                            const { consultationId } = job.data;

                            // Busca a reserva de sessão com a consulta e agenda
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                include: {
                                    Consulta: {
                                        select: { 
                                            Status: true,
                                            PacienteId: true, 
                                            PsicologoId: true, 
                                            AgendaId: true 
                                        }
                                    }
                                }
                            });

                            if (!reservaSessao) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            // 🎯 Verifica se já está finalizada (idempotência)
                            const jaFinalizada = reservaSessao.Consulta?.Status === "Realizada";
                            if (jaFinalizada) {
                                console.log(`ℹ️ [ConsultationWorker] Consulta ${consultationId} já está finalizada (Status: Realizada) - ignorando endConsultation`);
                                break;
                            }

                            // 🎯 Verifica se ambos estiveram na sala antes de finalizar
                            const ambosEstiveramNaSala =
                                reservaSessao.PatientJoinedAt !== null &&
                                reservaSessao.PatientJoinedAt !== undefined &&
                                reservaSessao.PsychologistJoinedAt !== null &&
                                reservaSessao.PsychologistJoinedAt !== undefined;

                            if (!ambosEstiveramNaSala) {
                                console.log(`⚠️ [ConsultationWorker] Consulta ${consultationId} não será finalizada: ambos não estiveram na sala`);
                                // Ainda assim fecha a sala e limpa tokens
                                const roomService = new ConsultaRoomService();
                                await roomService.closeRoom(consultationId, 'timeout');
                                break;
                            }

                            console.log(`✅ [ConsultationWorker] Ambos estiveram na sala para consulta ${consultationId} - finalizando após 50 minutos`);

                            // 🎯 Finaliza a consulta usando ConsultaStatusService (garante atualização de status para "Realizada")
                            try {
                                const statusService = new ConsultaStatusService();
                                const consultaFinalizada = await statusService.finalizarConsulta(consultationId, false); // false = não força, verifica ambos na sala
                                
                                // Verifica se o status foi atualizado corretamente
                                const statusAtualizado = consultaFinalizada?.Status === "Realizada";
                                if (statusAtualizado) {
                                    console.log(`✅ [ConsultationWorker] Consulta ${consultationId} finalizada com sucesso (Status: Realizada)`);
                                    
                                    // Notifica atualização da próxima consulta
                                    if (reservaSessao.Consulta) {
                                        try {
                                            const { ProximaConsultaService } = await import('../services/proximaConsulta.service');
                                            const proximaConsultaService = new ProximaConsultaService();
                                            await proximaConsultaService.notificarAmbosUsuarios(
                                                reservaSessao.Consulta.PsicologoId || '',
                                                reservaSessao.Consulta.PacienteId,
                                                'atualizacao'
                                            );
                                        } catch (err) {
                                            console.error('[ConsultationWorker] Erro ao notificar atualização:', err);
                                        }
                                    }
                                } else {
                                    console.error(`❌ [ConsultationWorker] Consulta ${consultationId} não teve status atualizado corretamente. Status atual: ${consultaFinalizada?.Status}`);
                                    // Tenta atualizar manualmente se falhou
                                    try {
                                        await prisma.consulta.update({
                                            where: { Id: consultationId },
                                            data: { Status: "Realizada" }
                                        });
                                        console.log(`✅ [ConsultationWorker] Status atualizado manualmente para Realizada`);
                                    } catch (updateError) {
                                        console.error(`❌ [ConsultationWorker] Erro ao atualizar status manualmente:`, updateError);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ [ConsultationWorker] Erro ao finalizar consulta ${consultationId}:`, error);
                                // Tenta atualizar status diretamente se finalizarConsulta falhar
                                try {
                                    await prisma.consulta.update({
                                        where: { Id: consultationId },
                                        data: { Status: "Realizada" }
                                    });
                                    console.log(`✅ [ConsultationWorker] Status atualizado diretamente para Realizada após erro`);
                                } catch (updateError) {
                                    console.error(`❌ [ConsultationWorker] Erro ao atualizar status diretamente:`, updateError);
                                }
                            }

                            // 🎯 Verifica novamente o status antes de notificar (evita notificar status incorreto)
                            const reservaVerificacaoFinal = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                include: {
                                    Consulta: {
                                        select: { Status: true }
                                    }
                                }
                            });

                            // Só notifica se o status foi atualizado para Realizada
                            if (reservaVerificacaoFinal?.Consulta?.Status === "Realizada") {
                                await wsNotify.emitConsultation(`consultation:${consultationId}`, { status: "Concluido" });

                                // Publica via Event Sync para Socket.io
                                await eventSync.publishEvent('consultation:status-changed', {
                                    consultationId,
                                    status: 'Concluido',
                                    reason: 'end-time-reached'
                                });
                            } else {
                                console.warn(`⚠️ [ConsultationWorker] Consulta ${consultationId} não foi finalizada corretamente. Status atual: ${reservaVerificacaoFinal?.Consulta?.Status}`);
                            }

                            // Processa repasse para consulta realizada (se ainda não foi processado)
                            try {
                                // processRepasse busca os dados internamente, então pode passar null
                                await processRepasse(consultationId, null);
                            } catch (repasseError) {
                                console.error(`[ConsultationWorker] Erro ao processar repasse após conclusão da consulta ${consultationId}:`, repasseError);
                            }

                            // Notifica atualização da próxima consulta
                            if (reservaSessao.Consulta) {
                                try {
                                    const { ProximaConsultaService } = await import('../services/proximaConsulta.service');
                                    const proximaConsultaService = new ProximaConsultaService();
                                    await proximaConsultaService.notificarAmbosUsuarios(
                                        reservaSessao.Consulta.PsicologoId || '',
                                        reservaSessao.Consulta.PacienteId,
                                        'atualizacao'
                                    );
                                } catch (err) {
                                    console.error('[ConsultationJobs] Erro ao notificar atualização:', err);
                                }
                            }
                        }
                        break;
                    case "cancelIfNoJoin":
                        {
                            const { consultationId } = job.data;
                            console.log(`[ConsultationWorker] Verificando participação na consulta após 10 minutos do início: ${consultationId}`);

                            // Busca a reserva de sessão com os campos PatientJoinedAt e PsychologistJoinedAt
                            // IMPORTANTE: Seleciona explicitamente todos os campos necessários
                            const reservaSessao = await prisma.reservaSessao.findUnique({
                                where: { ConsultaId: consultationId },
                                select: {
                                    Id: true,
                                    ConsultaId: true,
                                    ScheduledAt: true,
                                    PatientJoinedAt: true,
                                    PsychologistJoinedAt: true,
                                    Consulta: {
                                        include: {
                                            Paciente: { select: { Id: true } },
                                            Psicologo: { select: { Id: true } },
                                            CicloPlano: true
                                        }
                                    }
                                }
                            });

                            if (!reservaSessao || !reservaSessao.Consulta) {
                                console.error(`[ConsultationWorker] ReservaSessao não encontrada para consulta ${consultationId}`);
                                break;
                            }

                            // 🎯 VALIDAÇÃO CRÍTICA: Verifica se já passaram 10 minutos desde ScheduledAt
                            // NUNCA cancela antes do horário agendado + 10 minutos
                            if (!reservaSessao.ScheduledAt) {
                                console.error(`[ConsultationWorker] ScheduledAt não encontrado para consulta ${consultationId} - não pode cancelar`);
                                break;
                            }

                            const scheduledAtBr = dayjs.tz(reservaSessao.ScheduledAt, 'YYYY-MM-DD HH:mm:ss', BRASILIA_TIMEZONE);
                            if (!scheduledAtBr.isValid()) {
                                console.error(`[ConsultationWorker] ScheduledAt inválido para consulta ${consultationId}: ${reservaSessao.ScheduledAt}`);
                                break;
                            }

                            const agoraBr = nowBrasilia();
                            const deadline = scheduledAtBr.add(10, 'minute');
                            
                            // Se ainda não passaram 10 minutos desde ScheduledAt, NÃO cancela
                            if (agoraBr.isBefore(deadline)) {
                                console.log(`⏳ [ConsultationWorker] Ainda não passaram 10 minutos desde ScheduledAt (${scheduledAtBr.format('YYYY-MM-DD HH:mm:ss')}) para consulta ${consultationId}. Deadline: ${deadline.format('YYYY-MM-DD HH:mm:ss')}. Agora: ${agoraBr.format('YYYY-MM-DD HH:mm:ss')} - NÃO CANCELANDO`);
                                break;
                            }

                            console.log(`✅ [ConsultationWorker] Passaram 10 minutos desde ScheduledAt para consulta ${consultationId}. Prosseguindo com verificação de participação.`);

                            // Verifica os campos PatientJoinedAt e PsychologistJoinedAt da tabela ReservaSessao
                            // Se algum dos campos estiver null ou undefined, considera que não entrou
                            const patientJoined = reservaSessao.PatientJoinedAt !== null && reservaSessao.PatientJoinedAt !== undefined;
                            const psychologistJoined = reservaSessao.PsychologistJoinedAt !== null && reservaSessao.PsychologistJoinedAt !== undefined;

                            console.log(`[ConsultationWorker] Verificação de participação na consulta ${consultationId}:`, {
                                patientJoined,
                                psychologistJoined,
                                PatientJoinedAt: reservaSessao.PatientJoinedAt,
                                PsychologistJoinedAt: reservaSessao.PsychologistJoinedAt,
                                ScheduledAt: reservaSessao.ScheduledAt
                            });

                            // Se algum dos campos estiver null após 10 minutos do início, cancela
                            if (!patientJoined || !psychologistJoined) {
                                console.log(`❌ [ConsultationWorker] Consulta ${consultationId} cancelada por inatividade: PatientJoinedAt=${patientJoined}, PsychologistJoinedAt=${psychologistJoined}`);

                                const roomService = new ConsultaRoomService();
                                const consulta = reservaSessao.Consulta;

                                // Determina o missingRole
                                let missingRole: "Patient" | "Psychologist" | "Both";
                                let missingRoleForRoom: 'patient' | 'psychologist' | 'both' | undefined;
                                let motivo: string;

                                if (!patientJoined && !psychologistJoined) {
                                    missingRole = "Both";
                                    missingRoleForRoom = 'both';
                                    motivo = 'Paciente e psicólogo não compareceram após 10 minutos do início da consulta';
                                } else if (!patientJoined) {
                                    missingRole = "Patient";
                                    missingRoleForRoom = 'patient';
                                    motivo = 'Paciente não compareceu após 10 minutos do início da consulta';
                                } else {
                                    missingRole = "Psychologist";
                                    missingRoleForRoom = 'psychologist';
                                    motivo = 'Psicólogo não compareceu após 10 minutos do início da consulta';
                                }

                                // Fecha a sala no Redis e invalida tokens
                                await roomService.closeRoom(consultationId, 'inactivity', missingRoleForRoom);

                                // Processa inatividade com idempotência e regras corretas
                                const statusService = new ConsultaStatusService();

                                // Validação de idempotência: verifica se já foi processada
                                const consultaAtual = await prisma.consulta.findUnique({
                                    where: { Id: consultationId },
                                    select: { Status: true }
                                });

                                const jaProcessada = consultaAtual?.Status === "PacienteNaoCompareceu" ||
                                    consultaAtual?.Status === "PsicologoNaoCompareceu" ||
                                    consultaAtual?.Status === "AmbosNaoCompareceram" ||
                                    consultaAtual?.Status?.toString().startsWith("Cancelada");

                                if (jaProcessada) {
                                    console.log(`⚠️ [ConsultationWorker] Consulta ${consultationId} já foi processada - ignorando processamento duplicado`);
                                    break;
                                }

                                // Processa inatividade (garante idempotência internamente também)
                                await statusService.processarInatividade(consultationId, missingRole);

                                // Processa repasse financeiro APENAS quando inatividade do paciente
                                if (missingRole === "Patient") {
                                    try {
                                        // processRepasse busca os dados internamente, então pode passar null
                                        await processRepasse(consultationId, null);
                                        console.log(`✅ [ConsultationWorker] Repasse financeiro processado para psicólogo na consulta ${consultationId}`);
                                    } catch (repasseError) {
                                        console.error(`❌ [ConsultationWorker] Erro ao processar repasse:`, repasseError);
                                    }
                                }

                                // Cria registro de cancelamento
                                const tipoCancelamento = missingRole === "Both"
                                    ? AutorTipoCancelamento.Sistema
                                    : missingRole === "Patient"
                                        ? AutorTipoCancelamento.Paciente
                                        : AutorTipoCancelamento.Psicologo;

                                const autorId = missingRole === "Patient"
                                    ? consulta.PsicologoId
                                    : missingRole === "Psychologist"
                                        ? consulta.PacienteId
                                        : null;

                                await prisma.cancelamentoSessao.create({
                                    data: {
                                        Protocolo: `AUTO-${nowBrasiliaTimestamp()}`,
                                        Motivo: motivo,
                                        Data: nowBrasiliaDate(),
                                        Horario: nowBrasilia().format('HH:mm'),
                                        SessaoId: consultationId,
                                        PacienteId: consulta.PacienteId || '',
                                        PsicologoId: consulta.PsicologoId || '',
                                        AutorId: autorId || '',
                                        Status: 'Deferido',
                                        Tipo: tipoCancelamento
                                    }
                                });

                                console.log(`✅ [ConsultationWorker] Sala ${consultationId} fechada e tokens invalidados`);

                                // Notifica ambos sobre o cancelamento (com flag para não abrir modal de avaliações)
                                await wsNotify.emitConsultation(`consultation:${consultationId}`, {
                                    status: "cancelled",
                                    reason: motivo,
                                    missingRole: missingRole,
                                    autoCancelled: true // Flag para indicar cancelamento automático
                                });

                                // Publica via Event Sync para Socket.io
                                await eventSync.publishEvent('consultation:inactivity', {
                                    consultationId,
                                    message: motivo,
                                    missingRole,
                                    status: 'Cancelado'
                                });

                                // Também publica mudança de status
                                await eventSync.publishEvent('consultation:status-changed', {
                                    consultationId,
                                    status: 'Cancelado',
                                    reason: 'inactivity'
                                });

                                // Envia email de cancelamento (se necessário)
                                try {
                                    const emailService = new EmailService();
                                    const consultaCompleta = await prisma.consulta.findUnique({
                                        where: { Id: consultationId },
                                        include: {
                                            Paciente: true,
                                            Psicologo: true
                                        }
                                    });

                                    if (consultaCompleta?.Paciente) {
                                        await emailService.send({
                                            to: consultaCompleta.Paciente.Email,
                                            subject: 'Consulta Cancelada',
                                            htmlTemplate: 'cancelAppointment',
                                            templateData: {
                                                pacienteNome: consultaCompleta.Paciente.Nome,
                                                psicologoNome: consultaCompleta.Psicologo?.Nome ?? 'Psicólogo não identificado',
                                                data: consultaCompleta.Date,
                                                horario: consultaCompleta.Time,
                                                motivo: motivo,
                                                dataCancelamento: nowBrasilia().format('YYYY-MM-DD'),
                                                horarioCancelamento: nowBrasilia().format('HH:mm'),
                                                protocolo: `AUTO-${consultaCompleta.Id.substring(0, 8).toUpperCase()}`
                                            }
                                        });
                                    }

                                    if (consultaCompleta?.Psicologo) {
                                        await emailService.send({
                                            to: consultaCompleta.Psicologo.Email,
                                            subject: 'Consulta Cancelada',
                                            htmlTemplate: 'cancelAppointment',
                                            templateData: {
                                                pacienteNome: consultaCompleta.Psicologo.Nome,
                                                psicologoNome: consultaCompleta.Psicologo.Nome,
                                                data: consultaCompleta.Date,
                                                horario: consultaCompleta.Time,
                                                motivo: motivo,
                                                dataCancelamento: nowBrasilia().format('YYYY-MM-DD'),
                                                horarioCancelamento: nowBrasilia().format('HH:mm'),
                                                protocolo: `AUTO-${consultaCompleta.Id.substring(0, 8).toUpperCase()}`
                                            }
                                        });
                                    }
                                } catch (emailError) {
                                    console.error(`[ConsultationWorker] Erro ao enviar email de cancelamento:`, emailError);
                                }
                            } else {
                                // Ambos entraram - processa o repasse
                                console.log(`✅ [ConsultationWorker] Ambos participantes entraram na consulta ${consultationId} - processando repasse`, {
                                    PatientJoinedAt: reservaSessao.PatientJoinedAt,
                                    PsychologistJoinedAt: reservaSessao.PsychologistJoinedAt
                                });
                                try {
                                    // processRepasse busca os dados internamente, então pode passar null
                                    await processRepasse(consultationId, null);
                                } catch (repasseError) {
                                    console.error(`❌ [ConsultationWorker] Erro ao processar repasse quando ambos entraram:`, repasseError);
                                }
                            }
                        }
                        break;
                    case "verifyAttendance":
                        {
                            // ...existing code...
                        }
                        break;
                    default:
                        console.warn(`⚠️ [ConsultationWorker] Job desconhecido: ${job.name}`);
                }
                const duration = Date.now() - jobStartTime;
                console.log(`[ConsultationWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`);
            } catch (error) {
                const duration = Date.now() - jobStartTime;
                console.error(`❌ [ConsultationWorker] Erro ao processar job ${job.name} após ${duration}ms:`, error);
            }
        },
        { connection, concurrency }
    );
    worker.on("active", (job) => {
        console.log(`[ConsultationWorker] Job ATIVO: ${job.id} (${job.name})`, job.data);
    });
    worker.on("completed", (job) => {
        console.log(`✅ [ConsultationWorker] Job CONCLUÍDO: ${job.id} (${job.name})`);
    });
    worker.on("failed", (job, error) => {
        console.error(`❌ [ConsultationWorker] Job FALHOU: ${job?.id} (${job?.name})`, error);
    });
    events = new QueueEvents(consultationQueue.name, { connection });
    attachQueueEventsLogging(consultationQueue.name, events);

    events.on("completed", ({ jobId }: { jobId: string }) => {
        console.log(`✅ [ConsultationWorker] Job ${jobId} concluído`);
    });
    events.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        console.error(`❌ [ConsultationWorker] Job ${jobId} falhou: ${failedReason}`);
    });
    events.on("waiting", ({ jobId }: { jobId: string }) => {
        console.log(`[ConsultationWorker] Job WAITING: ${jobId}`);
    });
    events.on("delayed", ({ jobId, delay }: { jobId: string; delay: number }) => {
        console.log(`[ConsultationWorker] Job DELAYED: ${jobId}, delay: ${delay}ms`);
    });

    console.log("🚀 [ConsultationWorker] Worker iniciado");
}
