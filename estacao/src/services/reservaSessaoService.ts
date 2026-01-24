import { api } from "@/lib/axios";

// Serviço ajustado para as rotas da sua API Express
// Exporta como função que retorna o objeto (compatível com consultaService)
export function reservaSessaoService() {
    return {
        getById: (id: string) => api.get(`/reserva-sessao/${id}`),
        getByChannel: (channel: string) => api.get(`/reserva-sessao/channel/${channel}`),
        getSessionDuration: (id: string) => api.get(`/reserva-sessao/${id}/session-duration`),
        getConsultaCompleta: (id: string) => api.get(`/reserva-sessao/${id}/complete`),
        getReservasDiaAtualByPsicologoPaciente: (psicologoId: string, pacienteId: string) =>
            api.get(`/reserva-sessao/dia-atual`, {
                params: { psicologoId, pacienteId },
            }),
        updateTokensReservaSessao: (
            id: string,
            payload: {
                patientToken: string;
                psychologistToken: string;
                patientUid: number;
                psychologistUid: number;
            }
        ) => api.post(`/reserva-sessao/${id}/atualizar-tokens`, payload),
    };
}