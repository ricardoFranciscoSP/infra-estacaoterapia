import { Agenda } from '../generated/prisma/client';

export interface IAgendaService {
    listarTodasAgendas(): Promise<any[]>;
    listarAgendasPorPsicologo(psicologoId: string): Promise<any[]>;
    listarAgendasPorDataPsicologo(psicologoId: string, data: string): Promise<any[]>;
    listarAgendasPorData(data: string): Promise<any[]>;
    listarAgendasPorPeriodo(periodo: 'manha' | 'tarde' | 'noite'): Promise<any[]>;
    listarHorariosDisponiveisPorDataPsicologo(psicologoId: string, data: string): Promise<any[]>;
    listarAgendasPorDataHorario(data: string, horario: string): Promise<any[]>;
    listarHorariosDisponiveisPorPeriodoPsicologo(psicologoId: string, data: string, periodo: 'manha' | 'tarde' | 'noite'): Promise<Array<{ id: string, horario: string, status: string, psicologoId: string }>>;
    listarHorariosDisponiveisPorPeriodo(data: string, periodo: 'manha' | 'tarde' | 'noite'): Promise<any[]>;
    criarHorarioQuebrado(psicologoId: string, data: string, horario: string, status?: string): Promise<Agenda>;
}
