import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
    StatusConsulta,
    OrigemStatus,
    deveFazerRepasse,
    deveDevolverSessao,
    normalizarStatus,
    CONFIGURACOES_STATUS
} from "../types/statusConsulta.types";
import { AutorTipoCancelamento } from "../generated/prisma";
import prisma from "../prisma/client";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Verifica se o cancelamento está dentro do prazo (>= 24 horas de antecedência)
 * 
 * @param dataConsulta - Data e hora da consulta
 * @param antecedenciaHoras - Horas de antecedência necessárias (padrão: 24)
 * @returns true se está dentro do prazo, false caso contrário
 */
export async function verificarPrazoCancelamento(
    dataConsulta: Date | string,
    antecedenciaHoras: number = 24
): Promise<boolean> {
    try {
        // Busca configuração de antecedência do banco
        const configuracao = await prisma.configuracao.findFirst();
        const horasAntecedencia = configuracao?.antecedenciaCancelamento || antecedenciaHoras;

        const dataConsultaObj = dayjs(dataConsulta).tz('America/Sao_Paulo');
        const agora = dayjs().tz('America/Sao_Paulo');

        const diffHoras = dataConsultaObj.diff(agora, 'hour');

        return diffHoras >= horasAntecedencia;
    } catch (error) {
        console.error('[verificarPrazoCancelamento] Erro ao verificar prazo:', error);
        return false;
    }
}

/**
 * Determina o status normalizado baseado no contexto da consulta
 * 
 * @param statusAtual - Status atual da consulta
 * @param contexto - Contexto adicional (tipo, prazo, motivo, etc.)
 * @returns Status normalizado
 */
export async function determinarStatusNormalizado(
    statusAtual: string,
    contexto: {
        tipoAutor?: AutorTipoCancelamento | string;
        dataConsulta?: Date | string;
        motivo?: string;
        cancelamentoDeferido?: boolean;
        pacienteNaoCompareceu?: boolean;
        psicologoNaoCompareceu?: boolean;
    }
): Promise<StatusConsulta> {
    const statusLower = statusAtual.toLowerCase().trim();

    // Status em andamento ou realizada
    if (statusLower === "andamento" || statusLower === "em andamento") {
        return StatusConsulta.EmAndamento;
    }

    if (statusLower === "concluido" || statusLower === "concluído" || statusLower === "realizada") {
        return StatusConsulta.Realizada;
    }

    if (statusLower.includes("fora da plataforma") || statusLower.includes("foradaplataforma")) {
        return StatusConsulta.ForaDaPlataforma;
    }

    if (statusLower.includes("cancelamento_sistemico_psicologo")) {
        return StatusConsulta.CancelamentoSistemicoPsicologo;
    }

    if (statusLower.includes("cancelamento_sistemico_paciente")) {
        return StatusConsulta.CancelamentoSistemicoPaciente;
    }

    // Verifica não comparecimento
    if (contexto.pacienteNaoCompareceu) {
        return StatusConsulta.PacienteNaoCompareceu;
    }

    if (contexto.psicologoNaoCompareceu) {
        return StatusConsulta.PsicologoNaoCompareceu;
    }

    // Cancelamentos
    if (statusLower.includes("cancel") || statusLower.includes("cancelado")) {
        const tipoAutor = contexto.tipoAutor || "Paciente";
        const dentroPrazo = contexto.dataConsulta
            ? await verificarPrazoCancelamento(contexto.dataConsulta)
            : true; // Default: assume dentro do prazo se não informado

        // Verifica motivo para casos especiais
        const motivo = (contexto.motivo || "").toLowerCase();

        // Força maior
        if (motivo.includes("força maior") || motivo.includes("forca maior") ||
            motivo.includes("força-maior") || motivo.includes("forca-maior")) {
            return StatusConsulta.CanceladaForcaMaior;
        }

        // Não cumprimento contratual
        if (motivo.includes("não cumprimento") || motivo.includes("nao cumprimento") ||
            motivo.includes("não-cumprimento") || motivo.includes("nao-cumprimento")) {
            if (tipoAutor === "Paciente") {
                return StatusConsulta.CanceladaNaoCumprimentoContratualPaciente;
            }
            return StatusConsulta.CanceladaNaoCumprimentoContratualPsicologo;
        }

        // Cancelamento normal por tipo e prazo
        const tipoStr = String(tipoAutor).toLowerCase();
        if (tipoStr === "paciente" || tipoStr === "patient") {
            return dentroPrazo
                ? StatusConsulta.CanceladaPacienteNoPrazo
                : StatusConsulta.CanceladaPacienteForaPrazo;
        }

        if (tipoStr === "psicologo" || tipoStr === "psychologist") {
            return dentroPrazo
                ? StatusConsulta.CanceladaPsicologoNoPrazo
                : StatusConsulta.CanceladaPsicologoForaPrazo;
        }

        if (tipoStr === "admin" || tipoStr === "management" || tipoStr === "sistema") {
            return StatusConsulta.CanceladoAdministrador;
        }

        // Default: paciente no prazo
        return StatusConsulta.CanceladaPacienteNoPrazo;
    }

    // Reagendamentos
    if (statusLower.includes("reagend") || statusLower.includes("reagendada")) {
        const tipoAutor = contexto.tipoAutor || "Paciente";
        const dentroPrazo = contexto.dataConsulta
            ? await verificarPrazoCancelamento(contexto.dataConsulta)
            : true;
        const tipoStr = String(tipoAutor).toLowerCase();

        if (tipoStr === "paciente" || tipoStr === "patient") {
            return StatusConsulta.ReagendadaPacienteNoPrazo;
        }

        if (tipoStr === "psicologo" || tipoStr === "psychologist") {
            return dentroPrazo
                ? StatusConsulta.ReagendadaPsicologoNoPrazo
                : StatusConsulta.ReagendadaPsicologoForaPrazo;
        }
    }

    // Default: Agendada
    return StatusConsulta.Agendada;
}

/**
 * Determina se deve fazer repasse para o psicólogo baseado no status e condições
 * 
 * @param statusNormalizado - Status normalizado da consulta
 * @param cancelamentoDeferido - Se o cancelamento foi deferido (para status condicionais)
 * @returns true se deve fazer repasse, false caso contrário
 */
export function determinarRepasse(
    statusNormalizado: StatusConsulta,
    cancelamentoDeferido?: boolean
): boolean {
    return deveFazerRepasse(statusNormalizado, cancelamentoDeferido);
}

/**
 * Determina se deve devolver sessão ao cliente baseado no status e condições
 * 
 * @param statusNormalizado - Status normalizado da consulta
 * @param cancelamentoDeferido - Se o cancelamento foi deferido (para ações condicionais)
 * @returns true se deve devolver sessão, false caso contrário
 */
export function determinarDevolucaoSessao(
    statusNormalizado: StatusConsulta,
    cancelamentoDeferido?: boolean
): boolean {
    return deveDevolverSessao(statusNormalizado, cancelamentoDeferido);
}

/**
 * Obtém a configuração completa de um status
 * 
 * @param status - Status normalizado
 * @returns Configuração do status ou null se não encontrado
 */
export function obterConfiguracaoStatus(status: StatusConsulta) {
    return CONFIGURACOES_STATUS[status] || null;
}

/**
 * Converte AutorTipoCancelamento para OrigemStatus
 */
export function converterOrigemStatus(tipoAutor: AutorTipoCancelamento | string): OrigemStatus {
    const tipoLower = tipoAutor.toLowerCase();

    if (tipoLower === "paciente" || tipoLower === "patient") {
        return OrigemStatus.Paciente;
    }

    if (tipoLower === "psicologo" || tipoLower === "psychologist") {
        return OrigemStatus.Psicologo;
    }

    if (tipoLower === "admin" || tipoLower === "management") {
        return OrigemStatus.AdminGestao;
    }

    return OrigemStatus.Sistemico;
}






















