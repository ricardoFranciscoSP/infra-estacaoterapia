import prisma from "../../prisma/client";
import { ConsultaStatusService } from "../consultaStatus.service";
import { ReviewRepository } from "../../repositories/review.repository";

export interface FinalizarConsultaResponse {
  success: boolean;
  requiresReview: boolean;
  psychologistId?: string;
  consultaFinalizada: Awaited<ReturnType<ConsultaStatusService['finalizarConsulta']>> | null;
}

export class FinalizarConsultaService {
  /**
   * Finaliza uma consulta pelo paciente e verifica se precisa de review
   * 
   * @param consultaId ID da consulta
   * @param patientId ID do paciente autenticado
   * @param forceFinalize Se true, força finalização mesmo se ambos não estiveram na sala
   * @returns Resposta com flag requiresReview e psychologistId se necessário
   */
  async finalizarConsultaComReview(
    consultaId: string,
    patientId: string,
    forceFinalize: boolean = false
  ): Promise<FinalizarConsultaResponse> {
    // 1. Buscar a ReservaSessao e Consulta relacionada
    const reservaSessao = await prisma.reservaSessao.findUnique({
      where: { ConsultaId: consultaId },
      include: {
        Consulta: {
          include: {
            ReservaSessao: true,
            Agenda: true,
            Psicologo: {
              select: {
                Id: true,
              },
            },
            Paciente: {
              select: {
                Id: true,
              },
            },
          },
        },
      },
    });

    if (!reservaSessao || !reservaSessao.Consulta) {
      throw new Error("Reserva de sessão não encontrada");
    }

    const consulta = reservaSessao.Consulta;

    // 2. Validar que a consulta pertence ao paciente autenticado
    if (consulta.PacienteId !== patientId) {
      throw new Error("Consulta não pertence ao paciente autenticado");
    }

    // 3. Validar que o status permite finalização (EmAndamento ou Andamento)
    const statusAtual = consulta.Status?.toString() || "";
    const statusReserva = reservaSessao.Status?.toString() || "";
    const podeFinalizar =
      statusAtual === "EmAndamento" ||
      statusAtual === "Andamento" ||
      statusReserva === "Andamento" ||
      forceFinalize;

    if (!podeFinalizar && !forceFinalize) {
      console.log(
        `⚠️ [FinalizarConsultaService] Consulta ${consultaId} não está em andamento (Status: ${statusAtual}, ReservaStatus: ${statusReserva})`
      );
      // Se já estiver finalizada, retorna sem erro
      if (statusAtual === "Realizada" || statusReserva === "Concluido") {
        // ✅ Verifica review mesmo para consultas já finalizadas
        // Usa o PsychologistId da ReservaSessao (fonte primária) em vez do PsicologoId da Consulta
        const reviewRepository = new ReviewRepository();
        // Prioriza PsychologistId da ReservaSessao, fallback para PsicologoId da Consulta
        const psychologistId = reservaSessao.PsychologistId || consulta.PsicologoId || undefined;
        const hasReview = psychologistId
          ? await reviewRepository.hasPatientReviewedPsychologist(
              patientId,
              psychologistId
            )
          : false;

        console.log(`🔍 [FinalizarConsultaService] Consulta já finalizada - verificando review:`, {
          patientId,
          psychologistId,
          hasReview,
          requiresReview: !hasReview && !!psychologistId
        });

        return {
          success: true,
          requiresReview: !hasReview && !!psychologistId,
          psychologistId: psychologistId || undefined,
          consultaFinalizada: consulta,
        };
      }
      throw new Error(
        "Consulta não está em andamento e não pode ser finalizada"
      );
    }

    // 4. Verificar se review já existe ANTES de finalizar
    // ✅ Usa o PsychologistId da ReservaSessao (fonte primária) em vez do PsicologoId da Consulta
    const reviewRepository = new ReviewRepository();
    // Prioriza PsychologistId da ReservaSessao, fallback para PsicologoId da Consulta
    const psychologistId = reservaSessao.PsychologistId || consulta.PsicologoId || undefined;
    let hasReview = false;

    if (psychologistId) {
      console.log(`🔍 [FinalizarConsultaService] Verificando review para paciente ${patientId} e psicólogo ${psychologistId} (da ReservaSessao)`);
      hasReview = await reviewRepository.hasPatientReviewedPsychologist(
        patientId,
        psychologistId
      );
      console.log(`🔍 [FinalizarConsultaService] Review existente: ${hasReview}`);
    } else {
      console.warn(`⚠️ [FinalizarConsultaService] PsychologistId não encontrado na ReservaSessao nem na Consulta para ${consultaId}`);
    }

    // 5. Finalizar a consulta usando ConsultaStatusService (garante transação e regras de negócio)
    const statusService = new ConsultaStatusService();
    let consultaFinalizada;

    try {
      consultaFinalizada = await statusService.finalizarConsulta(
        consultaId,
        forceFinalize
      );
    } catch (error) {
      console.error(
        `❌ [FinalizarConsultaService] Erro ao finalizar consulta ${consultaId}:`,
        error
      );
      throw error;
    }

    // 6. Retornar resposta com flag de review
    return {
      success: true,
      requiresReview: !hasReview && !!psychologistId,
      psychologistId: psychologistId || undefined,
      consultaFinalizada,
    };
  }
}

