import { PermissionData } from "../types/permission.types";

export interface IPermissionRepository {
    listPermissions(): Promise<any[]>;
    createPermission(data: PermissionData): Promise<any>;
    updatePermission(id: string, data: PermissionData): Promise<any>;
    deletePermission(id: string): Promise<void>;
}
