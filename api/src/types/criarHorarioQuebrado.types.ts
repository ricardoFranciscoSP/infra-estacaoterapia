export interface CriarHorarioQuebradoRequest {
    psicologoId: string;
    data: string; // formato: YYYY-MM-DD
    horario: string; // formato: HH:mm (ex: "16:30")
    status?: string; // Status da agenda (padrão: "Disponivel")
}

export interface CriarHorarioQuebradoResponse {
    id: string;
    data: Date;
    horario: string;
    diaDaSemana: string;
    status: string;
    psicologoId: string;
    pacienteId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
