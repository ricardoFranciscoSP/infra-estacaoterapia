import { Request, Response } from "express";
import { normalizeParamStringRequired } from "../utils/validation.util";
import { AuthorizationService } from '../services/authorization.service';
import { IConsultasPsicologoService } from "../interfaces/consultasPsicologo.interface";

export class ConsultasPsicologoController {
    constructor(
        private consultasService: IConsultasPsicologoService,
        private authService: AuthorizationService
    ) { }

    /**
     * Busca todas as reservas do psicólogo autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de reservas ou erro de autorização.
     */
    async findReservas(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        return this.consultasService.findReservas(userId, res);
    }

    /**
     * Busca reservas completas e agendadas do usuário autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com reservas ou erro de autorização.
     */
    async getReservasCompletasEAgendadasPorUsuario(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        return this.consultasService.getReservasCompletasEAgendadasPorUsuario(userId, res);
    }

    /**
     * Busca reserva específica por ID para o usuário autenticado.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com reserva ou erro de autorização.
     */
    async getReservasPorId(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const reservationId = normalizeParamStringRequired(req.params.id);
        return this.consultasService.getReservasPorId(userId, reservationId, res);
    }

    /**
     * Cancela uma reserva específica do usuário autenticado.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com resultado do cancelamento ou erro de autorização.
     */
    async cancelarReserva(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const reservationId = normalizeParamStringRequired(req.params.id);
        return this.consultasService.cancelarReserva(userId, reservationId, res);
    }

    /**
     * Libera um horário de agenda do psicólogo autenticado.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com resultado da liberação ou erro de autorização.
     */
    async releaseSchedule(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const agendaId = normalizeParamStringRequired(req.params.id);
        return this.consultasService.releaseSchedule(userId, agendaId, res);
    }

    /**
     * Cria uma nova reserva para o psicólogo autenticado.
     * @param req Request do Express contendo dados da reserva.
     * @param res Response do Express.
     * @returns Response com nova reserva ou erro de autorização.
     */
    async newReserva(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Não autorizado.' });
        return this.consultasService.newReserva(userId, req.body, res);
    }

    /**
     * Retorna a consulta em andamento do psicólogo (Status = 'Andamento' e horário atual).
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com consulta em andamento ou mensagem de que não existe.
     */
    async consultaEmAndamento(req: Request, res: Response): Promise<Response> {
        const userId = this.authService.getLoggedUserId(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        return this.consultasService.consultaEmAndamento(userId, res);
    }
}