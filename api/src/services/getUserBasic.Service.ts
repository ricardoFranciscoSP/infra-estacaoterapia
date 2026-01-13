import prisma from '../prisma/client';
import { GetUserBasicDTO } from '../interfaces/GetUserBasicDTO';

export class GetUserBasicService {
    async execute(userId: string): Promise<GetUserBasicDTO | null> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: {
                Id: true,
                Nome: true,
                Email: true,
                Cpf: true,
                Telefone: true,
                IsOnboard: true,
                VindiCustomerId: true,
                Role: true,
                Status: true,
                Onboardings: {
                    select: {
                        Id: true,
                        Completed: true,
                        Step: true
                    }
                },
                AssinaturaPlanos: {
                    select: {
                        Status: true
                    },
                    take: 1
                },
                Address: {
                    select: {
                        Id: true
                    },
                    take: 1
                },
                Images: {
                    select: {
                        Id: true,
                        Url: true,
                    },
                    take: 1
                }
            },
        });

        if (!user) return null;

        return {
            Id: user.Id,
            Nome: user.Nome,
            Email: user.Email,
            Cpf: user.Cpf,
            Telefone: user.Telefone,
            IsOnboard: user.IsOnboard,
            Role: user.Role,
            Status: user.Status,
            VindiCustomerId: user.VindiCustomerId ?? undefined,
            Address: Array.isArray(user.Address) && user.Address.length > 0,
            PlanoCompra: Array.isArray(user.AssinaturaPlanos) && user.AssinaturaPlanos.length > 0
                ? { Status: String(user.AssinaturaPlanos[0].Status) }
                : null,
            Image: Array.isArray(user.Images) && user.Images.length > 0
                ? {
                    Id: user.Images[0].Id,
                    Url: user.Images[0].Url
                }
                : null,
            Onboardings: Array.isArray(user.Onboardings)
                ? user.Onboardings.map((onboarding: { Id: string; Completed: boolean; Step: string }) => ({
                    Id: onboarding.Id,
                    Completed: onboarding.Completed.toString(),
                    Step: onboarding.Step || ''
                }))
                : [],

        };
    }
}