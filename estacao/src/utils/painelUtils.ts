import { ConsultaApi } from '@/types/consultasTypes';
import { ProximasConsultas } from '@/types/psicologoTypes';
import { Futuras } from '@/types/consultasTypes';
import { obterProximaConsultaReservada } from '@/utils/consultasUtils';

export type NextConsulta = ConsultaApi | ProximasConsultas | null;

/**
 * Extrai a próxima consulta do objeto Futuras seguindo a ordem de prioridade:
 * 1. nextReservation (se for futura)
 * 2. Primeira consulta de consultaAtual.futuras (se for futura)
 * 3. Primeira consulta de futuras (raiz) (se for futura)
 * 
 * Agora filtra apenas consultas futuras (não retroativas) usando data e horário
 */
export function extractNextConsulta(consultasFuturas: Futuras | undefined): NextConsulta {
    if (!consultasFuturas) return null;

    // Se tiver nextReservation, verifica se é futura
    if (consultasFuturas.nextReservation) {
        const proxima = obterProximaConsultaReservada(
            consultasFuturas.nextReservation,
            null
        );
        if (proxima && proxima.Id === consultasFuturas.nextReservation.Id) {
            return consultasFuturas.nextReservation;
        }
    }

    // Verifica consultaAtual se existir
    const consultaAtual = consultasFuturas.consultaAtual?.consultaAtual;
    const futurasFromConsultaAtual = consultasFuturas.consultaAtual?.futuras;

    // Usa a função de filtro para encontrar a próxima consulta
    const proximaConsulta = obterProximaConsultaReservada(
        consultaAtual || null,
        futurasFromConsultaAtual || null
    );

    if (proximaConsulta) {
        // Busca primeiro em futurasFromConsultaAtual (consultas completas)
        if (futurasFromConsultaAtual) {
            const encontrada = futurasFromConsultaAtual.find(f => f.Id === proximaConsulta.Id);
            if (encontrada) return encontrada;
        }
        // Se não encontrou e a próxima consulta é a consultaAtual, 
        // não temos a consulta completa, então retorna null ou busca em futuras raiz
        // (consultaAtual é apenas { Id, Date, Time, Status }, não é ConsultaApi completo)
    }

    // Se não encontrou em consultaAtual, verifica futuras raiz
    if (consultasFuturas.futuras && consultasFuturas.futuras.length > 0) {
        const proximaFutura = obterProximaConsultaReservada(
            null,
            consultasFuturas.futuras
        );
        if (proximaFutura) {
            const encontrada = consultasFuturas.futuras.find(f => f.Id === proximaFutura.Id);
            if (encontrada) return encontrada;
        }
    }

    return null;
}

/**
 * Verifica se o cadastro do usuário está completo
 * Address pode ser boolean (do GetUserBasicService) ou array (do UserDetails)
 */
export function isCadastroCompleto(user: { Address?: boolean | Array<unknown> } | null | undefined): boolean {
    if (!user) return false;

    const hasAddress = user.Address === true ||
        (Array.isArray(user.Address) && user.Address.length > 0);

    return hasAddress;
}

/**
 * Obtém o draftId do localStorage de forma segura
 */
export function getDraftIdFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('draftId');
}

/**
 * Remove o draftId do localStorage de forma segura
 */
export function removeDraftIdFromStorage(): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('draftId');
    }
}

/**
 * Verifica se o usuário já comprou a primeira consulta
 */
export function hasPrimeiraConsulta(user: { FinanceiroEntries?: Record<string, unknown> | unknown[] | null } | null | undefined): boolean {
    if (!user?.FinanceiroEntries) {
        return false;
    }
    
    let resultado = false;
    
    // Se for um array
    if (Array.isArray(user.FinanceiroEntries)) {
        resultado = user.FinanceiroEntries.some((entry: { Tipo?: string } | unknown) => {
            if (entry && typeof entry === 'object' && 'Tipo' in entry) {
                const tipo = (entry as { Tipo?: string }).Tipo;
                return tipo === "PrimeiraConsulta" || tipo === "primeiraConsulta" || tipo?.toLowerCase() === "primeiraconsulta";
            }
            return false;
        });
    }
    // Se for um objeto Record
    else if (typeof user.FinanceiroEntries === 'object') {
        const entries = Object.values(user.FinanceiroEntries);
        resultado = entries.some((entry: { Tipo?: string } | unknown) => {
            if (entry && typeof entry === 'object' && 'Tipo' in entry) {
                const tipo = (entry as { Tipo?: string }).Tipo;
                return tipo === "PrimeiraConsulta" || tipo === "primeiraConsulta" || tipo?.toLowerCase() === "primeiraconsulta";
            }
            return false;
        });
    }
    
    console.log('[hasPrimeiraConsulta]', {
        resultado,
        temFinanceiroEntries: !!user?.FinanceiroEntries,
        tipoFinanceiroEntries: Array.isArray(user?.FinanceiroEntries) ? 'array' : typeof user?.FinanceiroEntries
    });
    
    return resultado;
}

/**
 * Verifica se o usuário tem consultas avulsas compradas
 */
export function hasConsultaAvulsa(user: { ConsultaAvulsa?: unknown[] } | null | undefined): boolean {
    if (!user?.ConsultaAvulsa) {
        return false;
    }
    
    if (Array.isArray(user.ConsultaAvulsa)) {
        return user.ConsultaAvulsa.length > 0;
    }
    
    return false;
}

/**
 * Verifica se o usuário já comprou consultas (primeira consulta ou consultas avulsas)
 */
export function hasCompradoConsultas(user: { FinanceiroEntries?: Record<string, unknown> | unknown[] | null; ConsultaAvulsa?: unknown[] } | null | undefined): boolean {
    return hasPrimeiraConsulta(user) || hasConsultaAvulsa(user);
}

/**
 * Verifica se o usuário comprou consulta promocional do tipo "unico"
 */
export function hasConsultaPromocionalUnico(user: { FinanceiroEntries?: Record<string, unknown> | unknown[] | null } | null | undefined): boolean {
    if (!user?.FinanceiroEntries) {
        return false;
    }
    
    // Se for um array
    if (Array.isArray(user.FinanceiroEntries)) {
        return user.FinanceiroEntries.some((entry: { Tipo?: string } | unknown) => {
            if (entry && typeof entry === 'object' && 'Tipo' in entry) {
                const tipo = (entry as { Tipo?: string }).Tipo;
                return tipo === "unico" || tipo === "Unico" || tipo?.toLowerCase() === "unico";
            }
            return false;
        });
    }
    
    // Se for um objeto Record
    if (typeof user.FinanceiroEntries === 'object') {
        const entries = Object.values(user.FinanceiroEntries);
        return entries.some((entry: { Tipo?: string } | unknown) => {
            if (entry && typeof entry === 'object' && 'Tipo' in entry) {
                const tipo = (entry as { Tipo?: string }).Tipo;
                return tipo === "unico" || tipo === "Unico" || tipo?.toLowerCase() === "unico";
            }
            return false;
        });
    }
    
    return false;
}

/**
 * Verifica se tem planos com tipo mensal, trimestral ou semestral
 * Aceita planos com qualquer status (Ativo, Cancelado, etc)
 */
export function temPlanosMensaisTrimestraisSemestrais(planos: Array<{ PlanoAssinatura?: { Tipo?: string } }> | null | undefined): boolean {
    if (!Array.isArray(planos) || planos.length === 0) {
        return false;
    }
    
    const temPlanos = planos.some((plano) => {
        const tipo = plano.PlanoAssinatura?.Tipo?.toLowerCase()?.trim();
        return tipo === "mensal" || tipo === "trimestral" || tipo === "semestral";
    });
    
    console.log('[temPlanosMensaisTrimestraisSemestrais]', {
        quantidadePlanos: planos.length,
        temPlanos,
        tiposEncontrados: planos.map((p) => p.PlanoAssinatura?.Tipo)
    });
    
    return temPlanos;
}

