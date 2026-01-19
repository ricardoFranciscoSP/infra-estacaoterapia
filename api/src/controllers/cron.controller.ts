import { Request, Response } from "express";
import { ICronJobService } from "../interfaces/ICronJobService";
import { CronJobService } from "../services/cronJob.service";

export class CronController {
    private cronJobService: ICronJobService;

    constructor(cronJobService?: ICronJobService) {
        this.cronJobService = cronJobService ?? new CronJobService();
    }

    /**
     * Executa todos os cron jobs agendados do sistema.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com resultado da execução dos cron jobs.
     */
    async executarCronJobs(req: Request, res: Response): Promise<Response> {
        try {
            await this.cronJobService.executeAll();
            return res.status(200).json({
                success: true,
                message: "Cron jobs executados com sucesso!",
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: "Erro ao executar cron jobs",
                message: error instanceof Error ? error.message : "Erro desconhecido",
                timestamp: new Date().toISOString()
            });
        }
    }
}

export const cronController = new CronController();
