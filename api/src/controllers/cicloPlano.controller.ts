import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { CicloPlanoService } from "../services/cicloPlano.service";
import { asyncHandler } from "../middlewares/asyncHandler";
import { normalizeParamStringRequired } from "../utils/validation.util";

export class CicloPlanoController {
    constructor(
        private cicloPlanoService: CicloPlanoService = new CicloPlanoService(),
        private authService: AuthorizationService = new AuthorizationService()
    ) {}

    /**
     * Lista todos os ciclos de uma assinatura
     */
    async listarCiclos(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const assinaturaPlanoId = normalizeParamStringRequired(req.params.assinaturaPlanoId);
            if (!assinaturaPlanoId) {
                return res.status(400).json({ error: 'assinaturaPlanoId é obrigatório' });
            }

            const ciclos = await this.cicloPlanoService.listarCiclos(assinaturaPlanoId);
            return res.status(200).json({ ciclos });
        } catch (error) {
            console.error("Erro ao listar ciclos:", error);
            return res.status(500).json({ message: "Erro interno ao listar ciclos." });
        }
    }

    /**
     * Busca o ciclo ativo atual
     */
    async buscarCicloAtivo(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const assinaturaPlanoId = normalizeParamStringRequired(req.params.assinaturaPlanoId);
            if (!assinaturaPlanoId) {
                return res.status(400).json({ error: 'assinaturaPlanoId é obrigatório' });
            }

            const ciclo = await this.cicloPlanoService.buscarCicloAtivo(assinaturaPlanoId, userId);
            return res.status(200).json({ ciclo });
        } catch (error) {
            console.error("Erro ao buscar ciclo ativo:", error);
            return res.status(500).json({ message: "Erro interno ao buscar ciclo ativo." });
        }
    }
}

