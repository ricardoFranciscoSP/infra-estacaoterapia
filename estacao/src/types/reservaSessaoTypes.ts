export type ReservaSessao = {
    Id: string;
    Status: string;
    Channel?: string;
    AgoraChannel?: string | null;
    ReservationId?: string;
    Token?: string;
    TokenPaciente?: string;
    TokenPsicologo?: string;
    AgoraToken?: string;
    AgoraTokenPatient?: string;
    AgoraTokenPsychologist?: string;
    RtmToken?: string;
    Uid?: number;
    UidPsychologist?: number;
    Account?: string;
    ConsultaId?: string;
    PsychologistId?: string;
    ConsultaDate?: string | Date;
    ConsultaTime?: string;
    ScheduledAt?: string;
}

export type ReservaSessaoResponse = {
    success: boolean;
    message?: string;
    data?: ReservaSessao;
}


export interface ReservaSessaoStore {
    reservaSessao: ReservaSessao[];
}

export interface ConfigAgendaStoreSetters {
    setReservaSessao: (reservaSessao: ReservaSessao[] | ReservaSessao | null) => void;
    reagendarReservaSessao?: (idAntiga: string, idNova: string) => Promise<ReservaSessaoResponse>;
}

