import { Consulta } from "../types/permissions.types";
import { Prisma } from "../generated/prisma";
import { WebSocketNotificationService } from "../services/websocketNotification.service";
import { WebSocketNotificationBatchService } from "../services/websocketNotificationBatch.service";

// Tipos para retornos
type ConsultaWithRelations = Prisma.ConsultaGetPayload<{
    include: {
        Psicologo: {
            select: {
                Id: true;
                Nome: true;
                Email: true;
                Images: { select: { Url: true } };
            };
        };
        Paciente: {
            select: {
                Nome: true;
                Email: true;
            };
        };
        Agenda: {
            select: {
                Id: true;
                Data: true;
                Horario: true;
                DiaDaSemana: true;
                Status: true;
                CreatedAt: true;
                UpdatedAt: true;
                PsicologoId: true;
                PacienteId: true;
            };
        };
        ReservaSessao: {
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
            } | null;
        };
    };
}>;

type AgendaType = Prisma.AgendaGetPayload<{}>;

type AgendaWithSelect = {
    Id: string;
    Data: Date;
    Status: string;
    PsicologoId: string | null;
    Horario: string;
};

export interface IReservationService {
    websocketNotificationService: WebSocketNotificationService | WebSocketNotificationBatchService;
    consultarAgenda(psicologoId: string): Promise<AgendaType[]>;
    checkScheduleAvailability(scheduleId: string, userId: string): Promise<{ available: boolean; message?: string; agenda?: AgendaWithSelect }>;
    createReservation(
        scheduleId: string,
        userId: string | { userId: string; manterSaldo?: boolean; reservaAntigaId?: string },
        agenda?: AgendaType
    ): Promise<{ reservation: ConsultaWithRelations; updatedAgenda: AgendaType }>;
    updateAvailableConsultations(userId: string): Promise<boolean>;
    cancelReservation(reservationId: string, userId: string, motivo?: string, file?: Express.Multer.File): Promise<{ protocolo: string; documentoUrl?: string }>;
    fetchReservationById(id: string): Promise<ConsultaWithRelations | null>;
    updateReservationStatus(id: string, status: string): Promise<void>;
    listReservations(userId: string): Promise<ConsultaWithRelations[]>;
    listCompletedAndFutureReservations(userId: string): Promise<{ completed: ConsultaWithRelations[]; reserved: ConsultaWithRelations[] }>;
    updateCompletedReservations(): Promise<void>;
    cancelReservationAutomatic(reservationId: string, pacienteId: string, psicologoId: string): Promise<void>;
    reservarHorario(scheduleId: string, userId: string | { userId: string; manterSaldo?: boolean; reservaAntigaId?: string }): Promise<{ reservation: ConsultaWithRelations | null; updatedAgenda: AgendaType | null; message?: string }>;
    reservarHorarioComSaldo(scheduleId: string, userId: string, manterSaldo?: boolean, reservaAntigaId?: string): Promise<{ reservation: ConsultaWithRelations; updatedAgenda: AgendaType }>;
    reagendarStatus(reservationId: string): Promise<void>;
    validarValidadeReagendamento(userId: string, agendaId: string, consultaIdAntiga?: string): Promise<{ valido: boolean; prorrogarExpiracao?: boolean }>;
}