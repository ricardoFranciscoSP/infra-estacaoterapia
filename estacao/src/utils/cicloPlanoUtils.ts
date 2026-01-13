/**
 * Exemplo de integração no Frontend com tipos tipados
 * 
 * Este arquivo demonstra como usar o novo sistema de vencimento
 * baseado em CicloPlano na camada de Frontend/Cliente
 */

import type { CicloPlanoType, FinanceiroType } from '../types/planoTypes';

/**
 * Interface para exibição de informações de vencimento
 */
interface InformacaoVencimento {
    dataVencimento: string;
    diasParaVencer: number;
    statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
    periodoCiclo: string;
}

/**
 * Interface para resultado da exibição de vencimento
 */
export interface ResultadoExibicaoVencimento {
    dataVencimento: string;
    diasParaVencer: number;
    statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
    periodoCiclo: string;
    tipo: 'Plano' | 'Avulsa' | 'Consulta';
    origem: 'CicloPlano' | 'Financeiro';
}

/**
 * Obtém a data de vencimento correta dependendo do tipo de financeiro
 * 
 * Para tipo "Plano": Usa CicloPlano (CicloInicio + 1 mês)
 * Para outros tipos: Usa DataVencimento do Financeiro
 * 
 * @param financeiro Objeto Financeiro com possível relação a CicloPlano
 * @param cicloPlano Ciclo associado (opcional)
 * @returns Data de vencimento correta
 */
export function obterDataVencimentoCorreta(
    financeiro: FinanceiroType & { CicloPlano?: CicloPlanoType },
    cicloPlano?: CicloPlanoType
): ResultadoExibicaoVencimento {
    const hoje = new Date();

    // Se for do tipo "Plano" e tem CicloPlano associado, usar vencimento do ciclo
    if ((financeiro.Tipo === 'Plano' || financeiro.Tipo === 'Jornada') && (cicloPlano || financeiro.CicloPlano)) {
           const ciclo = cicloPlano || financeiro.CicloPlano!;
        const dataVencimento = calcularVencimentoCiclo(ciclo.CicloInicio);
        const diasParaVencer = calcularDiasParaVencerCiclo(ciclo.CicloInicio);

        // Determina status
        let statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
        if (diasParaVencer < 0) {
            statusVencimento = 'Vencido';
        } else if (diasParaVencer <= 3) {
            statusVencimento = 'Proximos3Dias';
        } else {
            statusVencimento = 'Ativo';
        }

        const periodoCiclo = `${new Date(ciclo.CicloInicio).toLocaleDateString('pt-BR')} a ${new Date(ciclo.CicloFim).toLocaleDateString('pt-BR')}`;

        return {
            dataVencimento: dataVencimento.toLocaleDateString('pt-BR'),
            diasParaVencer,
            statusVencimento,
            periodoCiclo,
            tipo: 'Plano',
            origem: 'CicloPlano'
        };
    }

    // Para tipos avulsos (Consulta Avulsa, Primeira Consulta, etc), usar DataVencimento do Financeiro
    const dataVencimento = new Date(financeiro.DataVencimento);
    const diasParaVencer = Math.ceil(
        (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    let statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias';
    if (diasParaVencer < 0) {
        statusVencimento = 'Vencido';
    } else if (diasParaVencer <= 3) {
        statusVencimento = 'Proximos3Dias';
    } else {
        statusVencimento = 'Ativo';
    }

    const tipo = financeiro.Tipo === 'Primeira Consulta' ? 'Consulta' : 'Avulsa';

    return {
        dataVencimento: dataVencimento.toLocaleDateString('pt-BR'),
        diasParaVencer,
        statusVencimento,
        periodoCiclo: '', // Não aplica para avulsas
        tipo,
        origem: 'Financeiro'
    };
}

/**
 * Formata informações de vencimento para exibição
 */
export function formatarInformacaoVencimento(
    ciclo: CicloPlanoType,
    financeiro: FinanceiroType
): InformacaoVencimento {
    const resultado = obterDataVencimentoCorreta(financeiro, ciclo);

    return {
        dataVencimento: resultado.dataVencimento,
        diasParaVencer: resultado.diasParaVencer,
        statusVencimento: resultado.statusVencimento,
        periodoCiclo: resultado.periodoCiclo,
    };
}

/**
 * Calcula progresso do ciclo em porcentagem
 */
export function calcularProgressoCiclo(ciclo: CicloPlanoType): number {
    const inicio = new Date(ciclo.CicloInicio).getTime();
    const fim = new Date(ciclo.CicloFim).getTime();
    const agora = Date.now();

    const duracao = fim - inicio;
    const decorrido = agora - inicio;

    const percentual = Math.min(100, Math.max(0, (decorrido / duracao) * 100));
    return Math.round(percentual);
}

/**
 * Valida se o ciclo está ativo
 */
export function isCicloAtivo(ciclo: CicloPlanoType): boolean {
    const hoje = new Date();
    const inicio = new Date(ciclo.CicloInicio);
    const fim = new Date(ciclo.CicloFim);

    return ciclo.Status === 'Ativo' && hoje >= inicio && hoje <= fim;
}

/**
 * Calcula dias restantes do ciclo
 */
export function calcularDiasRestantesCiclo(ciclo: CicloPlanoType): number {
    const fim = new Date(ciclo.CicloFim);
    const hoje = new Date();

    const diasRestantes = Math.ceil(
        (fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, diasRestantes);
}

/**
 * Determina cor do indicador de vencimento
 */
export function obterCorStatusVencimento(
    statusVencimento: 'Ativo' | 'Vencido' | 'Proximos3Dias'
): string {
    switch (statusVencimento) {
        case 'Ativo':
            return 'green';
        case 'Proximos3Dias':
            return 'yellow';
        case 'Vencido':
            return 'red';
        default:
            return 'gray';
    }
}

/**
 * Formata mensagem de status do ciclo
 */
export function obterMensagemStatusCiclo(ciclo: CicloPlanoType): string {
    switch (ciclo.Status) {
        case 'Pendente':
            return 'Ciclo aguardando ativação após pagamento';
        case 'Ativo':
            return `Ciclo ativo até ${new Date(ciclo.CicloFim).toLocaleDateString()}`;
        case 'Cancelado':
            return 'Ciclo foi cancelado';
        case 'Expirado':
            return 'Ciclo expirou, renove sua assinatura';
        default:
            return 'Status desconhecido';
    }
}

/**
 * Valida disponibilidade de consultas
 */
export function temConsultasDisponiveis(ciclo: CicloPlanoType): boolean {
    return ciclo.ConsultasDisponiveis > ciclo.ConsultasUsadas;
}

/**
 * Calcula percentual de consultas usadas
 */
export function calcularPercentualConsultasUsadas(ciclo: CicloPlanoType): number {
    const total = ciclo.ConsultasDisponiveis;
    if (total === 0) return 0;

    const percentual = (ciclo.ConsultasUsadas / total) * 100;
    return Math.round(percentual);
}

/**
 * Exemplo de componente React que exibe informações do ciclo
 */
export interface ComponenteExibicaoCicloProps {
    ciclo: CicloPlanoType;
    financeiro: FinanceiroType;
}

/**
 * Calcula a data de vencimento do ciclo baseado em CicloInicio
 * REGRA: DataVencimento = CicloInicio + 1 mês (mantém o mesmo dia)
 * 
 * @param cicloInicio Data de início do ciclo
 * @returns Data de vencimento do ciclo
 * 
 * @example
 * // CicloInicio: 26/12/2025 -> DataVencimento: 26/01/2026
 * const vencimento = calcularVencimentoCiclo(new Date('2025-12-26'));
 */
export function calcularVencimentoCiclo(cicloInicio: Date | string): Date {
    const inicio = new Date(cicloInicio);
    const vencimento = new Date(inicio);
    vencimento.setMonth(vencimento.getMonth() + 1);
    return vencimento;
}

/**
 * Calcula dias para vencer baseado no CicloPlano
 * 
 * @param cicloInicio Data de início do ciclo
 * @returns Número de dias até o vencimento
 */
export function calcularDiasParaVencerCiclo(cicloInicio: Date | string): number {
    const vencimento = calcularVencimentoCiclo(cicloInicio);
    const hoje = new Date();
    const diasParaVencer = Math.ceil(
        (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diasParaVencer;
}

/**
 * Exemplo de dados estruturados para um ciclo
 */
export const exemploCicloPlano: CicloPlanoType = {
    Id: 'ciclo-123',
    AssinaturaPlanoId: 'assinatura-456',
    UserId: 'user-789',
    CicloInicio: new Date('2025-12-26'),
    CicloFim: new Date('2026-01-25'),
    Status: 'Ativo',
    ConsultasDisponiveis: 4,
    ConsultasUsadas: 2,
    ControleConsultaMensal: [],
    Financeiro: [],
    CreatedAt: new Date('2025-12-26'),
    UpdatedAt: new Date('2025-12-26'),
};

export const exemploFinanceiro: FinanceiroType = {
    Id: 'financeiro-123',
    UserId: 'user-789',
    PlanoAssinaturaId: 'assinatura-456',
    Valor: 599.96,
    DataVencimento: new Date('2026-01-26'), // CicloInicio + 1 mês
    Status: 'Pendente',
    FaturaId: 'fatura-789',
    Tipo: 'Plano',
    CicloPlanoId: 'ciclo-123',
    CreatedAt: new Date('2025-12-26'),
    UpdatedAt: new Date('2025-12-26'),
};

/**
 * Demonstração de uso
 */
export function exemploDeUso() {
    // Formatar informações
    const info = formatarInformacaoVencimento(exemploCicloPlano, exemploFinanceiro);
    console.log('Informações de vencimento:', info);
    // Output:
    // {
    //   dataVencimento: "26/01/2026",
    //   diasParaVencer: 23,
    //   statusVencimento: "Ativo",
    //   periodoCiclo: "26/12/2025 a 25/01/2026"
    // }

    // Progresso do ciclo
    const progresso = calcularProgressoCiclo(exemploCicloPlano);
    console.log(`Progresso do ciclo: ${progresso}%`);

    // Dias restantes
    const diasRestantes = calcularDiasRestantesCiclo(exemploCicloPlano);
    console.log(`Dias restantes: ${diasRestantes}`);

    // Consultas disponíveis
    const temConsultas = temConsultasDisponiveis(exemploCicloPlano);
    console.log(`Tem consultas disponíveis: ${temConsultas}`);

    // Percentual de consultas usadas
    const percentualUsado = calcularPercentualConsultasUsadas(exemploCicloPlano);
    console.log(`Consultas usadas: ${percentualUsado}%`);

    // Status do ciclo
    const mensagem = obterMensagemStatusCiclo(exemploCicloPlano);
    console.log(`Status: ${mensagem}`);

    // Cor do indicador
    const cor = obterCorStatusVencimento(info.statusVencimento);
    console.log(`Cor do indicador: ${cor}`);
}
