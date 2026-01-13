import prisma from "../prisma/client";
import {
    IControleFinanceiroService,
    IConfirmarPagamentoDTO,
    IAtualizarStatusRecorrenciaDTO,
} from "../interfaces/controleFinanceiro.interface";
import { CicloPlanoService } from "./cicloPlano.service";

export class ControleFinanceiroService implements IControleFinanceiroService {
    async confirmarPagamento({ controleFinanceiroId, statusPagamento, transacaoId }: IConfirmarPagamentoDTO) {
        // Busca registro financeiro pelo model Financeiro
        const financeiro = await prisma.financeiro.findUnique({
            where: { Id: controleFinanceiroId },
        });
        if (!financeiro) throw new Error("Registro financeiro não encontrado");

        const atualizado = await prisma.financeiro.update({
            where: { Id: controleFinanceiroId },
            data: {
                Status: statusPagamento as any,
                // Se necessário, ajuste outros campos conforme seu schema
            },
        });

        let assinaturaPlano = null;
        if (statusPagamento === "Aprovado") {
            // Busca AssinaturaPlano (não PlanoAssinatura)
            assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: financeiro.UserId,
                    PlanoAssinaturaId: financeiro.PlanoAssinaturaId ?? undefined,
                    Status: { in: ["AguardandoPagamento", "Ativo"] }
                },
                include: { PlanoAssinatura: true },
                orderBy: { DataInicio: "desc" }
            });

            if (assinaturaPlano) {
                const cicloService = new CicloPlanoService();

                // Verifica se já existe ciclo ativo
                const cicloAtivo = await cicloService.buscarCicloAtivo(assinaturaPlano.Id, financeiro.UserId);

                if (!cicloAtivo) {
                    // Cria primeiro ciclo se não existir
                    // IMPORTANTE: Cada ciclo sempre tem 30 dias de duração, independente do tipo de plano
                    const dataAtual = new Date();
                    const cicloFim = new Date(dataAtual);
                    cicloFim.setDate(cicloFim.getDate() + 30); // Ciclo sempre tem 30 dias

                    console.log("[ControleFinanceiro] Criando primeiro ciclo:", {
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: financeiro.UserId,
                        cicloInicio: dataAtual,
                        cicloFim: cicloFim
                    });

                    const primeiroCiclo = await cicloService.criarCiclo({
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: financeiro.UserId,
                        cicloInicio: dataAtual,
                        cicloFim: cicloFim,
                        consultasDisponiveis: 4
                    });

                    // Vincula financeiro ao ciclo
                    await prisma.financeiro.update({
                        where: { Id: controleFinanceiroId },
                        data: { CicloPlanoId: primeiroCiclo.Id }
                    });
                } else {
                    // Vincula financeiro ao ciclo existente
                    await prisma.financeiro.update({
                        where: { Id: controleFinanceiroId },
                        data: { CicloPlanoId: cicloAtivo.Id }
                    });
                }
            }
        }

        const user = await prisma.user.findUnique({ where: { Id: financeiro.UserId } });

        return { financeiro: atualizado, user, assinaturaPlano };
    }

    async atualizarStatusRecorrencia({ recorrenciaId, statusPagamento }: IAtualizarStatusRecorrenciaDTO) {
        const financeiro = await prisma.financeiro.findFirst({
            where: { FaturaId: recorrenciaId },
        });
        if (!financeiro) throw new Error("Registro financeiro não encontrado para a recorrência");

        const atualizado = await prisma.financeiro.updateMany({
            where: { FaturaId: recorrenciaId },
            data: { Status: statusPagamento as any },
        });

        const user = await prisma.user.findUnique({ where: { Id: financeiro.UserId } });

        return { count: atualizado.count, user };
    }

    async listarPagamentos(userId: string) {
        return prisma.financeiro.findMany({
            where: { UserId: userId },
            include: {
                PlanoAssinatura: true,
                CicloPlano: {
                    select: {
                        Id: true,
                        CicloInicio: true,
                        CicloFim: true,
                        Status: true,
                        ConsultasDisponiveis: true,
                        ConsultasUsadas: true,
                    }
                },
                Fatura: {
                    select: {
                        Id: true,
                        DataEmissao: true,
                        DataVencimento: true,
                        Status: true,
                        CreatedAt: true, // Adicionado para data de pagamento
                    }
                }
            },
            orderBy: { CreatedAt: 'desc' },
        });
    }

    async excluirPagamento(controleFinanceiroId: string) {
        const financeiro = await prisma.financeiro.findUnique({
            where: { Id: controleFinanceiroId },
        });
        if (!financeiro) throw new Error("Registro financeiro não encontrado");

        await prisma.financeiro.delete({
            where: { Id: controleFinanceiroId },
        });
    }

    async verificarEAtualizarStatus() {
        const registros = await prisma.financeiro.findMany({
            where: {
                DataVencimento: {
                    lt: new Date(),
                },
            },
        });

        let atualizados = 0;
        for (const registro of registros) {
            await prisma.controleConsultaMensal.updateMany({
                where: registro.PlanoAssinaturaId ? { AssinaturaPlanoId: registro.PlanoAssinaturaId } : undefined,
                data: { Status: 'Inativo' },
            });
            atualizados++;
        }
        return atualizados;
    }
}
