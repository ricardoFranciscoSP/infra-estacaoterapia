import { ControleConsultaParams, ControleConsultaResult } from "../types/controleConsultas.types";

export interface IControleConsultasService {
    controlarConsultas(params: ControleConsultaParams): Promise<ControleConsultaResult>;
    resetMonthlyConsultations(): Promise<void>;
    fetchMonthlyControls(params: { userId: string }): Promise<ControleConsultaResult>;
}
