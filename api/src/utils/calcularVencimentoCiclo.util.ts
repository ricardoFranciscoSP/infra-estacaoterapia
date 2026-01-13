/**
 * Utilitário para calcular datas de vencimento baseadas em CicloPlano
 * 
 * Regra de negócio:
 * - DataVencimento = Data de Vencimento para pagamento (baseada no CicloInicio + 1 mês)
 * - CicloInicio = Início do período de cobrança
 * - CicloFim = Próxima data de cobrança
 */

import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE_BRASIL = 'America/Sao_Paulo';
const DIAS_CICLO_PADRAO = 30;

export interface CalculoVencimentoParams {
    cicloInicio: Date;
    cicloFim?: Date;
    mantidoDiaDoMes?: boolean; // Se true, mantém o dia do mês original
}

export interface ResultadoCalculoVencimento {
    cicloInicio: Date;
    cicloFim: Date;
    dataVencimento: Date;
    diasParaVencer: number;
    isValido: boolean;
    erros: string[];
}

/**
 * Calcula as datas de vencimento baseado no CicloPlano
 * 
 * @param params Parâmetros para o cálculo
 * @returns Resultado com todas as datas calculadas
 * 
 * @example
 * const resultado = calcularVencimentoPorCiclo({
 *   cicloInicio: new Date('2025-12-26')
 * });
 * // Retorna:
 * // cicloInicio: 2025-12-26
 * // cicloFim: 2026-01-25 (30 dias depois)
 * // dataVencimento: 2026-01-26 (mesma data do próximo mês)
 */
export function calcularVencimentoPorCiclo(
    params: CalculoVencimentoParams
): ResultadoCalculoVencimento {
    const erros: string[] = [];

    // Valida cicloInicio
    if (!params.cicloInicio || !(params.cicloInicio instanceof Date)) {
        erros.push('cicloInicio é obrigatório e deve ser uma instância de Date');
        return {
            cicloInicio: new Date(),
            cicloFim: new Date(),
            dataVencimento: new Date(),
            diasParaVencer: 0,
            isValido: false,
            erros,
        };
    }

    if (isNaN(params.cicloInicio.getTime())) {
        erros.push('cicloInicio contém uma data inválida');
        return {
            cicloInicio: new Date(),
            cicloFim: new Date(),
            dataVencimento: new Date(),
            diasParaVencer: 0,
            isValido: false,
            erros,
        };
    }

    try {
        const cicloInicioTz = dayjs(params.cicloInicio)
            .tz(TIMEZONE_BRASIL)
            .startOf('day');

        // Calcula cicloFim se não fornecido
        let cicloFimTz: Dayjs;
        if (params.cicloFim && params.cicloFim instanceof Date && !isNaN(params.cicloFim.getTime())) {
            cicloFimTz = dayjs(params.cicloFim).tz(TIMEZONE_BRASIL).endOf('day');

            // Valida que cicloFim é posterior a cicloInicio
            if (!cicloFimTz.isAfter(cicloInicioTz)) {
                erros.push(`cicloFim (${cicloFimTz.format()}) deve ser posterior a cicloInicio (${cicloInicioTz.format()})`);
            }
        } else {
            // Ciclo padrão: 30 dias
            cicloFimTz = cicloInicioTz.add(DIAS_CICLO_PADRAO, 'day').endOf('day');
        }

        // Calcula dataVencimento: próxima cobrança (mesmo dia do mês seguinte)
        // Exemplo: 26/12/2025 -> vencimento em 26/01/2026
        const dataVencimentoTz = cicloInicioTz
            .add(1, 'month')
            .endOf('day');

        // Calcula dias para vencer
        const hoje = dayjs().tz(TIMEZONE_BRASIL).startOf('day');
        const diasParaVencer = dataVencimentoTz.diff(hoje, 'day');

        const resultado: ResultadoCalculoVencimento = {
            cicloInicio: cicloInicioTz.toDate(),
            cicloFim: cicloFimTz.toDate(),
            dataVencimento: dataVencimentoTz.toDate(),
            diasParaVencer,
            isValido: erros.length === 0,
            erros,
        };

        return resultado;
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
        erros.push(`Erro ao calcular vencimento: ${mensagem}`);
        return {
            cicloInicio: new Date(),
            cicloFim: new Date(),
            dataVencimento: new Date(),
            diasParaVencer: 0,
            isValido: false,
            erros,
        };
    }
}

/**
 * Valida se as datas do ciclo são consistentes
 * 
 * @param cicloInicio Data de início do ciclo
 * @param cicloFim Data de fim do ciclo
 * @returns Objeto com resultado da validação
 */
export function validarCicloPlano(
    cicloInicio: Date | undefined,
    cicloFim: Date | undefined
): {
    isValido: boolean;
    erros: string[];
    avisos: string[];
} {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Valida cicloInicio
    if (!cicloInicio || !(cicloInicio instanceof Date) || isNaN(cicloInicio.getTime())) {
        erros.push('cicloInicio deve ser uma data válida');
    }

    // Valida cicloFim
    if (!cicloFim || !(cicloFim instanceof Date) || isNaN(cicloFim.getTime())) {
        erros.push('cicloFim deve ser uma data válida');
    }

    // Se ambas as datas são válidas, valida a relação entre elas
    if (erros.length === 0 && cicloInicio && cicloFim) {
        if (cicloFim <= cicloInicio) {
            erros.push(`cicloFim (${cicloFim.toISOString()}) deve ser posterior a cicloInicio (${cicloInicio.toISOString()})`);
        }

        // Aviso: se o ciclo for muito curto
        const diasCiclo = Math.floor((cicloFim.getTime() - cicloInicio.getTime()) / (1000 * 60 * 60 * 24));
        if (diasCiclo < 7) {
            avisos.push(`Ciclo muito curto (${diasCiclo} dias). Considere usar ciclos maiores.`);
        }

        // Aviso: se o ciclo for muito longo
        if (diasCiclo > 365) {
            avisos.push(`Ciclo muito longo (${diasCiclo} dias). Considere usar ciclos menores.`);
        }
    }

    return {
        isValido: erros.length === 0,
        erros,
        avisos,
    };
}

/**
 * Formata datas para exibição
 */
export function formatarDataVencimento(
    data: Date | undefined,
    formato: string = 'DD/MM/YYYY'
): string {
    if (!data || !(data instanceof Date) || isNaN(data.getTime())) {
        return 'Data inválida';
    }

    return dayjs(data).tz(TIMEZONE_BRASIL).format(formato);
}

/**
 * Calcula próximo ciclo baseado no anterior
 */
export function calcularProximoCiclo(
    cicloAtual: {
        cicloInicio: Date;
        cicloFim: Date;
    }
): ResultadoCalculoVencimento {
    // Próximo ciclo começa onde o anterior terminou
    const proximoCicloInicio = new Date(cicloAtual.cicloFim);
    proximoCicloInicio.setDate(proximoCicloInicio.getDate() + 1);

    return calcularVencimentoPorCiclo({
        cicloInicio: proximoCicloInicio,
    });
}
