import { Request, Response } from "express";

export interface IConfiguracoes {
    getRedes(req: Request, res: Response): Promise<Response>;
    updateRedes(req: Request, res: Response, user: any): Promise<Response>;
    createRedes(req: Request, res: Response, user: any): Promise<Response>;
    deleteRedes(req: Request, res: Response, user: any): Promise<Response>;
    getFaq(req: Request, res: Response): Promise<Response>;
    updateFaq(req: Request, res: Response, user: any): Promise<Response>;
    createFaq(req: Request, res: Response, user: any): Promise<Response>;
    createFaqsBulk(req: Request, res: Response, user: any): Promise<Response>;
    deleteFaq(req: Request, res: Response, user: any): Promise<Response>;

    /* Métodos genéricos para outras configurações*/
    getAll(req: Request, res: Response): Promise<Response>;
    getById(req: Request, res: Response): Promise<Response>;
    create(req: Request, res: Response, user: any): Promise<Response>;
    update(req: Request, res: Response, user: any): Promise<Response>;
    delete(req: Request, res: Response, user: any): Promise<Response>;
}