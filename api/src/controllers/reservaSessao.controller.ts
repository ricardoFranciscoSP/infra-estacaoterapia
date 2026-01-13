import { Request, Response } from "express";
import { AuthorizationService } from "../services/authorization.service";
import { ReservaSessaoService } from "../services/reservaSessao.service";
import { normalizeParamString } from "../utils/validation.util";


export class ReservaSessaoController {
    constructor(private authService: AuthorizationService,
        private reservaSessaoService: ReservaSessaoService) { }

    /**
     * Busca a reserva de sessão pelo ID para o usuário autenticado.
     * @param req Request do Express contendo id da reserva.
     * @param res Response do Express.
     * @returns Response com reserva encontrada ou erro.
     */
    async getReservaSessao(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const id = normalizeParamString(req.params.id);
            if (!id) {
                return res.status(400).json({ error: 'ID é obrigatório' });
            }
            const reserva = await this.reservaSessaoService.getReservaSessao(id);
            return res.status(200).json(reserva);
        } catch (error) {
            console.error('Erro ao listar reservas:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca a duração sincronizada da sessão do Redis.
     * @param req Request do Express contendo id da consulta.
     * @param res Response do Express.
     * @returns Response com duração encontrada ou null se não existir.
     */
    async getSessionDuration(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const consultationId = normalizeParamString(req.params.id);
            if (!consultationId) {
                return res.status(400).json({ error: 'ID da consulta é obrigatório' });
            }

            const { ConsultaRoomService } = await import('../services/consultaRoom.service');
            const roomService = new ConsultaRoomService();
            const duration = await roomService.getSessionDuration(consultationId);

            return res.status(200).json({
                success: true,
                data: duration
            });
        } catch (error) {
            console.error('Erro ao buscar duração da sessão:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca todos os dados relacionados a uma consulta: ReservaSessao, Agenda e Consulta
     * @param req Request do Express contendo id da consulta.
     * @param res Response do Express.
     * @returns Response com todos os dados relacionados ou erro.
     */
    async getConsultaCompleta(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const consultationId = normalizeParamString(req.params.id);
            if (!consultationId) {
                return res.status(400).json({ error: 'ID da consulta é obrigatório' });
            }

            const result = await this.reservaSessaoService.getConsultaCompleta(consultationId);
            
            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar consulta completa:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }

    /**
     * Busca todos os dados da ReservaSessao pelo channel (AgoraChannel)
     * Retorna todos os dados necessários para a sala de vídeo: tokens, UIDs, datas, etc.
     * @param req Request do Express contendo channel como parâmetro.
     * @param res Response do Express.
     * @returns Response com todos os dados da ReservaSessao ou erro.
     */
    async getReservaSessaoByChannel(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const channel = normalizeParamString(req.params.channel);
            
            if (!channel || channel.trim() === '') {
                return res.status(400).json({ error: 'Channel é obrigatório' });
            }

            const result = await this.reservaSessaoService.getReservaSessaoByChannel(channel);
            
            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao buscar ReservaSessao por channel:', error);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
    }
}
