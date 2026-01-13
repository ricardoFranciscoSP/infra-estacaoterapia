import prisma from '../prisma/client';
import { IUserRepository } from './IUserRepository';

export const prismaUserRepository: IUserRepository = {
    async findById(id: string) {
        return prisma.user.findUnique({
            where: { Id: id },
            include: {
                ProfessionalProfiles: true
            }
        });
    },
    async findActivePsychologists() {
        return prisma.user.findMany({
            where: { Status: 'Ativo', Role: 'Psychologist' },
            include: {
                ProfessionalProfiles: true
            }
        });
    },
};
