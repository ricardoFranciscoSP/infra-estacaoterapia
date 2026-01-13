import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ProximaConsultaService } from "../services/proximaConsulta.service";

/**
 * Controller para gerenciar a próxima consulta do usuário
 */
export class ProximaConsultaController {
    constructor(
        private authService: AuthorizationService,
        private proximaConsultaService: ProximaConsultaService
    ) { }

    /**
     * Busca a próxima consulta do psicólogo autenticado
     * GET /api/proxima-consulta/psicologo
     */
    async getProximaConsultaPsicologo(req: Request, res: Response): Promise<void> {
        try {
            const psicologoId = this.authService.getLoggedUserId(req);

            if (!psicologoId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const proximaConsulta = await this.proximaConsultaService.buscarProximaConsulta(psicologoId);

            res.status(200).json({
                success: true,
                data: proximaConsulta
            });
        } catch (error) {
            console.error('Erro ao buscar próxima consulta do psicólogo:', error);
            res.status(500).json({
                error: "Erro ao buscar próxima consulta",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca a próxima consulta do paciente autenticado
     * GET /api/proxima-consulta/paciente
     */
    async getProximaConsultaPaciente(req: Request, res: Response): Promise<void> {
        try {
            const pacienteId = this.authService.getLoggedUserId(req);

            if (!pacienteId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const proximaConsulta = await this.proximaConsultaService.buscarProximaConsultaPaciente(pacienteId);

            res.status(200).json({
                success: true,
                data: proximaConsulta
            });
        } catch (error) {
            console.error('Erro ao buscar próxima consulta do paciente:', error);
            res.status(500).json({
                error: "Erro ao buscar próxima consulta",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca a próxima consulta do usuário autenticado (detecta automaticamente se é paciente ou psicólogo)
     * GET /api/proxima-consulta
     */
    async getProximaConsulta(req: Request, res: Response): Promise<void> {
        try {
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            // Busca o papel do usuário
            const userRole = await this.authService.getUserRole(userId);

            let proximaConsulta;

            if (userRole === 'Psychologist') {
                proximaConsulta = await this.proximaConsultaService.buscarProximaConsulta(userId);
            } else if (userRole === 'Patient') {
                proximaConsulta = await this.proximaConsultaService.buscarProximaConsultaPaciente(userId);
            } else {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            res.status(200).json({
                success: true,
                role: userRole,
                data: proximaConsulta
            });
        } catch (error) {
            console.error('Erro ao buscar próxima consulta:', error);
            res.status(500).json({
                error: "Erro ao buscar próxima consulta",
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
