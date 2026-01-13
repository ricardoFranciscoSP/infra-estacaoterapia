import { api } from "@/lib/axios";
import { ConfigAgenda } from "@/types/configAgendaTypes";
import { AgendaStatusPayload } from "@/hooks/psicologos/configAgenda";

export const configAgendaService = () => {
    return {
        listarAgendas: () => api.get(`/config-agenda`),
        obterAgenda: (id: string) => api.get(`/config-agenda/${id}`),
        atualizarAgenda: (id: string, data: ConfigAgenda) => api.put(`/config-agenda/${id}`, data),
        configurarAgenda: (data: ConfigAgenda) => api.post(`/config-agenda/`, data),
        deletarAgenda: (id: string) => api.delete(`/config-agenda/${id}`),
        listarConfigAgenda: () => api.get(`/adm-psicologos/config-agenda/agenda`),
        listarHorariosPorDia: (params: { data: string }) => api.get(`/adm-psicologos/config-agenda/agenda/horarios/${params.data}`),
        updateAgendaStatusDisponivel: (payload: AgendaStatusPayload[]) =>
            api.post(`/adm-psicologos/config-agenda/agenda/update-status-disponivel`, { horarios: payload }),
    };
}