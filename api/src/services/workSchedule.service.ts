import prisma from '../prisma/client';
import { IWorkScheduleService } from "../interfaces/workSchedule.interface";
import { Role } from '../types/permissions.types';

export class WorkScheduleService implements IWorkScheduleService {
    async setWorkSchedules(
        userId: string,
        schedules: { diaDaSemana: string; horarioInicio: string; horarioFinal: string; breaks?: { startTime: string; endTime: string }[] }[],
        targetPsychologistId?: string
    ) {
        const user = await prisma.user.findUnique({ where: { Id: userId } });
        if (!user) throw new Error('Usuário não encontrado.');

        if (user.Role === Role.Admin) {
            if (!targetPsychologistId) throw new Error('O ID do psicólogo é obrigatório para Administradores.');
            userId = targetPsychologistId;
        } else if (user.Role !== Role.Psychologist) {
            throw new Error('Apenas psicólogos ou Administradores podem configurar a agenda.');
        }

        await prisma.workSchedule.deleteMany({ where: { Id: userId } });

        const createdSchedules = await prisma.workSchedule.createMany({
            data: schedules.map(schedule => ({
                UserId: userId,
                DiaDaSemana: schedule.diaDaSemana,
                HorarioInicio: schedule.horarioInicio,
                HorarioFim: schedule.horarioFinal,
            })),
        });

        return { success: true, createdSchedules };
    }
}
