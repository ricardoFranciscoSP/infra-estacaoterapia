import { Response } from "express";
import { Consulta, User } from "../generated/prisma";

export interface ConsultaEmAndamentoResponse {
    success: boolean;
    data: (Consulta & {
        Paciente?: User | null;
        Psicologo?: User | null;
    }) | null;
    message?: string;
}

export interface NewReservaBody {
    agendaId: string;
    pacienteId?: string;
    psicologoId?: string;
    data?: string;
    horario?: string;
    [key: string]: unknown;
}

export interface IConsultasPsicologoService {
    findReservas(userId: string, res: Response): Promise<Response>;
    getReservasCompletasEAgendadasPorUsuario(userId: string, res: Response): Promise<Response>;
    getReservasPorId(userId: string, reservationId: string, res: Response): Promise<Response>;
    cancelarReserva(userId: string, reservationId: string, res: Response): Promise<Response>;
    releaseSchedule(userId: string, agendaId: string, res: Response): Promise<Response>;
    newReserva(userId: string, body: NewReservaBody, res: Response): Promise<Response>;
    consultaEmAndamento(psicologoId: string, res: Response): Promise<Response>;
}
