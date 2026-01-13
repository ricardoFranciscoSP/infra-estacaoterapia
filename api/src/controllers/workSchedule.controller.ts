import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { WorkScheduleService } from "../services/workSchedule.service";

export class WorkScheduleController {
    constructor(
        private authService: AuthorizationService,
        private workScheduleService: WorkScheduleService
    ) { }

    /**
     * Define os horários de trabalho para o psicólogo autenticado ou alvo.
     * @param req Request do Express contendo schedules e targetPsychologistId.
     * @param res Response do Express.
     * @returns Response com resultado da operação ou erro.
     */
    async setWorkSchedules(req: Request, res: Response) {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }
            const { schedules, targetPsychologistId } = req.body;

            const result = await this.workScheduleService.setWorkSchedules(userId, schedules, targetPsychologistId);
            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao definir horários de trabalho:', error);
            return res.status(500).json({ error: 'Não foi possível definir os horários de trabalho.' });
        }
    }
}