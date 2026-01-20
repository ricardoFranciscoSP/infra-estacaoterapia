import { Request } from 'express';
import prisma from '../prisma/client';
import jwt from "jsonwebtoken";
import { ActionType, Module, Role } from '../types/permissions.types';

/**
 * Serviço responsável pela autorização de usuários, incluindo verificação de permissões,
 * obtenção de dados do usuário autenticado e validação de tokens JWT.
 */
export class AuthorizationService {

    // ===================== TOKEN =====================

    /**
     * Decodifica e valida o token JWT.
     * @param token Token JWT a ser verificado.
     * @returns Payload decodificado ou null se inválido.
     */
    private verifyToken(token: string): jwt.JwtPayload | null {
        const secretKey = process.env.JWT_SECRET;
        if (!secretKey) {
            console.error("JWT_SECRET não definido no ambiente");
            return null;
        }

        try {
            return jwt.verify(token, secretKey) as jwt.JwtPayload;
        } catch (error) {
            console.error("Token inválido:", error instanceof Error ? error.message : error);
            return null;
        }
    }

    /**
     * Recupera o valor de um cookie pelo nome.
     * @param req Request do Express.
     * @param name Nome do cookie.
     * @returns Valor do cookie ou null se não encontrado.
     */
    private getCookieValue(req: Request, name: string): string | null {
        const cookies = req.headers['cookie'];
        if (!cookies) {
            console.error("Cabeçalho 'cookie' não encontrado.");
            return null;
        }

        const cookie = cookies.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
        if (!cookie) {
            console.error(`Cookie '${name}' não encontrado.`);
            return null;
        }

        const value = decodeURIComponent(cookie.split("=")[1]);
        return value;
    }

    /**
     * Obtém o ID do usuário logado a partir do token JWT presente nos cookies.
     * @param req Request do Express.
     * @returns ID do usuário ou null se não autenticado.
     */
    getLoggedUserId(req: Request): string | null {
        const userFromRequest = (req as { user?: { Id?: string } }).user;
        if (userFromRequest?.Id) {
            return userFromRequest.Id;
        }

        const authToken = this.getCookieValue(req, "token");

        if (!authToken || authToken.trim() === "") {
            console.error("Token não encontrado ou vazio.");
            return null;
        }

        const decoded = this.verifyToken(authToken);
        return decoded?.userId ?? null;
    }

    // ===================== USUÁRIO =====================

    /**
     * Obtém o papel (role) do usuário pelo seu ID.
     * @param userId ID do usuário.
     * @returns Papel do usuário ou null se não encontrado.
     */
    async getUserRole(userId: string | null): Promise<Role | null> {
        if (!userId) {
            console.error("ID do usuário não fornecido.");
            return null;
        }

        try {
            const user = await prisma.user.findUnique({
                where: { Id: userId },
                select: { Role: true },
            });

            // converte o enum retornado pelo Prisma para o enum local Role
            return (user?.Role as unknown as Role) ?? null;
        } catch (error) {
            console.error("Erro ao buscar o papel do usuário:", error instanceof Error ? error.message : error);
            return null;
        }
    }

    // ===================== PERMISSÕES =====================

    /**
     * Verifica se o usuário tem uma permissão específica para um módulo e ação.
     * Primeiro verifica permissões específicas do usuário, depois permissões do role.
     * @param userId ID do usuário.
     * @param module Módulo a ser verificado.
     * @param action Tipo de ação.
     * @returns True se o usuário tem permissão, false caso contrário.
     */
    async checkPermission(
        userId: string | null,
        module: Module,
        action: ActionType
    ): Promise<boolean> {
        if (!userId) return false;

        const role: Role | null = await this.getUserRole(userId);
        if (!role) return false;

        // Admin tem acesso total a tudo
        if (role === Role.Admin) return true;

        try {
            // Primeiro verifica se há permissão específica do usuário
            const userPermission = await prisma.userPermission.findFirst({
                where: {
                    UserId: userId,
                    Module: module as any,
                    Action: action as any,
                }
            });

            // Se existe permissão específica do usuário, retorna o valor dela
            if (userPermission) {
                return userPermission.Allowed;
            }

            // Se não há permissão específica, verifica permissões do role
            const rolePermission = await prisma.permission.findFirst({
                where: {
                    Role: role,
                    Module: module as any,
                    Action: action as any,
                }
            });

            return !!rolePermission;
        } catch (error) {
            console.error("Erro ao verificar permissão:", error instanceof Error ? error.message : error);
            return false;
        }
    }

    /**
     * Verifica se o usuário tem qualquer uma das permissões especificadas.
     * @param userId ID do usuário.
     * @param permissionChecks Array de objetos contendo módulo e ação.
     * @returns True se o usuário tem pelo menos uma das permissões, false caso contrário.
     */
    async checkAnyPermission(
        userId: string | null,
        permissionChecks: { module: Module, action: ActionType }[]
    ): Promise<boolean> {
        if (!userId) return false;

        const role: Role | null = await this.getUserRole(userId);
        if (!role) return false;

        // Admin tem acesso total a tudo
        if (role === Role.Admin) return true;

        try {
            // Verifica permissões do usuário primeiro
            for (const check of permissionChecks) {
                const hasPermission = await this.checkPermission(userId, check.module, check.action);
                if (hasPermission) return true;
            }

            return false;
        } catch (error) {
            console.error("Erro ao verificar múltiplas permissões:", error instanceof Error ? error.message : error);
            return false;
        }
    }

    /**
     * Verifica se o usuário atual é o dono do recurso ou possui permissão para determinada ação.
     * @param userId ID do usuário autenticado.
     * @param resourceOwnerId ID do dono do recurso.
     * @param module Módulo relacionado.
     * @param action Tipo de ação.
     * @returns True se for dono ou tiver permissão, false caso contrário.
     */
    async isOwnerOrHasPermission(
        userId: string | null,
        resourceOwnerId: string | null,
        module: Module,
        action: ActionType
    ): Promise<boolean> {
        if (!userId || !resourceOwnerId) return false;

        // Se for o próprio dono do recurso
        if (userId === resourceOwnerId) return true;

        // Caso contrário, verifica as permissões
        return this.checkPermission(userId, module, action);
    }
}
