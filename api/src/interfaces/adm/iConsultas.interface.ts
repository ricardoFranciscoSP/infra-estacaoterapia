import { Request, Response } from "express";

export interface IConsultas {
    getConsultasRealizadas(req: Request, res: Response): Promise<Response>;
    getConsultasMensais(req: Request, res: Response): Promise<Response>;
    getConsultasMensaisTodas(req: Request, res: Response): Promise<Response>;
    getConsultasCanceladas(req: Request, res: Response): Promise<Response>;
    getConsultasMesAtual(req: Request, res: Response): Promise<Response>;
}
