import { Request, Response } from 'express';
import { AuthorizationService } from '../services/authorization.service';
import { FormularioSaqueAutonomoService } from '../services/formularioSaqueAutonomo.service';
import { ICreateFormularioSaqueAutonomoDTO, IUpdateFormularioSaqueAutonomoDTO } from '../types/formularioSaqueAutonomo.types';
import { Role } from '../types/permissions.types';

export class FormularioSaqueAutonomoController {
    private authService: AuthorizationService;
    private formularioService: FormularioSaqueAutonomoService;

    constructor() {
        this.authService = new AuthorizationService();
        this.formularioService = new FormularioSaqueAutonomoService();
    }

    async create(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const data = req.body as ICreateFormularioSaqueAutonomoDTO;
            const result = await this.formularioService.create(userId, data);

            return res.status(result.success ? 201 : 400).json(result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: `Erro ao criar formulário: ${errorMessage}` });
        }
    }

    async getByPsicologoAutonomoId(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verificar se o usuário está tentando acessar seu próprio formulário
            const psicologoAutonomoId = req.params.psicologoAutonomoId || userId;
            if (psicologoAutonomoId !== userId) {
                // Verificar se é admin ou management
                const userRole = await this.authService.getUserRole(userId);
                if (userRole !== Role.Admin && userRole !== Role.Management) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }

            const result = await this.formularioService.getByPsicologoAutonomoId(psicologoAutonomoId);
            return res.status(result.success ? 200 : 404).json(result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: `Erro ao buscar formulário: ${errorMessage}` });
        }
    }

    async getMyFormulario(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const result = await this.formularioService.getByPsicologoAutonomoId(userId);
            return res.status(result.success ? 200 : 404).json(result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: `Erro ao buscar formulário: ${errorMessage}` });
        }
    }

    async update(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const data = req.body as IUpdateFormularioSaqueAutonomoDTO;
            const result = await this.formularioService.update(userId, data);

            return res.status(result.success ? 200 : 400).json(result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: `Erro ao atualizar formulário: ${errorMessage}` });
        }
    }

    async getStatus(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const result = await this.formularioService.getStatus(userId);
            // Sempre retorna 200, mesmo se não encontrar (status será false)
            return res.status(200).json(result);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return res.status(500).json({ success: false, message: `Erro ao buscar status: ${errorMessage}` });
        }
    }
}
