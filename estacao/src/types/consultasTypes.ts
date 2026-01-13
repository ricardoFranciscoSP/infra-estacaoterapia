// Tipo para consulta do dia conforme resposta da API
export interface ConsultaDia {
    success: boolean;
    consulta: ConsultaApi;
}
export interface ConsultaAtual {
    success: boolean;
    consultaAtual: {
        Id: string;
        Date: string;
        Time: string;
        Status: string;
    };
    futuras: ConsultaApi[];
}

export interface Reserva {
    id: string;
    Id?: string;
    date: string;
    time: string;
    status: string;
    psicologoId: string;
    pacienteId: string;
    AgendaId: string;
    psicologo?: {
        id: string;
        nome: string;
        email?: string;
        images?: { url: string }[];
    };
    paciente?: {
        id: string;
        nome: string;
        email?: string;
    };
    agenda?: {
        data: string;
        horario: string;
        diaDaSemana: string;
        status: string;
    };
    reserva?: {
        videoCallLink: string;
        Status: string;
        AgoraTokenPatient: string;
        AgoraTokenPsychologist: string;
    };
    consulta: {
        Id: string;
        Status: string;
        Data: string;
        Horario: string;
    };
    ReservaSessao?: {
        AgoraChannel?: string | null;
        Status: string;
    };
}

export interface ConsultaApi {
    ConsultaAtual?: ConsultaAtual;
    Id: string;
    Date: string;
    Time: string;
    Status: string;
    GoogleEventId?: string | null;
    PacienteId: string;
    PsicologoId: string;
    AgendaId: string;
    CreatedAt: string;
    UpdatedAt: string;
    Psicologo?: {
        Id: string;
        Nome: string;
        Email?: string;
        Images?: { Url: string }[];
    };
    Paciente?: {
        Nome: string;
        Email?: string;
        Images?: { Url: string }[];
    };
    Agenda?: {
        Data: string;
        Horario: string;
        DiaDaSemana: string;
        Status: string;
    };
    ReservaSessao?: {
        VideoCallLink?: string | null;
        Status: string;
    };
}


export interface HistoricoConsultas {
    completed: ConsultaApi[];
    reserved: ConsultaApi[];
    consultaAtual: ConsultaAtual;
}

export interface Futuras {
    success: boolean;
    nextReservation: ConsultaApi;
    idProximaConsulta: string;
    futuras: ConsultaApi[];
    consultaAtual: ConsultaAtual;
}

// Interface para a resposta da API de consultas agendadas
export interface ConsultasAgendadasResponse {
    success: boolean;
    nextReservation?: ConsultaApi | null; // Próxima consulta (prioridade)
    consultaAtualEmAndamento?: ConsultaApi | null; // Consulta em andamento (se houver)
    consultaAtual: ConsultaApi | null;
    futuras: ConsultaApi[];
    total: number;
}

export interface User {
    id: string;
    // ...adicione outros campos relevantes do usuário conforme necessário...
}

export interface Agenda {
    id: string;
    // ...adicione outros campos relevantes da agenda conforme necessário...
}

export interface Cancelamento {
    id: string;
    // ...adicione outros campos relevantes do cancelamento conforme necessário...
}


export interface Token {
    appId: string;
    token: string;
    uid: string;
    channel: string;
}

export interface ConsultasStore {
    consultas: Reserva[];
    consulta: Reserva | null;
    consultaFutura: Futuras[] | Futuras | null;
    consultaAgendada: Futuras[] | Futuras | null;
    consultaConcluida: HistoricoConsultas | HistoricoConsultas[] | null;
    consultaDia: ConsultaDia | null;
    token: Token | null;
}

export interface ConsultasStoreSetters {
    setConsultaAgendada: (consulta: Futuras[] | Futuras | null) => void;
    setConsultaFutura: (consulta: Futuras[] | Futuras | null) => void;
    setConsultaConcluida: (consulta: HistoricoConsultas[] | HistoricoConsultas | null) => void;
    setConsultas: (consultas: Reserva[]) => void;
    setConsulta: (consulta: Reserva | null) => void;
    setConsultaDia: (consulta: ConsultaDia | null) => void;
    setToken: (token: Token | null) => void;
}
