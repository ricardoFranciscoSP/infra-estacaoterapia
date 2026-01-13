import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { IFavoriteService } from "../interfaces/favorite.interface";

export class FavoriteController {
    private authService: AuthorizationService;
    private favoriteService: IFavoriteService;

    constructor(favoriteService: IFavoriteService) {
        this.authService = new AuthorizationService();
        this.favoriteService = favoriteService;
    }

    /**
     * Alterna o status de favorito para um psicólogo pelo paciente autenticado.
     * @param req Request do Express contendo id do psicólogo.
     * @param res Response do Express.
     * @returns Response com resultado da operação ou erro.
     */
    async toggleFavorite(req: Request, res: Response): Promise<Response> {
        try {
            const { id: psychologistId } = req.params;
            const patientId = this.authService.getLoggedUserId(req);

            if (!patientId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }

            const result = await this.favoriteService.toggleFavorite(patientId, psychologistId);
            return res.status(result.status).json(result.body);
        } catch (error) {
            console.error("Erro ao alternar favorito:", error);
            return res.status(500).json({ message: "Erro ao alternar favorito", error });
        }
    }

    /**
     * Lista todos os psicólogos favoritos do paciente autenticado.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de favoritos ou erro.
     */
    async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const patientId = this.authService.getLoggedUserId(req);
            if (!patientId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }

            const result = await this.favoriteService.getAllFavorites(patientId);
            return res.status(result.status).json(result.body);
        } catch (error) {
            console.error("Erro ao listar favoritos:", error);
            return res.status(500).json({ message: "Erro ao listar favoritos", error });
        }
    }

    /**
     * Exclui um favorito pelo id para o paciente autenticado.
     * @param req Request do Express contendo id do favorito.
     * @param res Response do Express.
     * @returns Response com resultado da exclusão ou erro.
     */
    async deleteFavorite(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const patientId = this.authService.getLoggedUserId(req);
            if (!patientId) {
                return res.status(401).json({ message: "Usuário não autenticado", success: false });
            }
            const result = await this.favoriteService.deleteFavorite(id);
            return res.status(result.status).json(result.body);
        } catch (error) {
            console.error("Erro ao deletar favorito:", error);
            return res.status(500).json({ message: "Erro ao deletar favorito", error });
        }
    }
}
