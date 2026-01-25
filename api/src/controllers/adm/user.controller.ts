import { Request, Response } from 'express';
import prisma from '../../prisma/client';
import { Role } from '../../generated/prisma';

export class UserController {
    /**
     * Lista todos os usuários com busca e filtro por tipo
     * GET /admin/users?search=termo&role=Admin|Patient|Psychologist|Management|Finance
     */
    async list(req: Request, res: Response): Promise<Response> {
        try {
            const { search, role } = req.query;
            
            const where: {
                Role?: Role;
                OR?: Array<{
                    Nome?: { contains: string; mode: 'insensitive' };
                    Email?: { contains: string; mode: 'insensitive' };
                    Cpf?: { contains: string; mode: 'insensitive' };
                }>;
            } = {};

            // Filtro por tipo de usuário
            if (role && typeof role === 'string' && ['Admin', 'Patient', 'Psychologist', 'Management', 'Finance'].includes(role)) {
                where.Role = role as Role;
            }

            // Busca por nome, email ou CPF
            if (search && typeof search === 'string' && search.trim()) {
                const searchTerm = search.trim();
                where.OR = [
                    { Nome: { contains: searchTerm, mode: 'insensitive' } },
                    { Email: { contains: searchTerm, mode: 'insensitive' } },
                    { Cpf: { contains: searchTerm, mode: 'insensitive' } },
                ];
            }

            const users = await prisma.user.findMany({
                where,
                select: {
                    Id: true,
                    Nome: true,
                    Email: true,
                    Cpf: true,
                    Role: true,
                    Status: true,
                    Crp: true,
                    CreatedAt: true,
                },
                orderBy: {
                    Nome: 'asc',
                },
                take: 100, // Limite para evitar sobrecarga
            });

            return res.status(200).json(users);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return res.status(500).json({ error: 'Erro ao buscar usuários.' });
        }
    }

    /**
     * Atualiza o perfil (role) de um usuário.
     * PATCH /admin/users/:id/role
     * Body: { role: 'Admin' | 'Finance' | 'Management' }
     */
    async updateRole(req: Request, res: Response): Promise<Response> {
        try {
            const id = req.params.id as string;
            const { role } = req.body as { role?: string };
            if (!id || !role) {
                return res.status(400).json({ error: 'ID e role são obrigatórios.' });
            }
            const allowed: Role[] = ['Admin', 'Finance', 'Management'];
            if (!allowed.includes(role as Role)) {
                return res.status(400).json({ error: 'Role inválido. Use Admin, Finance ou Management.' });
            }
            await prisma.user.update({
                where: { Id: id },
                data: { Role: role as Role },
            });
            return res.status(200).json({ success: true, message: 'Perfil atualizado.' });
        } catch (error) {
            console.error('Erro ao atualizar role:', error);
            return res.status(500).json({ error: 'Erro ao atualizar perfil do usuário.' });
        }
    }
}

