import { api } from "@/lib/axios";
import { Futuras, Reserva, ConsultaDia } from "@/types/consultasTypes";
import { AxiosResponse } from "axios";

export const consultaService = () => {
    return {
        getConsulta: () => api.get('/reservas'),
        getConsultaFuturas: (): Promise<AxiosResponse<Futuras>> => api.get('/reservas/proxima-consulta'),
        getAgendadas: () => api.get('/reservas/consultas-agendadas'),
        getConsultaConcluidas: (timeout?: number) => {
            // Permite timeout customizado
            return api.get('/reservas/consultas-realizadas', {
                timeout: timeout || 8000, // 8 segundos por padrão
            });
        },
        getConsultasCompletas: (timeout?: number) => {
            // Permite timeout customizado
            return api.get('/consultas-paciente/todas-realizadas', {
                timeout: timeout || 10000, // 10 segundos por padrão
            });
        },
        getConsultaById: (id: string): Promise<AxiosResponse<Reserva>> => api.get(`/reservas/reservation/${id}`),
        getToken: (channel: string) => api.get(`/reservas/token/${channel}`),
        getConsultaDia: (): Promise<AxiosResponse<ConsultaDia>> => api.get(`/reservas/consulta-dia-ou-proxima`),
        finalizarConsulta: (id: string, forceFinalize?: boolean) => {
            const url = forceFinalize 
                ? `/consultas-paciente/finalizar/${id}?forceFinalize=true`
                : `/consultas-paciente/finalizar/${id}`;
            return api.post(url);
        },
        finalizarConsultaComReview: (id: string, forceFinalize?: boolean) => {
            const url = forceFinalize 
                ? `/consultas-paciente/finalizar-com-review/${id}?forceFinalize=true`
                : `/consultas-paciente/finalizar-com-review/${id}`;
            return api.post<{
                success: boolean;
                requiresReview: boolean;
                psychologistId?: string;
                consultaFinalizada: unknown;
            }>(url);
        },
    };
};
