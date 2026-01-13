import { AgendaStatus } from "./permissions.types";

export type ReservaSessaoData = {
    Id: string;
    Status: AgendaStatus;
    AgoraChannel?: string;
    ReservationId?: string;
    AgoraToken?: string;
    Uid?: number;
    ConsultaId: string;
    PatientId?: string;
    PsychologistId?: string;
    PatientJoinedAt?: Date;
    PsychologistJoinedAt?: Date;
    AgoraTokenPatient?: string;
    AgoraTokenPsychologist?: string;
    AgendaId?: string;
    UidPsychologist?: number;
    ConsultaDate?: string | Date; // Aceita string (ISO) ou Date para compatibilidade
    ConsultaTime?: string;
    ScheduledAt?: string;
}

export type ReservaSessaoResponse = {
    success: boolean;
    message?: string;
    data?: ReservaSessaoData;
}
