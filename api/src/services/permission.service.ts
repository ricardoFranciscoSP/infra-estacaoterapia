import prisma from "../prisma/client";
import { IPermissionRepository } from "../interfaces/permission.repository.interface";
import { PermissionData } from "../types/permissions.types";
import { UserPermissionData, BulkUserPermissionData, RolePermissionData, BulkRolePermissionData } from "../types/user-permission.types";
import { Module, ActionType, Role } from "../types/permissions.types";

export class PermissionService {
    constructor(private permissionRepository: IPermissionRepository) { }

    // ===================== ROLE PERMISSIONS =====================

    async listPermissions() {
        return this.permissionRepository.listPermissions();
    }

    async createPermission(data: PermissionData) {
        return this.permissionRepository.createPermission(data);
    }

    async updatePermission(id: string, data: PermissionData) {
        return this.permissionRepository.updatePermission(id, data);
    }

    async deletePermission(id: string) {
        await this.permissionRepository.deletePermission(id);
    }

    async getPermissionsByRole(role: Role) {
        return prisma.permission.findMany({
            where: { Role: role as any },
        });
    }

    async bulkCreateRolePermissions(data: BulkRolePermissionData) {
        const permissions = await Promise.all(
            data.permissions.map(perm =>
                prisma.permission.upsert({
                    where: {
                        Role_Module_Action: {
                            Role: data.role as any,
                            Module: perm.module as any,
                            Action: perm.action as any,
                        }
                    },
                    update: {},
                    create: {
                        Role: data.role as any,
                        Module: perm.module as any,
                        Action: perm.action as any,
                    }
                })
            )
        );
        return permissions;
    }

    // ===================== USER PERMISSIONS =====================

    async getUserPermissions(userId: string) {
        return prisma.userPermission.findMany({
            where: { UserId: userId },
            include: {
                User: {
                    select: {
                        Id: true,
                        Nome: true,
                        Email: true,
                        Role: true,
                    }
                }
            }
        });
    }

    async createUserPermission(data: UserPermissionData) {
        return prisma.userPermission.upsert({
            where: {
                UserId_Module_Action: {
                    UserId: data.userId,
                    Module: data.module as any,
                    Action: data.action as any,
                }
            },
            update: {
                Allowed: data.allowed,
            },
            create: {
                UserId: data.userId,
                Module: data.module as any,
                Action: data.action as any,
                Allowed: data.allowed,
            }
        });
    }

    async bulkCreateUserPermissions(data: BulkUserPermissionData) {
        // Remove todas as permissões específicas do usuário antes de inserir as novas
        await prisma.userPermission.deleteMany({
            where: { UserId: data.userId }
        });
        // Insere todas as permissões enviadas
        const permissions = await Promise.all(
            data.permissions.map(perm =>
                prisma.userPermission.create({
                    data: {
                        UserId: data.userId,
                        Module: perm.module as any,
                        Action: perm.action as any,
                        Allowed: perm.allowed,
                    }
                })
            )
        );
        return permissions;
    }

    async deleteUserPermission(userId: string, module: Module, action: ActionType) {
        await prisma.userPermission.deleteMany({
            where: {
                UserId: userId,
                Module: module as any,
                Action: action as any,
            }
        });
    }

    async deleteAllUserPermissions(userId: string) {
        await prisma.userPermission.deleteMany({
            where: { UserId: userId }
        });
    }

    // ===================== COMBINED =====================

    async getPermissionsForUser(userId: string) {
        // Busca o role do usuário
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: { Role: true }
        });

        if (!user) {
            return { rolePermissions: [], userPermissions: [] };
        }

        // Busca permissões do role
        const rolePermissions = await prisma.permission.findMany({
            where: { Role: user.Role as any },
        });

        // Busca permissões específicas do usuário
        const userPermissions = await prisma.userPermission.findMany({
            where: { UserId: userId },
        });

        return {
            role: user.Role,
            rolePermissions,
            userPermissions,
        };
    }
}
