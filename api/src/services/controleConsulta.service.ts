import { PrismaClient, ConsultaStatus } from "../generated/prisma";
import { IControleConsultasService } from "../interfaces/controleConsultas.interface";
import { ControleConsultaParams, ControleConsultaResult } from "../types/controleConsultas.types";

export class ControleConsultasService implements IControleConsultasService {
    constructor(private prisma: PrismaClient) { }

    async controlarConsultas(params: ControleConsultaParams): Promise<ControleConsultaResult> {
        const { reservationId, userId } = params;

        try {
            // Busca consulta (Consulta) pelo id
            const consulta = await this.prisma.consulta.findUnique({
                where: { Id: reservationId },
                include: { Agenda: true },
            });

            if (!consulta || !['reserved', 'completed'].includes(consulta.Status)) {
                return { success: false, error: 'Consulta não encontrada ou em status inválido.' };
            }

            // Verifica se o usuário tem permissão para esta consulta
            if (consulta.PacienteId !== userId) {
                return { success: false, error: 'Acesso não permitido a esta consulta.' };
            }

            // Busca assinatura ativa do usuário
            const assinatura = await this.prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: consulta.PacienteId,
                    Status: 'Ativo',
                    DataFim: { gte: new Date() },
                },
                include: { ControleConsultaMensal: true },
            });

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const controleConsulta = assinatura?.ControleConsultaMensal?.find(
                (c: any) => c.MesReferencia === currentMonth && c.AnoReferencia === currentYear && c.Status === 'Ativo'
            );

            if (controleConsulta && (controleConsulta.ConsultasDisponiveis ?? 0) > 0) {
                await this.prisma.$transaction([
                    this.prisma.consulta.update({
                        where: { Id: reservationId },
                        data: { Status: ConsultaStatus.Realizada },
                    }),
                    this.prisma.controleConsultaMensal.update({
                        where: { Id: controleConsulta.Id },
                        data: { ConsultasDisponiveis: { decrement: 1 } },
                    }),
                ]);

                return { success: true, message: 'Consulta processada com sucesso.' };
            }

            return { success: false, error: 'Nenhum plano válido ou consultas disponíveis encontrados.' };

        } catch (error) {
            console.error('Error in controlarConsultas:', error);
            throw new Error('Erro interno no servidor.');
        }
    }

    async resetMonthlyConsultations(): Promise<void> {
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            await this.prisma.$transaction(async (tx: any) => {
                const controles = await tx.controleConsultaMensal.findMany({
                    where: {
                        MesReferencia: currentMonth,
                        AnoReferencia: currentYear,
                        Status: 'Ativo',
                    },
                });

                const updates = controles.map((controle: any) =>
                    tx.controleConsultaMensal.update({
                        where: { Id: controle.Id },
                        data: {
                            ConsultasDisponiveis: 4,
                            Status: 'Ativo',
                        },
                    })
                );

                await Promise.all(updates);
            });
        } catch (error) {
            console.error('Error in resetMonthlyConsultations:', error);
            throw error;
        }
    }

    async fetchMonthlyControls(params: { userId: string }): Promise<ControleConsultaResult> {
        const { userId } = params;
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const monthlyControls = await this.prisma.controleConsultaMensal.findMany({
                where: {
                    MesReferencia: currentMonth,
                    AnoReferencia: currentYear,
                    Status: 'Ativo',
                    UserId: userId,
                },
                include: {
                    AssinaturaPlano: {
                        include: { PlanoAssinatura: true },
                    },
                },
            });

            return {
                success: true,
                message: "Sucesso.",
                data: monthlyControls
            };
        } catch (error) {
            console.error('Error fetching monthly controls:', error);
            throw new Error('Falha ao buscar controles mensais.');
        }
    }
}