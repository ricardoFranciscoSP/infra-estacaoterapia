// types/auditoria.ts
export type AuditoriaStatus = "Sucesso" | "Falha" | "Alerta" | "sucesso" | "falha" | "alerta";

export type ActionType = "Create" | "Read" | "Update" | "Delete" | "Approve" | "Reject" | "Manage" | "Login" | "Logout";

export type Module = 
    | "Authentication"
    | "Users"
    | "Payments"
    | "Consultations"
    | "Schedules"
    | "Financial"
    | "Reports"
    | "Notifications"
    | "Permissions"
    | "Auditoria"
    | "Psychologists"
    | "Patients"
    | "Communication";

export interface AuditUser {
    Id: string;
    Nome: string;
    Email: string;
    Role: string;
}

export interface AuditoriaItem {
    Id: string;
    UserId: string;
    ActionType: ActionType;
    Module: Module;
    Description: string;
    IpAddress: string | null;
    Status: string | null;
    Metadata: string | null;
    Timestamp: Date | string;
    User: AuditUser | null;
}

export interface PaginatedAuditResult {
    audits: AuditoriaItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface FiltrosAuditoria {
    page?: number;
    limit?: number;
    actionType?: ActionType;
    module?: Module;
    status?: string;
    userId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}
