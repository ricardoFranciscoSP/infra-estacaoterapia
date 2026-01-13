import { Request, Response } from 'express';

export interface IGerarAgendaService {
    gerarAutomatica(req: Request, res: Response): Promise<any>;
    gerarManual(req: Request, res: Response): Promise<any>;
    deletarAgendasAnteriores(req: Request, res: Response): Promise<any>;
}