import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IPaciente } from "../../interfaces/adm/iPaciente.interface";
import { PacienteService } from "../../services/adm/paciente.service";
import { ActionType, Module } from "../../types/permissions.types";
import { logUserOperation } from "../../utils/auditLogger.util";
import { getClientIp } from "../../utils/getClientIp.util";
import prisma from "../../prisma/client";
import { normalizeParamStringRequired } from "../../utils/validation.util";

export class PacienteController implements IPaciente {
    private service: PacienteService;
    private authService: AuthorizationService;

    constructor(
        authService: AuthorizationService = new AuthorizationService(),
        service: PacienteService = new PacienteService(authService)
    ) {
        this.authService = authService;
        this.service = service;
    }

    async list(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Clients,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const paciente = await this.service.list(user);
        return res.json(paciente);
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Clients,
            ActionType.Delete
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);
        
        // Buscar dados do paciente antes de deletar para auditoria
        const paciente = await prisma.user.findUnique({
            where: { Id: id, Role: "Patient" },
            select: { Id: true, Nome: true, Email: true }
        });

        const result = await this.service.delete(user, id);
        
        // Registrar auditoria
        if (paciente) {
            try {
                await logUserOperation(
                    user.Id,
                    ActionType.Delete,
                    id,
                    'deletado',
                    `Paciente: ${paciente.Nome} (${paciente.Email})`,
                    getClientIp(req)
                );
            } catch (auditError) {
                console.error('[PacienteController] Erro ao registrar auditoria:', auditError);
            }
        }
        
        return res.json(result);
    }

    async update(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Clients,
            ActionType.Update
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);
        const data = req.body;
        
        // Buscar dados do paciente antes de atualizar para auditoria
        const pacienteAntes = await prisma.user.findUnique({
            where: { Id: id, Role: "Patient" },
            select: { Id: true, Nome: true, Email: true, Status: true }
        });

        const result = await this.service.update(user, id, data);
        
        // Registrar auditoria
        if (pacienteAntes) {
            try {
                const statusAnterior = pacienteAntes.Status;
                const statusNovo = data.Status || statusAnterior;
                await logUserOperation(
                    user.Id,
                    ActionType.Update,
                    id,
                    'atualizado',
                    `Paciente: ${pacienteAntes.Nome} (${pacienteAntes.Email}) - Status: ${statusAnterior} → ${statusNovo}`,
                    getClientIp(req)
                );
            } catch (auditError) {
                console.error('[PacienteController] Erro ao registrar auditoria:', auditError);
            }
        }
        
        return res.json(result);
    }

    async getById(req: Request, res: Response): Promise<Response> {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const hasPermission = await this.authService.checkPermission(
            user.Id,
            Module.Clients,
            ActionType.Read
        );
        if (!hasPermission) {
            return res.status(403).json({ message: "Acesso negado" });
        }
        const id = normalizeParamStringRequired(req.params.id);
        const cliente = await this.service.getById(user, id);
        if (!cliente) {
            return res.status(404).json({ message: "Cliente não encontrado" });
        }
        return res.json(cliente);
    }
}
