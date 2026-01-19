import { CancelamentoSessao, User } from "../generated/prisma";

export type CancelamentoStatus = "Em Analise" | "Aprovado" | "Rejeitado" | "EmAnalise" | "Deferido" | "Indeferido" | "Cancelado";

export type CancelamentoTipo = "Paciente" | "Psicologo" | "Admin" | "Management" | "Sistema";

export interface CancelamentoData {
    protocolo: string;
    motivo: string;
    data: string;
    horario: string;
    linkDock?: string;
    idconsulta: string;
    idPaciente: string;
    idPsicologo: string;
    status?: CancelamentoStatus;
    tipo?: CancelamentoTipo;
}

export interface CancelamentoResponse extends CancelamentoSessao {
    Autor?: User | null;
    Paciente?: User | null;
    Psicologo?: User | null;
}

export interface CancelamentoWithUsers extends CancelamentoSessao {
    Autor?: User | null;
    Paciente?: User | null;
    Psicologo?: User | null;
    Documents?: Array<{
        Id: string;
        Url: string;
        Type: string;
        Description?: string | null;
        CreatedAt: Date;
        CancelamentoSessaoId?: string | null;
    }>;
}
