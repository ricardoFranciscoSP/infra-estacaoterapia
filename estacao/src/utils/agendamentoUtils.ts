// utils/agendamentoUtils.ts
export interface AgendamentoParams {
    psicologoId: string;
    agendaId: string;
    nome: string;
    data: string;
    horario: string;
    contexto?: string;
    origem?: string;
    timestamp?: number;
}