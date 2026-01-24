import prisma from "../../prisma/client";
import { $Enums } from "../../generated/prisma";
import { IConfigAgendaService } from "../../interfaces/psicoologo/configAgenda.interface";
import { Agenda, ConfigAgendaInput } from "../../types/configAgenda.types";

export class ConfigAgendaService implements IConfigAgendaService {

    async configurarAgenda(data: ConfigAgendaInput): Promise<void> {
        await prisma.workSchedule.create({ data });
    }

    async obterAgenda(psicologoId: string): Promise<ConfigAgendaInput | null> {
        return await prisma.workSchedule.findUnique({ where: { Id: psicologoId } });
    }

    async atualizarAgenda(id: string, data: ConfigAgendaInput): Promise<void> {
        await prisma.workSchedule.update({ where: { Id: id }, data });
    }

    async deletarAgenda(id: string): Promise<void> {
        await prisma.workSchedule.delete({ where: { Id: id } });
    }

    async listarAgendas(): Promise<ConfigAgendaInput[]> {
        return await prisma.workSchedule.findMany();
    }

    /**
     * Atualiza uma ou mais agendas pelo Id.
     * @param agendas Array de objetos Agenda
     * @returns Array de resultados { id, success }
     */
    async configurarAgendaPsicologo(agendas: Agenda[]): Promise<{ id: string, success: boolean }[]> {
        const results: { id: string, success: boolean }[] = [];
        for (const agenda of agendas) {
            try {
                // Ajusta o tipo do Status para o enum esperado pelo Prisma
                await prisma.agenda.update({
                    where: { Id: agenda.Id },
                    data: {
                        Data: agenda.Data,
                        Horario: agenda.Horario,
                        DiaDaSemana: agenda.DiaDaSemana,
                        Status: agenda.Status as any,
                        PsicologoId: agenda.PsicologoId,
                        PacienteId: agenda.PacienteId,
                    }
                });
                results.push({ id: agenda.Id, success: true });
            } catch {
                results.push({ id: agenda.Id, success: false });
            }
        }
        return results;
    }

    async listarConfigAgenda(params: {
        psicologoId: string;
        status?: string;
        dia?: string;
        semana?: number;
        mes?: number;
        ano?: number;
    }): Promise<Agenda[]> {
        const { psicologoId, status, dia, semana, mes, ano } = params;
        const where: any = { PsicologoId: psicologoId };

        if (status) {
            where.Status = status;
        }
        if (dia) {
            where.Data = dia;
        }
        if (semana && ano) {
            // Filtra por semana usando BETWEEN nas datas
            const firstDayOfYear = new Date(ano, 0, 1);
            const firstWeekDay = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + (semana - 1) * 7));
            const lastWeekDay = new Date(firstWeekDay);
            lastWeekDay.setDate(firstWeekDay.getDate() + 6);
            where.Data = {
                gte: firstWeekDay.toISOString().slice(0, 10),
                lte: lastWeekDay.toISOString().slice(0, 10)
            };
        }
        if (mes && ano) {
            // Filtra por mês usando BETWEEN nas datas
            const firstDay = new Date(ano, mes - 1, 1);
            const lastDay = new Date(ano, mes, 0);
            where.Data = {
                gte: firstDay.toISOString().slice(0, 10),
                lte: lastDay.toISOString().slice(0, 10)
            };
        }

        const agendas = await prisma.agenda.findMany({ where });
        return agendas.map((a: any) => ({
            ...a,
            PacienteId: a.PacienteId === null ? undefined : a.PacienteId
        }));
    }

    async listarHorariosPorDia(psicologoId: string, data: string): Promise<{ Id: string, Horario: string, Status: string }[]> {
        console.log('data', data)
        // Considera o início e fim do dia
        const startDate = new Date(data + "T00:00:00.000Z");
        const endDate = new Date(data + "T23:59:59.999Z");

        const agendas = await prisma.agenda.findMany({
            where: {
                PsicologoId: psicologoId,
                Data: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        return agendas.map((a: any) => ({
            Id: a.Id,
            Horario: a.Horario,
            Status: a.Status
        }));
    }

    async listAllAgendaByMonth(psicologoId: string, mes: number, ano: number): Promise<Agenda[]> {
        const firstDay = new Date(ano, mes - 1, 1);
        const lastDay = new Date(ano, mes, 0);
        const agendas = await prisma.agenda.findMany({
            where: {
                PsicologoId: psicologoId,
                Data: {
                    gte: firstDay.toISOString().slice(0, 10),
                    lte: lastDay.toISOString().slice(0, 10)
                }
            }
        });
        return agendas.map((a: any) => ({
            ...a,
            PacienteId: a.PacienteId === null ? undefined : a.PacienteId
        }));
    }

    async updateAgendaStatusDisponivel(
        horarios: { HorarioId: string, Horario: string, Status: string, Data: string, Recorrente: boolean }[],
        psicologoId: string
    ): Promise<void> {
        console.log("Iniciando atualização de status...");
        for (const h of horarios) {
            console.log("Processando horário:", h);
            if (h.Recorrente) {
                const date = new Date(h.Data);
                const year = date.getFullYear();
                const month = date.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const idsParaAtualizar: string[] = [];

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day);
                    const weekDay = currentDate.getDay();
                    if (weekDay === 0 || weekDay === 6) continue;

                    const startDate = new Date(currentDate.toISOString().slice(0, 10) + "T00:00:00.000Z");
                    const endDate = new Date(currentDate.toISOString().slice(0, 10) + "T23:59:59.999Z");

                    console.log(`Buscando registros para ${currentDate.toISOString().slice(0, 10)} horário ${h.Horario}`);
                    const registros = await prisma.agenda.findMany({
                        where: {
                            PsicologoId: psicologoId,
                            Horario: h.Horario,
                            Data: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    });
                    console.log(`Registros encontrados:`, registros.map((r: any) => r.Id));
                    idsParaAtualizar.push(...registros.map((r: any) => r.Id));
                }

                console.log("IDs para atualizar recorrente:", idsParaAtualizar);
                const updateResults = await Promise.all(
                    idsParaAtualizar.map(async id => {
                        const agendaAtual = await prisma.agenda.findUnique({ where: { Id: id } });
                        let novoStatus: $Enums.AgendaStatus = $Enums.AgendaStatus.Disponivel;
                        if (agendaAtual?.Status === $Enums.AgendaStatus.Disponivel) {
                            novoStatus = $Enums.AgendaStatus.Bloqueado;
                        } else if (agendaAtual?.Status === $Enums.AgendaStatus.Bloqueado) {
                            novoStatus = $Enums.AgendaStatus.Disponivel;
                        }
                        const result = await prisma.agenda.update({
                            where: { Id: id },
                            data: { Status: novoStatus }
                        });
                        console.log(`Atualizado recorrente Id: ${id} - Status: ${result.Status}`);
                        return result;
                    })
                );
            } else {
                // Atualiza todos os IDs recebidos (pode ser um ou mais)
                console.log("IDs para atualizar não recorrente:", horarios.map(item => item.HorarioId));
                const updateResults = await Promise.all(
                    horarios.map(async item => {
                        const agendaAtual = await prisma.agenda.findUnique({ where: { Id: item.HorarioId } });
                        let novoStatus: $Enums.AgendaStatus = $Enums.AgendaStatus.Disponivel;
                        if (agendaAtual?.Status === $Enums.AgendaStatus.Disponivel) {
                            novoStatus = $Enums.AgendaStatus.Bloqueado;
                        } else if (agendaAtual?.Status === $Enums.AgendaStatus.Bloqueado) {
                            novoStatus = $Enums.AgendaStatus.Disponivel;
                        }
                        const result = await prisma.agenda.update({
                            where: { Id: item.HorarioId },
                            data: { Status: novoStatus }
                        });
                        console.log(`Atualizado não recorrente Id: ${item.HorarioId} - Status: ${result.Status}`);
                        return result;
                    })
                );
                console.log("Resultados update não recorrente:", updateResults.length);
                break;
            }
        }
        console.log("Finalizou atualização de status.");
    }
}