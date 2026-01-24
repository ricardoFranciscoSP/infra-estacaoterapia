import { api } from "@/lib/axios";
import type { ConsultaApi } from "@/types/consultasTypes";

export interface ConsultaEmAndamentoResponse {
  success: boolean;
  consulta?: ConsultaApi | null;
  message?: string;
}

export const consultaEmAndamentoService = {
  getPsicologo: (): Promise<{ data: ConsultaEmAndamentoResponse }> =>
    api.get<ConsultaEmAndamentoResponse>("/psicologo/consultas/em-andamento"),
  getPaciente: (): Promise<{ data: ConsultaEmAndamentoResponse }> =>
    api.get<ConsultaEmAndamentoResponse>("/consultas-paciente/em-andamento"),
};
