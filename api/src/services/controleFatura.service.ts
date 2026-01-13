import prisma from "../prisma/client";
import { IControleFaturaService } from "../interfaces/controleFatura.interface";
import { ControleFatura, ControleFaturaCreateDTO, FaturaStatus } from "../types/controleFatura.types";

export class ControleFaturaService implements IControleFaturaService {
    async criarControleFatura(data: ControleFaturaCreateDTO): Promise<ControleFatura> {
        // Ajuste para campos do model Fatura
        const fatura = await prisma.fatura.create({
            data: {
                CodigoFatura: data.CodigoFatura,
                Valor: data.Valor,
                Status: data.Status as any,
                DataEmissao: data.DataEmissao,
                DataVencimento: data.DataVencimento,
                Tipo: data.Tipo as any,
            }
        });
        return fatura as ControleFatura;
    }

    async updateControleFaturaStatus(id: string, status: FaturaStatus): Promise<ControleFatura> {
        const result = await prisma.fatura.updateMany({
            where: { Id: id },
            data: { Status: status as any }
        });

        if (result.count === 0) {
            throw new Error(`Fatura não encontrada para atualização: ${id}`);
        }

        const updated = await prisma.fatura.findUnique({ where: { Id: id } });
        return updated as ControleFatura;
    }

    async getControleFaturaById(id: string): Promise<ControleFatura | null> {
        const fatura = await prisma.fatura.findUnique({
            where: { Id: id }
        });
        return fatura as ControleFatura | null;
    }

    async getControleFaturasByUserId(userId: string): Promise<ControleFatura[]> {
        // Busca todas as faturas relacionadas ao usuário via Financeiro
        const financeiros = await prisma.financeiro.findMany({
            where: { UserId: userId },
            include: { Fatura: true }
        });
        // Retorna apenas as faturas
        return financeiros.map((f: any) => f.Fatura).filter((f: any) => f) as ControleFatura[];
    }

    async listarControlesFatura(): Promise<ControleFatura[]> {
        const faturas = await prisma.fatura.findMany();
        return faturas as ControleFatura[];
    }

    async deleteControleFatura(id: string): Promise<void> {
        await prisma.fatura.delete({
            where: { Id: id }
        });
    }
}