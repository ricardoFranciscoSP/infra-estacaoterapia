// Tipos para agenda e horários
export interface AgendaAgendamento {
    Id: string;
    Data: string;
    Horarios: HorarioAgendamento[];
    Status: string;
}

export interface HorarioAgendamento {
    Id: string;
    Horario: string;
    Status: string;
}

export interface ConsultaAgendamento {
    Id: string;
    Data: string;
    Profissional: string;
    Status: string;
}
