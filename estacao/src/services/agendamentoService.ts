import { api } from "@/lib/axios";

export const agendamentoService = () => {
    return {
        // Reserva um horário disponível; API espera GET /reservas/:id (ver reservations.routes)
        createAgendamento: (id: string) => api.get(`/reservas/${id}`),
        reagendarAgendamento: (idAntiga: string, idNova: string) => api.post(`/reservas/reagendar-reserva`, {
            idAntiga,
            idNova,
        }),
        listarTodasAgendas: () => api.get(`/todas`),
        listarAgendasPorPsicologo: (psicologoId: string) => api.get(`/agenda/psicologo/${psicologoId}`),
        listarAgendasPorDataPsicologo: (psicologoId: string, data: string) => api.get(`/agenda/psicologo/${psicologoId}/data`, { params: { data } }),
        listarAgendasPorData: (data: string) => api.get(`/agenda/data`, { params: { data } }),
        listarAgendasPorPeriodo: (data: string, periodo: string) => api.get(`/agenda/periodo`, { params: { data, periodo } }),
        listarAgendasPorDataHorario: (data: string, horario: string) => api.get('/agenda/data-horario', { params: { data, horario } }),
        // Agendar pelo psicólogo
        agendarProximaSessao: (agendaId: string, pacienteId: string) => api.post(`/consultas-psicologo/new`, {
            agendaId,
            pacienteId,
        }),
    };
}; 