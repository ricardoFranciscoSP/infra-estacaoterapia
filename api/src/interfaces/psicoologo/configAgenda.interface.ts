import { ConfigAgendaInput, Agenda } from "../../types/configAgenda.types";

export interface IConfigAgendaService {
    configurarAgenda(data: ConfigAgendaInput): Promise<void>;
    obterAgenda(psicologoId: string): Promise<ConfigAgendaInput | null>;
    listarAgendas(): Promise<ConfigAgendaInput[]>;
    atualizarAgenda(id: string, data: ConfigAgendaInput): Promise<void>;
    deletarAgenda(id: string): Promise<void>;
    configurarAgendaPsicologo(agendas: Agenda[]): Promise<{ id: string, success: boolean }[]>;
    listarConfigAgenda(params: {
        psicologoId: string;
        status?: string;
        dia?: string; // formato 'YYYY-MM-DD'
        semana?: number; // número da semana no ano
        mes?: number; // número do mês (1-12)
        ano?: number; // opcional para filtro por mês/semana
    }): Promise<Agenda[]>;
    listarHorariosPorDia(psicologoId: string, data: string): Promise<{ Id: string, Horario: string, Status: string }[]>;
    listAllAgendaByMonth(psicologoId: string, mes: number, ano: number): Promise<Agenda[]>;
    updateAgendaStatusDisponivel(
        horarios: { HorarioId: string, Horario: string, Status: string, Data: string, Recorrente: boolean }[],
        psicologoId: string
    ): Promise<void>;
}