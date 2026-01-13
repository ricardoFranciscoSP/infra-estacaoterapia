import prisma from '../prisma/client';
import { IScheduleService } from '../interfaces/schedule.interface';

export class ScheduleService implements IScheduleService {
    async getAvailableSchedules(psicologoId: string): Promise<any[]> {
        return prisma.agenda.findMany({
            where: {
                PsicologoId: psicologoId,
                Status: 'Disponivel',
            },
            orderBy: [
                { Data: 'asc' },
                { Horario: 'asc' },
            ],
        });
    }
}