export interface Break {
    Inicio: string;
    Fim: string;
}

export interface ConfigAgenda {
    Id: string;
    UserId: string;
    DiaDaSemana: string;
    HorarioInicio: string;
    HorarioFim: string;
    Status: string; // Ex: "Ativo"
    Breaks: Break[];
    Horario?: string;
    Data?: string;
}

export interface ConfigAgendaStore {
    configAgenda: ConfigAgenda[];
}

export interface ConfigAgendaStoreSetters {
    setConfigAgenda: (consulta: ConfigAgenda[] | ConfigAgenda | null) => void;
}


export interface calculoPagamento {
    totalPagamento: number;
}
