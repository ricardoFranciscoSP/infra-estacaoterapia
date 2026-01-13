import { Request, Response } from "express";
import { ContratoPsicologoData } from "../../types/contrato.types";

export interface IPsicologoController {
    list(req: Request, res: Response): Promise<Response>;
    delete(req: Request, res: Response): Promise<Response>;
    update(req: Request, res: Response): Promise<Response>;
    getById(req: Request, res: Response): Promise<Response>;
    gerarContrato(req: Request, res: Response): Promise<Response>;
}
