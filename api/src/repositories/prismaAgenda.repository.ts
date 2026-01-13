import prisma from '../prisma/client';
import { IAgendaRepository } from './IAgendaRepository';

export const prismaAgendaRepository: IAgendaRepository = {
    async findFirst(params) {
        return prisma.agenda.findFirst({
            where: {
                PsicologoId: String(params.psicologoId),
                Data: params.data,
            },
        });
    },
    async create(agenda) {
        return prisma.agenda.create({
            data: agenda,
        });
    },
    async createMany(agendas) {
        const created = await prisma.agenda.createMany({
            data: agendas,
            skipDuplicates: true,
        });
        return created.count;
    },

    async deleteMany(filter: any): Promise<number> {
        const result = await prisma.agenda.deleteMany(filter);
        return result.count;
    },

    async count(filter: any): Promise<number> {
        // Use apenas 'PsicologoId' e ajuste os demais campos conforme o modelo
        const where = { ...filter.where };
        if (where.psicologoId) {
            where.PsicologoId = where.psicologoId;
            delete where.psicologoId;
        }
        const count = await prisma.agenda.count({ where });
        return count;
    },

    async findMany(filter: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
    }): Promise<any[]> {
        const { where, orderBy, skip, take } = filter;
        return prisma.agenda.findMany({
            where,
            orderBy,
            skip,
            take,
        });
    },
};