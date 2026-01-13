
import { Address } from '../interfaces/address.interface';
import prisma from '../prisma/client';


export class AddressService {
    async createAddress(address: Address): Promise<Address> {
        if (address.type === 'billing') {
            // Para endereço de cobrança, precisa garantir que existe na tabela Address também
            // Se não tiver endereço na tabela Address, cria/atualiza lá primeiro
            const existingAddress = await prisma.address.findFirst({ where: { UserId: address.userId } });
            
            if (!existingAddress) {
                // Cria endereço na tabela Address se não existir
                await prisma.address.create({
                    data: {
                        UserId: address.userId,
                        Rua: address.street,
                        Numero: address.number,
                        Complemento: address.complement,
                        Bairro: address.neighborhood,
                        Cidade: address.city,
                        Estado: address.state,
                        Cep: address.zipCode,
                    },
                });
            } else {
                // Atualiza endereço na tabela Address se já existir
                await prisma.address.update({
                    where: { Id: existingAddress.Id },
                    data: {
                        Rua: address.street,
                        Numero: address.number,
                        Complemento: address.complement,
                        Bairro: address.neighborhood,
                        Cidade: address.city,
                        Estado: address.state,
                        Cep: address.zipCode,
                        UpdatedAt: new Date(),
                    },
                });
            }

            // Cria ou atualiza endereço de cobrança
            const existingBilling = await prisma.billingAddress.findFirst({ where: { UserId: address.userId } });
            if (existingBilling) {
                return prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: {
                        Rua: address.street,
                        Numero: address.number,
                        Complemento: address.complement,
                        Bairro: address.neighborhood,
                        Cidade: address.city,
                        Estado: address.state,
                        Cep: address.zipCode,
                        UpdatedAt: new Date(),
                    },
                }) as any;
            }
            return prisma.billingAddress.create({
                data: {
                    UserId: address.userId,
                    Rua: address.street,
                    Numero: address.number,
                    Complemento: address.complement,
                    Bairro: address.neighborhood,
                    Cidade: address.city,
                    Estado: address.state,
                    Cep: address.zipCode,
                },
            }) as any;
        } else {
            // Cria ou atualiza endereço principal
            const existing = await prisma.address.findFirst({ where: { UserId: address.userId } });
            if (existing) {
                return prisma.address.update({
                    where: { Id: existing.Id },
                    data: {
                        Rua: address.street,
                        Numero: address.number,
                        Complemento: address.complement,
                        Bairro: address.neighborhood,
                        Cidade: address.city,
                        Estado: address.state,
                        Cep: address.zipCode,
                        UpdatedAt: new Date(),
                    },
                }) as any;
            }
            return prisma.address.create({
                data: {
                    UserId: address.userId,
                    Rua: address.street,
                    Numero: address.number,
                    Complemento: address.complement,
                    Bairro: address.neighborhood,
                    Cidade: address.city,
                    Estado: address.state,
                    Cep: address.zipCode,
                },
            }) as any;
        }
    }

    async getAddressesByUser(userId: string): Promise<Address[]> {
        const addresses = await prisma.address.findMany({ where: { UserId: userId } });
        const billing = await prisma.billingAddress.findMany({ where: { UserId: userId } });
        // Normaliza para o formato Address
        return ([
            ...addresses.map(a => ({
                id: a.Id,
                userId: a.UserId,
                street: a.Rua,
                number: a.Numero ?? '',
                complement: a.Complemento ?? '',
                neighborhood: a.Bairro,
                city: a.Cidade,
                state: a.Estado,
                zipCode: a.Cep,
                country: 'Brasil',
                type: 'principal' as const,
                createdAt: a.CreatedAt,
                updatedAt: a.UpdatedAt,
            })),
            ...billing.map(b => ({
                id: b.Id,
                userId: b.UserId,
                street: b.Rua,
                number: b.Numero ?? '',
                complement: b.Complemento ?? '',
                neighborhood: b.Bairro,
                city: b.Cidade,
                state: b.Estado,
                zipCode: b.Cep,
                country: 'Brasil',
                type: 'billing' as const,
                createdAt: b.CreatedAt,
                updatedAt: b.UpdatedAt,
            })),
        ]) as Address[];
    }
}
