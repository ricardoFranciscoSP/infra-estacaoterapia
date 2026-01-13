import { ControleFatura, ControleFaturaCreateDTO, FaturaStatus } from "../types/controleFatura.types";

export interface IControleFaturaService {
    criarControleFatura(data: ControleFaturaCreateDTO): Promise<ControleFatura>;
    updateControleFaturaStatus(id: string, status: FaturaStatus): Promise<ControleFatura>;
    getControleFaturaById(id: string): Promise<ControleFatura | null>;
    getControleFaturasByUserId(userId: string): Promise<ControleFatura[]>;
    deleteControleFatura(id: string): Promise<void>;
    listarControlesFatura(): Promise<ControleFatura[]>;
}
