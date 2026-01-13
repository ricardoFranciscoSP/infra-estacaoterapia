import { differenceInMonths } from "date-fns";

export type TipoMovimentacao = "cancelamento" | "downgrade" | "upgrade";

export function estaDentroDaPermanenciaMinima(
    dataInicio: Date,
    permanenciaMinimaMeses: number,
): boolean {
    const mesesPassados = differenceInMonths(new Date(), dataInicio);
    return mesesPassados < permanenciaMinimaMeses;
}

/**
 * Calcula multa para movimentação de planos (downgrade/upgrade)
 * Nota: Para cancelamento, use calcularMultaProporcional que considera dias faltantes dos ciclos
 * 
 * @param tipo - Tipo de movimentação (cancelamento, downgrade, upgrade)
 * @param estaDentro - Se está dentro do período de permanência mínima
 * @param valorPlanoAtual - Valor atual do plano
 * @returns Valor da multa calculada (0 se não houver multa)
 */
export function calcularMultaPlano(
    tipo: TipoMovimentacao,
    estaDentro: boolean,
    valorPlanoAtual: number
): number {
    // Upgrade nunca tem multa
    if (tipo === "upgrade") {
        return 0;
    }

    // Se está fora da permanência, nunca tem multa
    if (!estaDentro) {
        return 0;
    }

    // Se está dentro e não é upgrade → multa de 20%
    if (estaDentro && (tipo === "cancelamento" || tipo === "downgrade")) {
        return Math.round((valorPlanoAtual * 0.20) * 100) / 100;
    }

    return 0;
}
