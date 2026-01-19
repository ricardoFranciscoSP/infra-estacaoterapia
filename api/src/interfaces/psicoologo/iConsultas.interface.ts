import { AgendaStatus } from "../../generated/prisma";
import { ConsultaRealizadaPsicologoResponse } from "../../services/psicologo/consultas.service";

export interface IConsultasService {
    consultasRealizadas(psicologoId: string): Promise<number>;
    consultasPendentes(psicologoId: string): Promise<number>;
    taxaOcupacaoAgenda(psicologoId: string): Promise<{ disponivel: number, reservado: number, andamento: number, concluido: number, percentualOcupacao: number }>;
    proximasConsultas(psicologoId: string): Promise<any[]>;
    proximaConsultaPsicologo(psicologoId: string): Promise<{
        success: boolean;
        nextReservation?: any;
        consultaAtual?: any;
        futuras?: any[];
        total?: number;
        error?: string;
    }>;
    listarConsultasRealizadasPorStatus(psicologoId: string, status?: AgendaStatus[]): Promise<ConsultaRealizadaPsicologoResponse[]>;
    listarConsultasPorStatusEMes(psicologoId: string, mes: number, ano: number, status?: AgendaStatus[]): Promise<ConsultaRealizadaPsicologoResponse[]>;
    listarConsultasPorStatusEspecifico(psicologoId: string, status: AgendaStatus): Promise<ConsultaRealizadaPsicologoResponse[]>;
    contarConsultasPorStatus(psicologoId: string, status?: AgendaStatus[]): Promise<number>;
    contarConsultasPorStatusEMes(psicologoId: string, mes: number, ano: number, status?: AgendaStatus[]): Promise<number>;
    listarHistoricoConsultas(
        psicologoId: string,
        filtros: {
            status?: 'todos' | 'efetuada' | 'cancelada';
            buscaPaciente?: string;
            dataInicial?: string;
            dataFinal?: string;
            page?: number;
            pageSize?: number;
        }
    ): Promise<{
        data: ConsultaRealizadaPsicologoResponse[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
}
