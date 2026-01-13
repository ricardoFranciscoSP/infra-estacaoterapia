import { Request, Response } from "express";
import { ConfigAgendaService } from "../../services/psicologo/configAgenda.service";
import { AuthorizationService } from "../../services/authorization.service";


export class ConfigAgendaController {
    constructor(
        private authService: AuthorizationService,
        private service: ConfigAgendaService,
    ) { }
    async listarConfigAgenda(req: Request, res: Response) {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }
            const { status, dia, semana, mes, ano } = req.query;
            const agendas = await this.service.listarConfigAgenda({
                psicologoId,
                status: status as string,
                dia: dia as string,
                semana: semana ? Number(semana) : undefined,
                mes: mes ? Number(mes) : undefined,
                ano: ano ? Number(ano) : undefined,
            });
            res.json(agendas);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar agendas." });
        }
    }

    async listAllAgendaByMonth(req: Request, res: Response) {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }
            const { ano, mes } = req.params;
            const agendas = await this.service.listAllAgendaByMonth(
                psicologoId,
                Number(mes),
                Number(ano)
            );
            res.json(agendas);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar agendas do mês." });
        }
    }

    async listarHorariosPorDia(req: Request, res: Response) {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const { data } = req.params;

            if (!data) {
                return res.status(400).json({ error: "Parâmetro 'data' é obrigatório." });
            }
            const horarios = await this.service.listarHorariosPorDia(psicologoId, data);
            res.json(horarios);
        } catch (error) {
            res.status(500).json({ error: "Erro ao listar horários por dia." });
        }
    }

    async updateAgendaStatusDisponivel(req: Request, res: Response) {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);
            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }
            const { horarios } = req.body;
            if (!Array.isArray(horarios) || horarios.length === 0) {
                return res.status(400).json({ error: "Informe um array de objetos 'horarios'." });
            }
            await this.service.updateAgendaStatusDisponivel(horarios, psicologoId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Erro ao atualizar status das agendas." });
        }
    }


}