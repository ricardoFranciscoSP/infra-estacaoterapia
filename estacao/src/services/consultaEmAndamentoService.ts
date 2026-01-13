import { api } from "@/lib/axios";

export const consultaEmAndamentoService = {
  getPsicologo: async () => api.get("/psicologo/consultas/em-andamento"),
  getPaciente: async () => api.get("/paciente/consultas/em-andamento"),
};
