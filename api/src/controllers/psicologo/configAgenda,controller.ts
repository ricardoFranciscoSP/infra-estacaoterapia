import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IConfigAgendaService } from "../../interfaces/psicoologo/configAgenda.interface";
import { ActionType, Module } from "../../types/permissions.types";
import { normalizeParamStringRequired } from "../../utils/validation.util";

export class ConfigAgendaController {

    constructor(
        private configAgendaService: IConfigAgendaService,
        private authService: AuthorizationService,
    ) { }

    // Configurar nova agenda
    async configurarAgenda(req: Request, res: Response) {
        try {
            const data = req.body;

            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const canCreate = await this.authService.checkPermission(userId, Module.WorkSchedule, ActionType.Create);
            if (!canCreate)
                return res.status(403).json({ error: "Acesso negado" });

            data.UserId = userId;

            await this.configAgendaService.configurarAgenda(data);
            res.status(201).json({ message: "Agenda configurada com sucesso" });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }

    // Obter agenda por psicologoId
    async obterAgenda(req: Request, res: Response) {
        try {
            const psicologoId = normalizeParamStringRequired(req.params.psicologoId);
            if (!psicologoId) {
                return res.status(400).json({ error: 'psicologoId é obrigatório' });
            }
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const result = await this.configAgendaService.obterAgenda(psicologoId);
            if (!result) {
                return res.status(404).json({ error: "Agenda não encontrada" });
            }
            res.status(200).json(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }

    // Atualizar agenda
    async atualizarAgenda(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'id é obrigatório' });
            }
            const data = req.body;
            await this.configAgendaService.atualizarAgenda(id, data);
            res.status(200).json({ message: "Agenda atualizada com sucesso" });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }

    // Deletar agenda
    async deletarAgenda(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const id = normalizeParamStringRequired(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'id é obrigatório' });
            }
            await this.configAgendaService.deletarAgenda(id);
            res.status(204).send();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }

    // Listar todas as configurações de agenda
    async listarAgendas(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const agendas = await this.configAgendaService.listarAgendas();
            res.status(200).json(agendas);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }

    async configurarAgendaPsicologo(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const agendas = req.body;
            const result = await this.configAgendaService.configurarAgendaPsicologo(agendas);
            res.status(200).json({ message: "Agendas atualizadas", result });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(400).json({ error: errorMessage });
        }
    }
}