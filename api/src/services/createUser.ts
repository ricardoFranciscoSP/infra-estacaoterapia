// services/createUser.ts
import prisma from '../prisma/client';
import { gerarAgendaMensal } from '../utils/gerarAgendaMensal';

export async function createUser(data: {
    nome: string;
    email: string;
    role: 'PSYCHOLOGIST' | 'PATIENT' | 'Admin';
    cpf: string;
    telefone: string;
    dataNascimento: Date;
    password: string;
}) {
    // Map string roles to Prisma Role enum values
    const roleMap = {
        PSYCHOLOGIST: 'Psychologist',
        PATIENT: 'Patient',
        Admin: 'Admin',
    } as const;

    const user = await prisma.user.create({
        data: {
            Nome: data.nome,
            Email: data.email,
            Role: roleMap[data.role],
            Cpf: data.cpf,
            Telefone: data.telefone,
            DataNascimento: data.dataNascimento,
            Password: data.password,
        },
    });

    if (user.Role === 'Psychologist') {
        await gerarAgendaMensal(user.Id);
    }

    return user;
}
