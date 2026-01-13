// Tipos de status possíveis para reservas e agendas
export type ReservationStatus =
    | 'DISPONIVEL'
    | 'INDISPONIVEL'
    | 'BLOQUEADO'
    | 'RESERVADO'
    | 'CANCELADO'
    | 'ANDAMENTO'
    | 'CONCLUIDO';
export type AgendaStatus = ReservationStatus;

// Parâmetros para criação de reserva
export type NewReservaParams = {
    agendaId: string;
    pacienteId: string;
};

// Dados mínimos de usuário para e-mails e eventos
export type UserBasicData = {
    nome: string;
    email: string;
};

// Dados para criação de evento no Google Calendar
export type GoogleCalendarEventData = {
    pacienteNome: string;
    psicologoNome: string;
    emailPaciente: string;
    emailPsicologo: string;
    dataConsulta: string;
    horario: string;
};
