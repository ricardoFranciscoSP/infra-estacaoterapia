/**
 * Worker para processar delayed jobs (zero polling)
 * Processa jobs agendados uma única vez quando entidades são criadas
 */

import { Worker } from "bullmq";
import { getDelayedJobsQueue } from "../queues/delayedJobsQueue";
import { waitForIORedisReady } from "../config/redis.config";
import prisma from "../prisma/client";
import { $Enums } from "../generated/prisma";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { ConsultaStatusService } from "../services/consultaStatus.service";
import { ConsultaRoomService } from "../services/consultaRoom.service";
import { nowBrasiliaDate, nowBrasilia } from "../utils/timezone.util";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { BRASILIA_TIMEZONE } from "../utils/timezone.util";
import { handleReservedStatusRefresh } from "../jobs/jobAtualizarStatusReservado";
import { handleInatividadeFailsafe } from "../jobs/jobInatividadeConsulta";
import { handleVerificarInatividadeScheduledAt } from "../jobs/jobVerificarInatividadeScheduledAt";
import { handleNotificarTempoRestante } from "../jobs/jobNotificarTempoRestante";

dayjs.extend(utc);
dayjs.extend(timezone);

const wsNotify = new WebSocketNotificationService();

let worker: Worker | null = null;
let started = false;

/**
 * Inicializa o worker de delayed jobs
 */
export async function startDelayedJobsWorker(): Promise<void> {
    if (started) {
        console.log("⚠️ [DelayedJobsWorker] Worker já está rodando");
        return;
    }

    const connection = await waitForIORedisReady(60000).catch((err) => {
        console.error("[DelayedJobsWorker] Redis indisponível ou não respondeu ao ping:", err);
        return null;
    });
    if (!connection) {
        console.log(
            "[DelayedJobsWorker] Worker não inicializado: Redis indisponível."
        );
        return;
    }

    const queue = await getDelayedJobsQueue();
    if (!queue) {
        console.log(
            "[DelayedJobsWorker] Worker não inicializado: delayedJobsQueue não disponível."
        );
        return;
    }

    started = true;
    const concurrency = Number(
        process.env.DELAYED_JOBS_WORKER_CONCURRENCY ?? "5"
    );

    worker = new Worker(
        queue.name,
        async (job) => {
            const jobStartTime = Date.now();
            console.log(
                `[DelayedJobsWorker] INICIANDO job: ${job.id} (${job.name})`,
                job.data
            );

            try {
                switch (job.name) {
                    case "expire-purchase":
                        await handleExpirePurchase(job.data.purchaseId);
                        break;

                    case "cancel-consultation-no-show":
                        await handleCancelConsultationNoShow(
                            job.data.consultationId
                        );
                        break;

                    case "finalize-consultation":
                        await handleFinalizeConsultation(
                            job.data.consultationId
                        );
                        break;

                    case "expire-consultation-after-plan-cancellation":
                        await handleExpireConsultationAfterPlanCancellation(
                            job.data.consultationId,
                            job.data.expirationDate
                        );
                        break;

                    case "expire-plan-subscription":
                        await handleExpirePlanSubscription(
                            job.data.assinaturaPlanoId
                        );
                        break;
                    case "refresh-reservado-status":
                        await handleReservedStatusRefresh();
                        break;
                    case "consulta-inatividade-failsafe":
                        await handleInatividadeFailsafe();
                        break;

                    case "verificar-inatividade-scheduled-at":
                        await handleVerificarInatividadeScheduledAt();
                        break;

                    case "notificar-tempo-restante":
                        await handleNotificarTempoRestante();
                        break;

                    default:
                        console.warn(
                            `⚠️ [DelayedJobsWorker] Job desconhecido: ${job.name}`
                        );
                }

                const duration = Date.now() - jobStartTime;
                console.log(
                    `✅ [DelayedJobsWorker] Job ${job.id} (${job.name}) concluído em ${duration}ms`
                );
            } catch (error) {
                const duration = Date.now() - jobStartTime;
                console.error(
                    `❌ [DelayedJobsWorker] Erro ao processar job ${job.name} após ${duration}ms:`,
                    error
                );
                throw error; // Re-throw para que BullMQ tente novamente
            }
        },
        { connection, concurrency }
    );

    worker.on("active", (job) => {
        console.log(
            `[DelayedJobsWorker] Job ATIVO: ${job.id} (${job.name})`,
            job.data
        );
    });

    worker.on("completed", (job) => {
        console.log(
            `✅ [DelayedJobsWorker] Job CONCLUÍDO: ${job.id} (${job.name})`
        );
    });

    worker.on("failed", (job, error) => {
        console.error(
            `❌ [DelayedJobsWorker] Job FALHOU: ${job?.id} (${job?.name})`,
            error
        );
    });

    console.log("🚀 [DelayedJobsWorker] Worker iniciado");
}

/**
 * Expira um registro financeiro (compra) após 30 minutos
 * Usa o modelo Financeiro com status AguardandoPagamento
 */
async function handleExpirePurchase(purchaseId: string): Promise<void> {
    console.log(`[DelayedJobsWorker] Expirando compra/financeiro: ${purchaseId}`);

    // Verifica se o financeiro ainda está aguardando pagamento (idempotência)
    const financeiro = await prisma.financeiro.findUnique({
        where: { Id: purchaseId },
        select: { Status: true },
    });

    if (!financeiro) {
        console.log(
            `⚠️ [DelayedJobsWorker] Financeiro ${purchaseId} não encontrado - ignorando`
        );
        return;
    }

    // Verifica se ainda está aguardando pagamento
    if (financeiro.Status !== "AguardandoPagamento") {
        console.log(
            `ℹ️ [DelayedJobsWorker] Financeiro ${purchaseId} já foi processado (Status: ${financeiro.Status}) - ignorando`
        );
        return;
    }

    // Atualiza status para cancelado (expirado)
    await prisma.financeiro.update({
        where: { Id: purchaseId },
        data: { Status: "Cancelado" },
    });

    console.log(`✅ [DelayedJobsWorker] Financeiro ${purchaseId} expirado (status atualizado para Cancelado)`);
}

/**
 * Cancela consulta por no-show após 10 minutos do ScheduledAt
 */
async function handleCancelConsultationNoShow(
    consultationId: string
): Promise<void> {
    console.log(
        `[DelayedJobsWorker] Verificando no-show para consulta: ${consultationId}`
    );

    const reservaSessao = await prisma.reservaSessao.findUnique({
        where: { ConsultaId: consultationId },
        select: {
            ScheduledAt: true,
            PatientJoinedAt: true,
            PsychologistJoinedAt: true,
            Consulta: {
                select: {
                    Status: true,
                    PacienteId: true,
                    PsicologoId: true,
                    AgendaId: true,
                },
            },
        },
    });

    if (!reservaSessao || !reservaSessao.Consulta) {
        console.error(
            `[DelayedJobsWorker] ReservaSessao não encontrada para consulta ${consultationId}`
        );
        return;
    }

    // Verifica idempotência
    const consultaAtual = await prisma.consulta.findUnique({
        where: { Id: consultationId },
        select: { Status: true },
    });

    const jaProcessada =
        consultaAtual?.Status === "PacienteNaoCompareceu" ||
        consultaAtual?.Status === "PsicologoNaoCompareceu" ||
        consultaAtual?.Status?.toString().startsWith("Cancelada");

    if (jaProcessada) {
        console.log(
            `⚠️ [DelayedJobsWorker] Consulta ${consultationId} já foi processada - ignorando`
        );
        return;
    }

    // Verifica se ambos entraram
    const patientJoined =
        reservaSessao.PatientJoinedAt !== null &&
        reservaSessao.PatientJoinedAt !== undefined;
    const psychologistJoined =
        reservaSessao.PsychologistJoinedAt !== null &&
        reservaSessao.PsychologistJoinedAt !== undefined;

    if (patientJoined && psychologistJoined) {
        console.log(
            `✅ [DelayedJobsWorker] Ambos participantes entraram na consulta ${consultationId} - não cancelando`
        );
        return;
    }

    // Determina quem não entrou
    let missingRole: "Patient" | "Psychologist" | "Both";
    let missingRoleForRoom: "patient" | "psychologist" | "both";
    let motivo: string;

    if (!patientJoined && !psychologistJoined) {
        missingRole = "Both";
        missingRoleForRoom = "both";
        motivo =
            "Paciente e psicólogo não compareceram após 10 minutos do início da consulta";
    } else if (!patientJoined) {
        missingRole = "Patient";
        missingRoleForRoom = "patient";
        motivo = "Paciente não compareceu após 10 minutos do início da consulta";
    } else {
        missingRole = "Psychologist";
        missingRoleForRoom = "psychologist";
        motivo =
            "Psicólogo não compareceu após 10 minutos do início da consulta";
    }

    console.log(
        `🛑 [DelayedJobsWorker] Cancelando consulta ${consultationId} por no-show: ${motivo}`
    );

    // Fecha a sala
    const roomService = new ConsultaRoomService();
    await roomService.closeRoom(consultationId, "inactivity", missingRoleForRoom);

    // Processa inatividade
    const statusService = new ConsultaStatusService();
    await statusService.processarInatividade(consultationId, missingRole);

    // Processa repasse se necessário
    if (missingRole === "Patient") {
        try {
            const { processRepasse } = await import("../jobs/consultationJobs");
            await processRepasse(consultationId, null);
        } catch (repasseError) {
            console.error(
                `❌ [DelayedJobsWorker] Erro ao processar repasse:`,
                repasseError
            );
        }
    }

    // Cria registro de cancelamento
    const tipoCancelamento =
        missingRole === "Both"
            ? "Sistema"
            : missingRole === "Patient"
                ? "Paciente"
                : "Psicologo";

    const autorId =
        missingRole === "Patient"
            ? reservaSessao.Consulta.PsicologoId
            : missingRole === "Psychologist"
                ? reservaSessao.Consulta.PacienteId
                : null;

    await prisma.cancelamentoSessao.create({
        data: {
            Protocolo: `AUTO-${Date.now()}`,
            Motivo: motivo,
            Data: nowBrasiliaDate(),
            Horario: nowBrasilia().format("HH:mm"),
            SessaoId: consultationId,
            PacienteId: reservaSessao.Consulta.PacienteId || "",
            PsicologoId: reservaSessao.Consulta.PsicologoId || "",
            AutorId: autorId || "",
            Status: "Deferido",
            Tipo: tipoCancelamento as any,
        },
    });

    // Notifica cancelamento
    await wsNotify.emitConsultation(`consultation:${consultationId}`, {
        status: "cancelled",
        reason: motivo,
        missingRole: missingRole,
        autoCancelled: true,
    });

    console.log(
        `✅ [DelayedJobsWorker] Consulta ${consultationId} cancelada por no-show`
    );
}

/**
 * Finaliza consulta após 60 minutos do ScheduledAt
 */
async function handleFinalizeConsultation(
    consultationId: string
): Promise<void> {
    console.log(
        `[DelayedJobsWorker] Finalizando consulta após 60 minutos: ${consultationId}`
    );

    const reservaSessao = await prisma.reservaSessao.findUnique({
        where: { ConsultaId: consultationId },
        include: {
            Consulta: {
                select: {
                    Status: true,
                    PacienteId: true,
                    PsicologoId: true,
                    AgendaId: true,
                },
            },
        },
    });

    if (!reservaSessao) {
        console.error(
            `[DelayedJobsWorker] ReservaSessao não encontrada para consulta ${consultationId}`
        );
        return;
    }

    // Verifica idempotência
    if (reservaSessao.Consulta.Status === "Realizada") {
        console.log(
            `ℹ️ [DelayedJobsWorker] Consulta ${consultationId} já está finalizada - ignorando`
        );
        return;
    }

    // Atualiza apenas Consulta (trigger sincroniza ReservaSessao e Agenda)
    await prisma.consulta.update({
        where: { Id: consultationId },
        data: { Status: $Enums.ConsultaStatus.Realizada },
    });
    // Notifica encerramento
    await wsNotify.emitConsultation(`consultation:${consultationId}`, {
        status: "Concluido",
        reason: "Sala encerrada automaticamente após 60 minutos",
        autoEnded: true,
    });

    // Notifica atualização da próxima consulta
    if (reservaSessao.Consulta) {
        try {
            const { ProximaConsultaService } = await import(
                "../services/proximaConsulta.service"
            );
            const proximaConsultaService = new ProximaConsultaService();
            await proximaConsultaService.notificarAmbosUsuarios(
                reservaSessao.Consulta.PsicologoId || "",
                reservaSessao.Consulta.PacienteId,
                "atualizacao"
            );
        } catch (err) {
            console.error(
                "[DelayedJobsWorker] Erro ao notificar atualização:",
                err
            );
        }
    }

    console.log(
        `✅ [DelayedJobsWorker] Consulta ${consultationId} finalizada após 60 minutos`
    );
}

/**
 * Expira consulta após cancelamento de plano (30 dias)
 */
async function handleExpireConsultationAfterPlanCancellation(
    consultationId: string,
    expirationDate: string
): Promise<void> {
    console.log(
        `[DelayedJobsWorker] Expirando consulta após cancelamento de plano: ${consultationId}`
    );

    const consulta = await prisma.consulta.findUnique({
        where: { Id: consultationId },
        include: {
            ReservaSessao: {
                select: {
                    Id: true,
                    Status: true,
                },
            },
            Agenda: {
                select: {
                    Id: true,
                    Status: true,
                    PacienteId: true,
                },
            },
            Paciente: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
            Psicologo: {
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                },
            },
        },
    });

    if (!consulta) {
        console.log(
            `⚠️ [DelayedJobsWorker] Consulta ${consultationId} não encontrada - ignorando`
        );
        return;
    }

    // Verifica se já passou a data de expiração
    const dataExpiracao = dayjs.tz(expirationDate, BRASILIA_TIMEZONE);
    const agora = nowBrasilia();

    if (agora.isBefore(dataExpiracao)) {
        console.log(
            `⏳ [DelayedJobsWorker] Ainda não chegou a data de expiração para consulta ${consultationId} - ignorando`
        );
        return;
    }

    // Verifica se já foi expirada (idempotência)
    if (
        consulta.Status === "CanceladaForcaMaior" ||
        consulta.Status?.toString().startsWith("Cancelada")
    ) {
        console.log(
            `ℹ️ [DelayedJobsWorker] Consulta ${consultationId} já foi expirada - ignorando`
        );
        return;
    }

    // Expira a consulta (trigger sincroniza ReservaSessao e Agenda)
    await prisma.consulta.update({
        where: { Id: consultationId },
        data: {
            Status: $Enums.ConsultaStatus.CanceladaForcaMaior,
            TelaGatilho: null,
            OrigemStatus: "Sistema - Sessão Expirada (Plano Cancelado)",
            Faturada: false,
            AcaoSaldo: "Devolve sessão",
        },
    });
    // Envia notificações
    if (consulta.Paciente) {
        await wsNotify.emitToUser(consulta.Paciente.Id, "consultation-expired", {
            consultationId,
            message: "Sua consulta foi expirada após cancelamento do plano",
        });
    }

    console.log(
        `✅ [DelayedJobsWorker] Consulta ${consultationId} expirada após cancelamento de plano`
    );
}

/**
 * Expira assinatura de plano quando DataFim é atingida
 */
async function handleExpirePlanSubscription(
    assinaturaPlanoId: string
): Promise<void> {
    console.log(
        `[DelayedJobsWorker] Expirando assinatura de plano: ${assinaturaPlanoId}`
    );

    const assinatura = await prisma.assinaturaPlano.findUnique({
        where: { Id: assinaturaPlanoId },
        select: { Status: true, DataFim: true },
    });

    if (!assinatura) {
        console.log(
            `⚠️ [DelayedJobsWorker] AssinaturaPlano ${assinaturaPlanoId} não encontrada - ignorando`
        );
        return;
    }

    // Verifica idempotência
    if (assinatura.Status !== "Ativo") {
        console.log(
            `ℹ️ [DelayedJobsWorker] AssinaturaPlano ${assinaturaPlanoId} já foi processada (Status: ${assinatura.Status}) - ignorando`
        );
        return;
    }

    // Verifica se realmente passou a data de fim
    const dataFim = dayjs.tz(assinatura.DataFim, BRASILIA_TIMEZONE);
    const agora = nowBrasilia();

    if (agora.isBefore(dataFim)) {
        console.log(
            `⏳ [DelayedJobsWorker] Ainda não chegou a data de fim para assinatura ${assinaturaPlanoId} - ignorando`
        );
        return;
    }

    // Atualiza status para expirado
    await prisma.assinaturaPlano.update({
        where: { Id: assinaturaPlanoId },
        data: { Status: "Expirado" },
    });

    console.log(
        `✅ [DelayedJobsWorker] AssinaturaPlano ${assinaturaPlanoId} expirada`
    );
}

/**
 * Para o worker
 */
export async function stopDelayedJobsWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        started = false;
        console.log("🛑 [DelayedJobsWorker] Worker parado");
    }
}

