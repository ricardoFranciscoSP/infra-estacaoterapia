import { CreateCompraAvulsa } from "../types/compraAvulsa.types";


export interface ICompraAvulsaService {
    create(data: CreateCompraAvulsa): Promise<any>;
    fetchById(id: string): Promise<any>;
    fetchAll(): Promise<any[]>;
    update(id: string, data: Partial<CreateCompraAvulsa>): Promise<any>;
    delete(id: string): Promise<void>;
}