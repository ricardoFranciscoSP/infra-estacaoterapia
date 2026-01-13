import prisma from '../prisma/client';
import { GetUserDetailsDTO } from '../interfaces/GetUserFullDetailsDTO';

export class GetUserDetailsService {
    async execute(userId: string): Promise<GetUserDetailsDTO | null> {
        const user = await prisma.user.findUnique({
            where: { Id: userId },
            select: {
                Id: true,
                Nome: true,
                Email: true,
                Cpf: true,
                Telefone: true,
                Sexo: true,
                DataNascimento: true,
                Status: true,
                Role: true,
                DataAprovacao: true,
                Address: {
                    select: {
                        Id: true,
                        UserId: true,
                        Cep: true,
                        Rua: true,
                        Numero: true,
                        Complemento: true,
                        Bairro: true,
                        Cidade: true,
                        Estado: true
                    },
                },
                Images: {
                    select: {
                        Id: true,
                        UserId: true,
                        Url: true,
                        CreatedAt: true
                    }
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
            Sexo: user.Sexo ?? '',
            DataNascimento: user.DataNascimento,
            Status: user.Status,
            Role: user.Role,
            DataAprovacao: user.DataAprovacao ? user.DataAprovacao.toISOString() : null,
            Address: Array.isArray(user.Address)
                ? user.Address.map((addr: any) => ({
                    Id: addr.Id,
                    UserId: addr.UserId,
                    Cep: addr.Cep,
                    Rua: addr.Rua,
                    Numero: addr.Numero,
                    Complemento: addr.Complemento,
                    Bairro: addr.Bairro,
                    Cidade: addr.Cidade,
                    Estado: addr.Estado
                }))
                : [],
            Image: Array.isArray(user.Images) && user.Images.length > 0 ? {
                Id: user.Images[0].Id,
                UserId: user.Images[0].UserId,
                Url: user.Images[0].Url,
                CreatedAt: user.Images[0].CreatedAt
            } : null
        };
    }
}