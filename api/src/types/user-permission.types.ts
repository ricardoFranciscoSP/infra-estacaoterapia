import { Module, ActionType } from './permissions.types';

export interface UserPermissionData {
    userId: string;
    module: Module;
    action: ActionType;
    allowed: boolean;
}

export interface BulkUserPermissionData {
    userId: string;
    permissions: Array<{
        module: Module;
        action: ActionType;
        allowed: boolean;
    }>;
}

export interface RolePermissionData {
    role: string;
    module: Module;
    action: ActionType;
}

export interface BulkRolePermissionData {
    role: string;
    permissions: Array<{
        module: Module;
        action: ActionType;
    }>;
}

