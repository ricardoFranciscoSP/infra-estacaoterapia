import { create } from 'zustand';

import type { ConsultaApi } from "@/types/consultasTypes";

export interface ConsultaEmAndamentoState {
  consulta: ConsultaApi | null;
  setConsulta: (consulta: ConsultaApi | null) => void;
}

export const useConsultaEmAndamentoStore = create<ConsultaEmAndamentoState>((set) => ({
  consulta: null,
  setConsulta: (consulta) => set({ consulta }),
}));
