import { PrismaClient } from "../generated/prisma/client";
import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ControleConsultasService } from "../services/controleConsulta.service";


export class ConsultaController {
    private consultasService: ControleConsultasService;

    constructor(
        private prisma: PrismaClient,
        private authService: AuthorizationService
    ) {
        this.consultasService = new ControleConsultasService(prisma);
    }

    /**
     * Controla as consultas do usuário autenticado para uma reserva específica.
     * @param req Request do Express contendo reservationId.
     * @param res Response do Express.
     * @returns Response com resultado do controle ou erro.
     */
    async controlarConsultas(req: Request, res: Response): Promise<Response> {
        const { reservationId } = req.body;
        const userId = this.authService.getLoggedUserId(req);

        if (!reservationId || typeof reservationId !== 'string') {
            return res.status(400).json({ success: false, error: 'ID de reserva inválido.' });
        }
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado.' });
        }

        const result = await this.consultasService.controlarConsultas({ reservationId, userId });
        return res.status(result.success ? 200 : 400).json(result);
    }

    /**
     * Reseta o controle mensal de consultas (admin/cron).
     * Não recebe Request/Response, uso interno.
     */
    async resetMonthlyConsultations(): Promise<void> {
        await this.consultasService.resetMonthlyConsultations();
    }

    /**
     * Busca os controles mensais de consultas do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com controles mensais ou erro.
     */
    async fetchMonthlyControls(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado.' });
        }
        const result = await this.consultasService.fetchMonthlyControls({ userId });
        return res.status(result.success ? 200 : 400).json(result);
    }
}