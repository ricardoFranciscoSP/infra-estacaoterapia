import { Request, Response } from "express";
import { ControleFaturaService } from "../services/controleFatura.service";
import { FaturaStatus } from "../types/controleFatura.types";
import { normalizeParamStringRequired } from "../utils/validation.util";

export class ControleFaturaController {
    private controleFaturaService: ControleFaturaService;

    constructor() {
        this.controleFaturaService = new ControleFaturaService();
    }

    /**
     * Cria um novo controle de fatura.
     * @param req Request do Express contendo dados da fatura.
     * @param res Response do Express.
     * @returns Response com controle criado ou erro.
     */
    async criarControleFatura(req: Request, res: Response): Promise<Response> {
        const data = req.body;

        if (!data.userId || !data.status || !data.vindiBillId || !data.tipoFatura) {
            return res.status(400).json({ message: "Campos obrigatórios ausentes." });
        }

        try {
            const controleFatura = await this.controleFaturaService.criarControleFatura(data);
            return res.status(201).json(controleFatura);
        } catch (error) {
            console.error("Erro ao criar controle de fatura:", error);
            return res.status(500).json({ message: "Erro interno ao criar controle de fatura." });
        }
    }

    /**
     * Lista todos os controles de fatura.
     * @param req Request do Express.
     * @param res Response do Express.
     * @returns Response com lista de controles ou erro.
     */
    async listarControlesFatura(req: Request, res: Response): Promise<Response> {
        try {
            const controles = await this.controleFaturaService.listarControlesFatura();
            return res.status(200).json(controles);
        } catch (error) {
            console.error("Erro ao listar controles de fatura:", error);
            return res.status(500).json({ message: "Erro interno ao listar controles de fatura." });
        }
    }

    /**
     * Busca controle de fatura por ID.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response com controle ou erro.
     */
    async getControleFaturaById(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ message: "ID é obrigatório." });
        }
        try {
            const controle = await this.controleFaturaService.getControleFaturaById(id);
            if (!controle) {
                return res.status(404).json({ message: "Controle de fatura não encontrado." });
            }
            return res.status(200).json(controle);
        } catch (error) {
            console.error("Erro ao buscar controle de fatura:", error);
            return res.status(500).json({ message: "Erro interno ao buscar controle de fatura." });
        }
    }

    /**
     * Busca controles de fatura por ID do usuário.
     * @param req Request do Express contendo parâmetro userId.
     * @param res Response do Express.
     * @returns Response com controles ou erro.
     */
    async getControleFaturasByUserId(req: Request, res: Response): Promise<Response> {
        const userId = normalizeParamStringRequired(req.params.userId);
        if (!userId) {
            return res.status(400).json({ message: "UserId é obrigatório." });
        }
        try {
            const controles = await this.controleFaturaService.getControleFaturasByUserId(userId);
            return res.status(200).json(controles);
        } catch (error) {
            console.error("Erro ao buscar controles de fatura por usuário:", error);
            return res.status(500).json({ message: "Erro interno ao buscar controles de fatura por usuário." });
        }
    }

    /**
     * Atualiza o status de um controle de fatura.
     * @param req Request do Express contendo parâmetro id e novo status.
     * @param res Response do Express.
     * @returns Response com controle atualizado ou erro.
     */
    async updateControleFaturaStatus(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ message: "ID é obrigatório." });
        }
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status é obrigatório." });
        }
        try {
            const controleAtualizado = await this.controleFaturaService.updateControleFaturaStatus(id, status as FaturaStatus);
            if (!controleAtualizado) {
                return res.status(404).json({ message: "Controle de fatura não encontrado para atualização de status." });
            }
            return res.status(200).json(controleAtualizado);
        } catch (error) {
            console.error("Erro ao atualizar status do controle de fatura:", error);
            return res.status(500).json({ message: "Erro interno ao atualizar status do controle de fatura." });
        }
    }

    /**
     * Exclui um controle de fatura por ID.
     * @param req Request do Express contendo parâmetro id.
     * @param res Response do Express.
     * @returns Response de sucesso ou erro.
     */
    async deleteControleFatura(req: Request, res: Response): Promise<Response> {
        const id = normalizeParamStringRequired(req.params.id);
        if (!id) {
            return res.status(400).json({ message: "ID é obrigatório." });
        }
        try {
            await this.controleFaturaService.deleteControleFatura(id);
            return res.status(204).send();
        } catch (error) {
            console.error("Erro ao deletar controle de fatura:", error);
            return res.status(500).json({ message: "Erro interno ao deletar controle de fatura." });
        }
    }
}