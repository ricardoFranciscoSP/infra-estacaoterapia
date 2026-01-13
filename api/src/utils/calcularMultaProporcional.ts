import { Prisma } from "../generated/prisma/client";

/**
 * Tipo para ciclo de plano com campos necessários para cálculo de multa
 */
type CicloPlanoParaCalculo = {
    CicloInicio: Date;
    CicloFim: Date;
    Status: string;
};

/**
 * Tipo para assinatura de plano com dados necessários para cálculo de multa
 */
type AssinaturaPlanoParaCalculo = {
    DataInicio: Date;
    PlanoAssinatura: {
        Preco: number;
        Duracao: number;
        Tipo: string;
    } | null;
    Ciclos?: CicloPlanoParaCalculo[];
};

/**
 * Resultado do cálculo de multa proporcional
 */
export interface ResultadoCalculoMulta {
    deveAplicar: boolean;
    valorMulta: number;
    diasFaltantes: number;
    ciclosRestantes: number;
    motivo: string;
    valorProporcionalRestante: number;
    valorTotalPlano: number;
    valorDiario: number;
    diasUsados: number;
    totalDiasPlano: number;
}

/**
 * Calcula a multa proporcional baseada na lei do consumidor
 * 
 * Regras:
 * - Período de arrependimento: 7 dias (sem multa)
 * - A partir do 8º dia pode incidir multa
 * - Aplica apenas para planos Semestral e Trimestral (mensal não tem multa)
 * 
 * Fórmula de cálculo:
 * 1. Valor total do plano = valor mensal × número de meses
 * 2. Total de dias do plano = meses × 30 dias
 * 3. Dias usados = dias desde a contratação
 * 4. Dias restantes = total de dias - dias usados
 * 5. Valor diário = valor total / total de dias
 * 6. Valor proporcional restante = valor diário × dias restantes
 * 7. Multa = valor proporcional restante × 20%
 * 
 * Exemplo:
 * - Valor mensal: 399,97
 * - Duração: 6 meses
 * - Valor total: 399,97 × 6 = 2.399,82
 * - Total de dias: 6 × 30 = 180 dias
 * - Cancelamento no 8º dia
 * - Dias usados: 8
 * - Dias restantes: 180 - 8 = 172 dias
 * - Valor diário: 2.399,82 / 180 ≈ 13,33
 * - Valor restante: 13,33 × 172 ≈ 2.292,76
 * - Multa: 2.292,76 × 0,20 ≈ 458,55
 * 
 * @param assinaturaPlano - Assinatura do plano com dados necessários
 * @param dataCancelamento - Data do cancelamento (padrão: data atual)
 * @returns Resultado do cálculo com valor da multa e informações detalhadas
 */
export function calcularMultaProporcional(
    assinaturaPlano: AssinaturaPlanoParaCalculo,
    dataCancelamento: Date = new Date()
): ResultadoCalculoMulta {
    // Validações iniciais
    if (!assinaturaPlano.PlanoAssinatura) {
        return {
            deveAplicar: false,
            valorMulta: 0,
            diasFaltantes: 0,
            ciclosRestantes: 0,
            motivo: "Plano não possui informações de assinatura",
            valorProporcionalRestante: 0,
            valorTotalPlano: 0,
            valorDiario: 0,
            diasUsados: 0,
            totalDiasPlano: 0
        };
    }

    const valorMensal = assinaturaPlano.PlanoAssinatura.Preco || 0;
    const duracaoPlano = assinaturaPlano.PlanoAssinatura.Duracao || 0;
    const tipoPlano = (assinaturaPlano.PlanoAssinatura.Tipo || "").toLowerCase();

    // Verifica se o plano tem multa (apenas Semestral e Trimestral)
    let numeroMeses = 0;
    if (tipoPlano === "semestral") {
        numeroMeses = 6;
    } else if (tipoPlano === "trimestral") {
        numeroMeses = 3;
    } else {
        // Plano mensal não tem multa
        return {
            deveAplicar: false,
            valorMulta: 0,
            diasFaltantes: 0,
            ciclosRestantes: 0,
            motivo: "Plano mensal não possui multa de cancelamento",
            valorProporcionalRestante: 0,
            valorTotalPlano: 0,
            valorDiario: 0,
            diasUsados: 0,
            totalDiasPlano: 0
        };
    }

    // Calcula quantos dias se passaram desde o início do plano
    const dataInicio = new Date(assinaturaPlano.DataInicio);
    const diffMs = dataCancelamento.getTime() - dataInicio.getTime();
    const diasUsados = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 porque o dia da contratação conta como dia 1

    // Calcula valor total do plano
    const valorTotalPlano = valorMensal * numeroMeses;

    // Calcula total de dias do plano (aproximação: 30 dias por mês)
    const diasPorMes = 30;
    const totalDiasPlano = numeroMeses * diasPorMes;

    // Calcula dias restantes
    const diasRestantes = Math.max(0, totalDiasPlano - diasUsados);

    // Calcula valor diário do plano
    const valorDiario = valorTotalPlano / totalDiasPlano;

    // Calcula valor proporcional do período restante
    const valorProporcionalRestante = valorDiario * diasRestantes;

    // Período de arrependimento: 7 dias (sem multa)
    const periodoArrependimento = 7;
    if (diasUsados <= periodoArrependimento) {
        return {
            deveAplicar: false,
            valorMulta: 0,
            diasFaltantes: diasRestantes,
            ciclosRestantes: 0,
            motivo: `Cancelamento dentro do período de arrependimento (${diasUsados} dias). Sem multa.`,
            valorProporcionalRestante,
            valorTotalPlano,
            valorDiario,
            diasUsados,
            totalDiasPlano
        };
    }

    // Se não há dias restantes, não aplica multa
    if (diasRestantes <= 0) {
        return {
            deveAplicar: false,
            valorMulta: 0,
            diasFaltantes: 0,
            ciclosRestantes: 0,
            motivo: "Não há dias restantes no plano",
            valorProporcionalRestante: 0,
            valorTotalPlano,
            valorDiario,
            diasUsados,
            totalDiasPlano
        };
    }

    // Calcula multa de 20% sobre o valor proporcional restante
    const multa = valorProporcionalRestante * 0.20;

    // Arredonda para 2 casas decimais
    const valorMulta = Math.round(multa * 100) / 100;

    // Calcula ciclos restantes para compatibilidade com o retorno
    const diasPorCiclo = 30;
    const ciclosRestantes = Math.ceil(diasRestantes / diasPorCiclo);

    return {
        deveAplicar: true,
        valorMulta,
        diasFaltantes: diasRestantes,
        ciclosRestantes,
        motivo: `Multa proporcional calculada: ${diasUsados} dias usados, ${diasRestantes} dias restantes, valor restante R$ ${valorProporcionalRestante.toFixed(2)}, multa de 20% = R$ ${valorMulta.toFixed(2)}`,
        valorProporcionalRestante,
        valorTotalPlano,
        valorDiario,
        diasUsados,
        totalDiasPlano
    };
}
