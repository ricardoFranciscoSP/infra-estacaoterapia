import prisma from "../prisma/client";
import { validarCicloPlano, calcularVencimentoPorCiclo } from "../utils/calcularVencimentoCiclo.util";
import type { CicloPlanoBase, ValidacaoCicloPlano } from "../types/cicloPlano.types";

export interface CriarCicloDTO {
    assinaturaPlanoId: string;
    userId: string;
    cicloInicio: Date;
    cicloFim: Date;
    consultasDisponiveis?: number;
}

export interface RenovarCicloDTO {
    assinaturaPlanoId: string;
    userId: string;
    consultasDisponiveis?: number;
}

export class CicloPlanoService {
    /**
     * Valida os dados de entrada para criação de ciclo
     * @throws Error se os dados forem inválidos
     */
    private validarDadosCriacaoCiclo(
        assinaturaPlanoId: string,
        userId: string,
        cicloInicio: Date,
        consultasDisponiveis: number
    ): void {
        if (!assinaturaPlanoId || typeof assinaturaPlanoId !== 'string') {
            throw new Error("assinaturaPlanoId é obrigatório e deve ser uma string");
        }
        if (!userId || typeof userId !== 'string') {
            throw new Error("userId é obrigatório e deve ser uma string");
        }
        if (!cicloInicio || !(cicloInicio instanceof Date) || isNaN(cicloInicio.getTime())) {
            throw new Error("cicloInicio é obrigatório e deve ser uma data válida");
        }
        if (typeof consultasDisponiveis !== 'number' || consultasDisponiveis < 0) {
            throw new Error("consultasDisponiveis deve ser um número não negativo");
        }
    }

    /**
     * Cria um novo ciclo para uma assinatura
     */
    async criarCiclo(data: CriarCicloDTO & { status?: string }) {
        const {
            assinaturaPlanoId,
            userId,
            cicloInicio,
            cicloFim,
            consultasDisponiveis = 4,
            status = "Pendente", // Status padrão: Pendente (será ativado após pagamento)
        } = data;

        // Validação de campos obrigatórios
        this.validarDadosCriacaoCiclo(assinaturaPlanoId, userId, cicloInicio, consultasDisponiveis);

        // Valida cicloFim
        let cicloFimFinal: Date;
        if (!cicloFim || !(cicloFim instanceof Date) || isNaN(cicloFim.getTime())) {
            console.error("[CicloPlano] cicloFim não fornecido ou inválido. Calculando automaticamente...", {
                cicloFim,
                cicloInicio,
                assinaturaPlanoId
            });
            // Fallback: calcula cicloFim baseado no utilitário de vencimento
            const resultado = calcularVencimentoPorCiclo({
                cicloInicio,
                cicloFim: undefined
            });
            if (!resultado.isValido) {
                throw new Error(`Erro ao calcular cicloFim: ${resultado.erros.join('; ')}`);
            }
            cicloFimFinal = resultado.cicloFim;
            console.log("[CicloPlano] cicloFim calculado automaticamente:", cicloFimFinal);
        } else {
            cicloFimFinal = cicloFim;
        }

        // Valida o ciclo usando o utilitário tipado
        const validacao = validarCicloPlano(cicloInicio, cicloFimFinal);
        if (!validacao.isValido) {
            throw new Error(`Ciclo inválido: ${validacao.erros.join('; ')}`);
        }

        if (validacao.avisos.length > 0) {
            console.warn("[CicloPlano] Avisos de validação:", validacao.avisos.join('; '));
        }

        // Verifica se a assinatura existe
        const assinatura = await prisma.assinaturaPlano.findUnique({
            where: { Id: assinaturaPlanoId },
            include: { PlanoAssinatura: true },
        });

        if (!assinatura) {
            throw new Error("Assinatura não encontrada");
        }

        // Permite criar ciclo mesmo se a assinatura estiver AguardandoPagamento (primeira compra)
        if (assinatura.Status !== "Ativo" && assinatura.Status !== "AguardandoPagamento") {
            throw new Error("Assinatura não está em estado válido para criar ciclo");
        }

        console.log("[CicloPlano] Criando ciclo com:", {
            assinaturaPlanoId,
            userId,
            cicloInicio,
            cicloFim: cicloFimFinal,
            consultasDisponiveis,
            status
        });

        // Cria o novo ciclo com status informado (Pendente para primeira compra, Ativo para renovações)
        const ciclo = await prisma.cicloPlano.create({
            data: {
                AssinaturaPlanoId: assinaturaPlanoId,
                UserId: userId,
                CicloInicio: cicloInicio,
                CicloFim: cicloFimFinal,
                ConsultasDisponiveis: consultasDisponiveis,
                ConsultasUsadas: 0,
                Status: status,
            },
        });

        // Cria o ControleConsultaMensal vinculado ao ciclo com o mesmo status
        const mesReferencia = cicloInicio.getMonth() + 1;
        const anoReferencia = cicloInicio.getFullYear();

        await prisma.controleConsultaMensal.create({
            data: {
                UserId: userId,
                AssinaturaPlanoId: assinaturaPlanoId,
                CicloPlanoId: ciclo.Id,
                MesReferencia: mesReferencia,
                AnoReferencia: anoReferencia,
                Status: status === "Ativo" ? "Ativo" : "AguardandoPagamento", // Mapeia status do ciclo para ControleConsultaMensal
                ConsultasDisponiveis: consultasDisponiveis,
                Validade: cicloFimFinal,
            },
        });

        console.log("[CicloPlano] Ciclo criado com sucesso:", {
            cicloId: ciclo.Id,
            cicloInicio: ciclo.CicloInicio,
            cicloFim: ciclo.CicloFim
        });

        return ciclo;
    }

    /**
     * Ativa um ciclo pendente (após confirmação de pagamento)
     */
    async ativarCiclo(cicloId: string) {
        const ciclo = await prisma.cicloPlano.findUnique({
            where: { Id: cicloId },
        });

        if (!ciclo) {
            throw new Error("Ciclo não encontrado");
        }

        if (ciclo.Status !== "Pendente") {
            console.warn(`[CicloPlano] Tentativa de ativar ciclo ${cicloId} que não está Pendente (Status atual: ${ciclo.Status})`);
            return ciclo;
        }

        // Atualiza o ciclo para Ativo
        const cicloAtivado = await prisma.cicloPlano.update({
            where: { Id: cicloId },
            data: { Status: "Ativo" },
        });

        // Atualiza o ControleConsultaMensal vinculado
        await prisma.controleConsultaMensal.updateMany({
            where: { CicloPlanoId: cicloId },
            data: { Status: "Ativo" },
        });

        console.log(`[CicloPlano] Ciclo ${cicloId} ativado com sucesso`);
        return cicloAtivado;
    }

    /**
     * Renova um ciclo (cria novo ciclo após o anterior)
     */
    async renovarCiclo(data: RenovarCicloDTO) {
        const { assinaturaPlanoId, userId, consultasDisponiveis = 4 } = data;

        // Busca a assinatura para obter a duração do plano
        const assinatura = await prisma.assinaturaPlano.findUnique({
            where: { Id: assinaturaPlanoId },
            include: { PlanoAssinatura: true },
        });

        if (!assinatura) {
            throw new Error("Assinatura não encontrada");
        }

        // Busca o último ciclo ativo
        const ultimoCiclo = await prisma.cicloPlano.findFirst({
            where: {
                AssinaturaPlanoId: assinaturaPlanoId,
                UserId: userId,
                Status: "Ativo",
            },
            orderBy: { CicloFim: "desc" },
        });

        if (!ultimoCiclo) {
            throw new Error("Nenhum ciclo ativo encontrado para renovação");
        }

        // Marca o ciclo anterior como completo
        await prisma.cicloPlano.update({
            where: { Id: ultimoCiclo.Id },
            data: { Status: "Completo" },
        });

        // Calcula as datas do novo ciclo baseado na duração do plano
        // IMPORTANTE: Cada ciclo sempre tem 30 dias de duração, independente do tipo de plano
        const novoCicloInicio = new Date(ultimoCiclo.CicloFim);
        const novoCicloFim = new Date(novoCicloInicio);
        // Ciclo sempre tem 30 dias, não usa a duração do plano
        novoCicloFim.setDate(novoCicloFim.getDate() + 30);

        console.log("[CicloPlano] Renovando ciclo:", {
            assinaturaPlanoId,
            userId,
            ultimoCicloId: ultimoCiclo.Id,
            ultimoCicloFim: ultimoCiclo.CicloFim,
            novoCicloInicio,
            novoCicloFim
        });

        // Cria o novo ciclo
        return await this.criarCiclo({
            assinaturaPlanoId,
            userId,
            cicloInicio: novoCicloInicio,
            cicloFim: novoCicloFim,
            consultasDisponiveis,
            status: "Ativo" // Renovações sempre criam como Ativo
        });
    }

    /**
     * Lista todos os ciclos de uma assinatura
     */
    async listarCiclos(assinaturaPlanoId: string) {
        return await prisma.cicloPlano.findMany({
            where: { AssinaturaPlanoId: assinaturaPlanoId },
            include: {
                ControleConsultaMensal: true,
                Financeiro: true,
                Consultas: true,
            },
            orderBy: { CicloInicio: "desc" },
        });
    }

    /**
     * Busca o ciclo ativo atual
     */
    async buscarCicloAtivo(assinaturaPlanoId: string, userId: string) {
        return await prisma.cicloPlano.findFirst({
            where: {
                AssinaturaPlanoId: assinaturaPlanoId,
                UserId: userId,
                Status: "Ativo",
                CicloInicio: { lte: new Date() },
                CicloFim: { gte: new Date() },
            },
            include: {
                ControleConsultaMensal: true,
                Financeiro: true,
            },
        });
    }

    /**
     * Atualiza o uso de consultas de um ciclo
     */
    async usarConsulta(cicloId: string) {
        const ciclo = await prisma.cicloPlano.findUnique({
            where: { Id: cicloId },
        });

        if (!ciclo) {
            throw new Error("Ciclo não encontrado");
        }

        if (ciclo.ConsultasUsadas >= ciclo.ConsultasDisponiveis) {
            throw new Error("Todas as consultas do ciclo já foram utilizadas");
        }

        return await prisma.cicloPlano.update({
            where: { Id: cicloId },
            data: {
                ConsultasUsadas: ciclo.ConsultasUsadas + 1,
            },
        });
    }
}

