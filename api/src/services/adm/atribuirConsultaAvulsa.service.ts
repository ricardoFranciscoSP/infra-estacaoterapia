import prisma from "../../prisma/client";
import { ConsultaAvulsaStatus, TipoFatura } from "../../types/permission.types";
import { DateTime } from "luxon";

interface AtribuirConsultaAvulsaData {
    pacienteId: string;
    planoAssinaturaId?: string;
    quantidade: number;
    status: string;
}

export class AtribuirConsultaAvulsaService {
    async atribuirConsultaAvulsa(data: AtribuirConsultaAvulsaData) {
        // Validações iniciais
        if (!data.pacienteId) {
            throw new Error("ID do paciente é obrigatório.");
        }

        if (data.quantidade <= 0) {
            throw new Error("A quantidade deve ser maior que zero.");
        }

        // Valida status
        const statusValido = Object.values(ConsultaAvulsaStatus).includes(data.status as ConsultaAvulsaStatus);
        if (!statusValido) {
            throw new Error("Status inválido.");
        }

        // Busca o paciente
        const paciente = await prisma.user.findUnique({
            where: { Id: data.pacienteId },
        });

        if (!paciente) {
            throw new Error("Paciente não encontrado.");
        }

        if (paciente.Status !== "Ativo") {
            throw new Error("Apenas pacientes ativos podem receber consultas avulsas.");
        }

        // Busca o plano se fornecido
        let planoAssinatura = null;
        if (data.planoAssinaturaId) {
            planoAssinatura = await prisma.planoAssinatura.findUnique({
                where: { Id: data.planoAssinaturaId },
            });

            if (!planoAssinatura) {
                throw new Error("Plano não encontrado.");
            }

            if (planoAssinatura.Status !== "ativo") {
                throw new Error("Apenas planos ativos podem ser utilizados.");
            }
        }

        // Usa luxon para garantir fuso horário de Brasília
        const agora = DateTime.now().setZone('America/Sao_Paulo');
        const dataBrasilia = agora;
        const validUntil = dataBrasilia.plus({ days: 30 });

        // Determina o tipo de fatura baseado no plano
        let tipoFatura: TipoFatura = TipoFatura.ConsultaAvulsa;
        if (planoAssinatura) {
            const tipoLower = planoAssinatura.Tipo?.toLowerCase() || '';
            if (tipoLower === 'unico' || tipoLower === 'avulsa' || tipoLower === 'consultaavulsa') {
                tipoFatura = TipoFatura.ConsultaAvulsa;
            } else if (tipoLower === 'primeiraconsulta' || tipoLower === 'primeira consulta') {
                tipoFatura = TipoFatura.PrimeiraConsulta;
            }
        }

        // Valor padrão (0 para atribuições administrativas)
        const valor = planoAssinatura?.Preco || 0;

        // Cria os registros em uma transação
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Cria ConsultaAvulsa com status "Ativa"
            const consultaAvulsa = await tx.consultaAvulsa.create({
                data: {
                    PacienteId: data.pacienteId,
                    PsicologoId: null, // Não vinculado a psicólogo específico
                    Status: data.status as ConsultaAvulsaStatus,
                    DataCriacao: dataBrasilia.toJSDate(),
                    Quantidade: data.quantidade,
                    Tipo: tipoFatura,
                    CodigoFatura: null, // Não há fatura Vindi para atribuições administrativas
                },
            });

            // 2. Cria CreditoAvulso com status "Ativa"
            const creditoAvulso = await tx.creditoAvulso.create({
                data: {
                    UserId: data.pacienteId,
                    Status: data.status as ConsultaAvulsaStatus,
                    Valor: valor,
                    Quantidade: data.quantidade,
                    Data: dataBrasilia.toJSDate(),
                    ValidUntil: validUntil.toJSDate(),
                    Tipo: tipoFatura,
                    CodigoFatura: null, // Não há fatura Vindi para atribuições administrativas
                },
            });

            return {
                consultaAvulsa,
                creditoAvulso,
            };
        });

        console.log('✅ [AtribuirConsultaAvulsaService] Consultas avulsas atribuídas com sucesso:', {
            pacienteId: data.pacienteId,
            quantidade: data.quantidade,
            status: data.status,
            consultaAvulsaId: resultado.consultaAvulsa.Id,
            creditoAvulsoId: resultado.creditoAvulso.Id,
        });

        return {
            message: "Consultas avulsas atribuídas com sucesso.",
            consultaAvulsa: resultado.consultaAvulsa,
            creditoAvulso: resultado.creditoAvulso,
        };
    }
}

