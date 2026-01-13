import prisma from "../prisma/client";
import { IPermissionRepository } from "../interfaces/permission.repository.interface";
import { PermissionData } from "../types/permission.types";
import { ActionType, Module, Role } from "../types/permissions.types";

export class PermissionRepository implements IPermissionRepository {
    async listPermissions() {
        return prisma.permission.findMany();
    }

    async createPermission(data: PermissionData) {
        const permissionData = {
            Role: data.role as Role,
            Module: data.module as Module,
            Action: data.action as ActionType
        } as any;
        return prisma.permission.create({ data: permissionData });
    }

    async updatePermission(id: string, data: PermissionData) {
        const permissionData = {
            Role: data.role as Role,
            Module: data.module as Module,
            Action: data.action as ActionType
        } as any;
        return prisma.permission.update({ where: { Id: id }, data: permissionData });
    }

    async deletePermission(id: string) {
        await prisma.permission.delete({ where: { Id: id } });
    }
}
