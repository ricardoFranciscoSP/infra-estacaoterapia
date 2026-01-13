/**
 * Extrai o primeiro e último nome de um nome completo
 * @param nomeCompleto - Nome completo da pessoa
 * @returns String com primeiro e último nome, ou nome original se não puder ser processado
 */
export function obterPrimeiroUltimoNome(nomeCompleto: string | undefined | null): string {
    if (!nomeCompleto) return "";

    const nomes = nomeCompleto.trim().split(/\s+/).filter(nome => nome.length > 0);

    if (nomes.length === 0) return "";
    if (nomes.length === 1) return nomes[0];
    if (nomes.length === 2) return `${nomes[0]} ${nomes[1]}`;

    // Para 3 ou mais nomes, retorna primeiro e último
    return `${nomes[0]} ${nomes[nomes.length - 1]}`;
}