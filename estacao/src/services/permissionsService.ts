import { api } from '@/lib/axios';
import { AxiosResponse } from 'axios';

export type Module = 
    | "Users"
    | "Reports"
    | "Plans"
    | "Payments"
    | "Sessions"
    | "Profiles"
    | "Evaluations"
    | "Onboarding"
    | "Finance"
    | "Agenda"
    | "Notifications"
    | "Promotions"
    | "SystemSettings"
    | "Psychologists"
    | "Patients"
    | "Clients"
    | "Contracts"
    | "Reviews"
    | "Cancelamentos"
    | "WorkSchedule"
    | "RedesSociais"
    | "Faq"
    | "Configuracoes"
    | "Admin";

export type ActionType = "Read" | "Create" | "Update" | "Delete" | "Manage" | "Approve";

export type Role = "Admin" | "Patient" | "Psychologist" | "Management" | "Finance";

export interface Permission {
    Id: string;
    Role: Role;
    Module: Module;
    Action: ActionType;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface UserPermission {
    Id: string;
    UserId: string;
    Module: Module;
    Action: ActionType;
    Allowed: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    User?: {
        Id: string;
        Nome: string;
        Email: string;
        Role: Role;
    };
}

export interface PermissionData {
    role: Role;
    module: Module;
    action: ActionType;
}

export interface UserPermissionData {
    userId: string;
    module: Module;
    action: ActionType;
    allowed: boolean;
}

export interface BulkRolePermissionData {
    role: Role;
    permissions: Array<{
        module: Module;
        action: ActionType;
    }>;
}

export interface BulkUserPermissionData {
    userId: string;
    permissions: Array<{
        module: Module;
        action: ActionType;
        allowed: boolean;
    }>;
}

export interface UserPermissionsResponse {
    role: Role;
    rolePermissions: Permission[];
    userPermissions: UserPermission[];
}

// Mapeamento de módulos para labels em português
export const moduleLabels: Record<Module, string> = {
    Users: "Usuários",
    Reports: "Relatórios",
    Plans: "Planos",
    Payments: "Pagamentos",
    Sessions: "Sessões",
    Profiles: "Perfis",
    Evaluations: "Avaliações",
    Onboarding: "Onboarding",
    Finance: "Financeiro",
    Agenda: "Agenda",
    Notifications: "Notificações",
    Promotions: "Promoções",
    SystemSettings: "Configurações do Sistema",
    Psychologists: "Psicólogos",
    Patients: "Pacientes",
    Clients: "Clientes",
    Contracts: "Contratos",
    Reviews: "Avaliações",
    Cancelamentos: "Cancelamentos",
    WorkSchedule: "Horários de Trabalho",
    RedesSociais: "Redes Sociais",
    Faq: "FAQ",
    Configuracoes: "Configurações",
    Admin: "Administração",
};

// Mapeamento de ações para labels em português
export const actionLabels: Record<ActionType, string> = {
    Read: "Visualizar",
    Create: "Criar",
    Update: "Editar",
    Delete: "Excluir",
    Manage: "Gerenciar",
    Approve: "Aprovar",
};

// Módulos principais para a interface de permissões (baseado na imagem)
export const mainModules: Module[] = [
    "Psychologists",
    "Patients",
    "Finance",
    "Reports",
    "Reviews",
    "Configuracoes",
] as Module[];

export const permissionsService = {
    // Role Permissions
    listRolePermissions: (): Promise<AxiosResponse<Permission[]>> => 
        api.get('/permissions'),

    getPermissionsByRole: (role: Role): Promise<AxiosResponse<{ success: boolean; data: Permission[] }>> =>
        api.get(`/permissions/role/${role}`),

    createRolePermission: (data: PermissionData): Promise<AxiosResponse<{ success: boolean; data: Permission }>> =>
        api.post('/permissions', data),

    bulkCreateRolePermissions: (data: BulkRolePermissionData): Promise<AxiosResponse<{ success: boolean; data: Permission[] }>> =>
        api.post('/permissions/role/bulk', data),

    updateRolePermission: (id: string, data: PermissionData): Promise<AxiosResponse<{ success: boolean; data: Permission }>> =>
        api.put(`/permissions/${id}`, data),

    deleteRolePermission: (id: string): Promise<AxiosResponse<{ success: boolean }>> =>
        api.delete(`/permissions/${id}`),

    // User Permissions
    getUserPermissions: (userId: string): Promise<AxiosResponse<{ success: boolean; data: UserPermission[] }>> =>
        api.get(`/permissions/user/${userId}`),

    getPermissionsForUser: (userId: string): Promise<AxiosResponse<{ success: boolean; data: UserPermissionsResponse }>> =>
        api.get(`/permissions/user/${userId}/all`),

    createUserPermission: (data: UserPermissionData): Promise<AxiosResponse<{ success: boolean; data: UserPermission }>> =>
        api.post('/permissions/user', data),

    bulkCreateUserPermissions: (data: BulkUserPermissionData): Promise<AxiosResponse<{ success: boolean; data: UserPermission[] }>> =>
        api.post('/permissions/user/bulk', data),

    deleteUserPermission: (userId: string, module: Module, action: ActionType): Promise<AxiosResponse<{ success: boolean }>> =>
        api.delete(`/permissions/user/${userId}/${module}/${action}`),
};

