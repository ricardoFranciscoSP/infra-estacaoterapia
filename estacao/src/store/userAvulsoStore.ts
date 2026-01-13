import { create } from 'zustand';
import { ConsultaAvulsa, CreditoAvulso } from '@/services/userAvulsoService';

interface UserAvulsoState {
    consultaAvulsa: ConsultaAvulsa[];
    creditoAvulso: CreditoAvulso[];
    setConsultaAvulsa: (data: ConsultaAvulsa[]) => void;
    setCreditoAvulso: (data: CreditoAvulso[]) => void;
}

export const useUserAvulsoStore = create<UserAvulsoState>((set) => ({
    consultaAvulsa: [],
    creditoAvulso: [],
    setConsultaAvulsa: (data) => set({ consultaAvulsa: data }),
    setCreditoAvulso: (data) => set({ creditoAvulso: data }),
}));
