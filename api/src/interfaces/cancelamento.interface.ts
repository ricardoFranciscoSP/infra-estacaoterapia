import { CancelamentoData, CancelamentoResponse, CancelamentoWithUsers } from "../types/cancelamento.types";

export interface ICancelamentoService {
    create(data: CancelamentoData): Promise<CancelamentoResponse>;
    findAll(): Promise<CancelamentoResponse[]>;
    findById(id: string): Promise<CancelamentoResponse | null>;
    update(id: string, data: Partial<CancelamentoData>): Promise<CancelamentoResponse | null>;
    delete(id: string): Promise<CancelamentoResponse | null>;
    approve(id: string): Promise<CancelamentoResponse | null>;
    manage(id: string, data: Partial<CancelamentoData>): Promise<CancelamentoResponse | null>;
    findAllWithUsers(): Promise<CancelamentoWithUsers[]>;
    findByIdWithUsers(id: string): Promise<CancelamentoWithUsers | null>;
    findByStatus(status: string): Promise<CancelamentoResponse[]>;
    countByStatus(status: string): Promise<number>;
}
