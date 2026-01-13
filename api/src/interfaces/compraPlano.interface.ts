import { Request, Response } from "express";
import { CompraPlanoPayload } from "../types/compraPlano.types";

export interface ICompraPlanoService {
    getPlanosPaciente(req: Request, res: Response): Promise<Response>;
    comprarPlano(data: CompraPlanoPayload): Promise<any>;
    cancelarPlano(req: Request, res: Response, userId: string): Promise<Response>;
    upgradePlano(req: Request, res: Response, userId: string): Promise<Response>;
    downgradePlano(req: Request, res: Response, userId: string): Promise<Response>;
}

