/**
 * Utilitário para formatar financeiros com vencimento correto baseado em CicloPlano
 * 
 * REGRA IMPORTANTE:
 * - Financeiro tipo "Plano": DataVencimento vem do CicloPlano (CicloInicio + 1 mês)
 * - Financeiro tipo "Avulsa" ou "Primeira Consulta": DataVencimento vem do Financeiro
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE_BRASIL = 'America/Sao_Paulo';

/**
 * Interface para resposta formatada
 */
export interface FinanceiroFormatado {
    Id: string;
    UserId: string;
    PlanoAssinaturaId: string | null;
    Valor: number;
    DataVencimento: Date;
    DataVencimentoCalculada: Date; // Data de vencimento correta baseada em ciclo ou financeiro
    Status: string;
    FaturaId: string | null;
    CicloPlanoId?: string | null;
    Tipo: string;
    CreatedAt: Date;
    UpdatedAt: Date;
    CicloPlano?: {
        Id: string;
        CicloInicio: Date;
        CicloFim: Date;
        Status: string;
        ConsultasDisponiveis: number;
        ConsultasUsadas: number;
    };
    PlanoAssinatura?: any;
    Fatura?: any;
    VencimentoInfo: {
        dataVencimento: string;
        diasParaVencer: number;
        statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
        tipo: 'Plano' | 'Avulsa' | 'Consulta';
        origem: 'CicloPlano' | 'Financeiro';
        periodoCiclo?: string;
    };
}

/**
 * Calcula a data de vencimento correta para um financeiro
 * 
 * @param financeiro Objeto Financeiro do banco
 * @returns Data de vencimento correta
 */
function calcularVencimentoCorreto(financeiro: any): Date {
    // Se for tipo "Plano" e tem CicloPlano, calcula baseado em CicloInicio
    if (
        (financeiro.Tipo === 'Plano' || financeiro.Tipo === 'Jornada') &&
        financeiro.CicloPlano
    ) {
        const cicloInicio = new Date(financeiro.CicloPlano.CicloInicio);
        const vencimento = new Date(cicloInicio);
        vencimento.setMonth(vencimento.getMonth() + 1);
        return vencimento;
    }

    // Para tipos avulsos, usar DataVencimento do Financeiro
    return new Date(financeiro.DataVencimento);
}

/**
 * Determina o status de vencimento
 */
function determinarStatusVencimento(
    dataVencimento: Date
): 'Ativo' | 'Vencido' | 'Proximos3Dias' {
    const hoje = dayjs().tz(TIMEZONE_BRASIL).startOf('day');
    const vencimento = dayjs(dataVencimento).tz(TIMEZONE_BRASIL).startOf('day');
    const diasParaVencer = vencimento.diff(hoje, 'day');

    if (diasParaVencer < 0) {
        return 'Vencido';
    } else if (diasParaVencer <= 3) {
        return 'Proximos3Dias';
    } else {
        return 'Ativo';
    }
}

/**
 * Calcula dias para vencer
 */
function calcularDiasParaVencer(dataVencimento: Date): number {
    const hoje = dayjs().tz(TIMEZONE_BRASIL).startOf('day');
    const vencimento = dayjs(dataVencimento).tz(TIMEZONE_BRASIL).startOf('day');
    return vencimento.diff(hoje, 'day');
}

/**
 * Formata um financeiro com vencimento correto
 */
export function formatarFinanceiroComVencimento(
    financeiro: any
): FinanceiroFormatado {
    const dataVencimentoCalculada = calcularVencimentoCorreto(financeiro);
    const diasParaVencer = calcularDiasParaVencer(dataVencimentoCalculada);
    const statusVencimento = determinarStatusVencimento(dataVencimentoCalculada);

    // Determina tipo
    let tipo: 'Plano' | 'Avulsa' | 'Consulta';
    let origem: 'CicloPlano' | 'Financeiro';

    if (
        (financeiro.Tipo === 'Plano' || financeiro.Tipo === 'Jornada') &&
        financeiro.CicloPlano
    ) {
        tipo = 'Plano';
        origem = 'CicloPlano';
    } else if (financeiro.Tipo === 'Primeira Consulta') {
        tipo = 'Consulta';
        origem = 'Financeiro';
    } else {
        tipo = 'Avulsa';
        origem = 'Financeiro';
    }

    // Formata período do ciclo se for plano
    let periodoCiclo: string | undefined;
    if (financeiro.CicloPlano) {
        const inicio = dayjs(financeiro.CicloPlano.CicloInicio)
            .tz(TIMEZONE_BRASIL)
            .format('DD/MM/YYYY');
        const fim = dayjs(financeiro.CicloPlano.CicloFim)
            .tz(TIMEZONE_BRASIL)
            .format('DD/MM/YYYY');
        periodoCiclo = `${inicio} a ${fim}`;
    }

    return {
        ...financeiro,
        DataVencimentoCalculada: dataVencimentoCalculada,
        VencimentoInfo: {
            dataVencimento: dayjs(dataVencimentoCalculada)
                .tz(TIMEZONE_BRASIL)
                .format('DD/MM/YYYY'),
            diasParaVencer,
            statusVencimento,
            tipo,
            origem,
            periodoCiclo,
        },
    };
}

/**
 * Formata múltiplos financeiros
 */
export function formatarFinanceirosComVencimento(
    financeiros: any[]
): FinanceiroFormatado[] {
    return financeiros.map(formatarFinanceiroComVencimento);
}

/**
 * Formata a resposta do listarPagamentos para incluir vencimento correto
 */
export function formatarListagemPagamentos(financeiros: any[]): FinanceiroFormatado[] {
    return formatarFinanceirosComVencimento(financeiros);
}
