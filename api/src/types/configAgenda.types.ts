export interface ConfigAgendaInput {
    Id?: string;
    UserId: string;
    DiaDaSemana: string;
    HorarioInicio: string;
    HorarioFim: string;
    Status?: string;
    Breaks?: any; // Json
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface Agenda {
    Id: string;
    Data: Date;
    Horario: string;
    DiaDaSemana: string;
    Status: string;
    PsicologoId: string;
    PacienteId?: string;
}