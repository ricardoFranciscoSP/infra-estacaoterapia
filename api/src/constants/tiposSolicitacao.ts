/**
 * Tipos de solicitações financeiras
 * Este arquivo centraliza todos os tipos de solicitações relacionadas ao departamento financeiro
 */

export const TIPOS_SOLICITACAO_FINANCEIRO = [
    "Atraso no Recebimento do Pagamento",
    "Cobrança após cancelamento do plano",
    "Cobrança de Multa Indevida",
    "Cobrança Recorrente no Cartão de Crédito",
    "Compra Efetuada - Saldo Não Creditada",
    "Contestação de dedução contratual por cancelamento",
    "Contestação de Perda de Prazo para Solicitação de Saque",
    "Dúvida sobre percentual de repasse contratual",
    "Erro na exibição do extrato financeiro (inconsistência)",
    "Não recebi o valor integral correspondente às sessões",
    "Necessidade de documento fiscal (NF/recibo)",
    "Problema ao solicitar saque",
    "Problemas na Transação do Pix",
    "Reembolso de pagamentos (funcionalidade ausente)",
    "Sugestão de novas integrações de pagamento",
    "Transação de compra não efetuada",
    "Valor Cobrado Desconhecido",
    "Valor Cobrado em Duplicidade",
    "Valor desconhecido na fatura",
    "Solicitação de Descredenciamento Voluntário",
    "Apresentação de Defesa de Não Conformidade",
    "Apresentação de Recurso de Não Conformidade",
    "Contestação por Erro Material Pós-Pagamento",
    "Contestação de Apuração - Estação Valoriza",
    "Saque",
    "cancelamento-plano",
    "Financeiro",
];

/**
 * Palavras-chave que identificam solicitações financeiras
 */
export const KEYWORDS_FINANCEIROS = [
    'pagamento', 'pagamentos',
    'saque', 'saques',
    'cobrança', 'cobranca', 'cobrar',
    'multa', 'multas',
    'reembolso', 'reembolsos',
    'fatura', 'faturas',
    'financeiro', 'financeira',
    'extrato', 'extratos',
    'cartão', 'cartao', 'credito', 'crédito',
    'pix', 'transação', 'transacao',
    'valor', 'valores',
    'desconto', 'descontos',
    'repasse', 'repasses',
    'cancelamento-plano', 'cancelamento plano',
    'descredenciamento',
    'não conformidade', 'nao conformidade',
    'recurso',
    'contestação', 'contestacao',
    'apuração', 'apuracao',
    'estação valoriza', 'estacao valoriza',
    'erro material',
    'pós-pagamento', 'pos-pagamento',
];

/**
 * Verifica se um tipo de solicitação é financeiro
 */
export function isSolicitacaoFinanceira(tipo: string | null | undefined): boolean {
    if (!tipo) return false;

    const tipoLower = tipo.toLowerCase();

    // Verifica se o tipo está na lista de tipos específicos
    const isInList = TIPOS_SOLICITACAO_FINANCEIRO.some(tipoFinanceiro =>
        tipoLower === tipoFinanceiro.toLowerCase() ||
        tipoLower.includes(tipoFinanceiro.toLowerCase()) ||
        tipoFinanceiro.toLowerCase().includes(tipoLower)
    );

    if (isInList) return true;

    // Verifica se contém alguma palavra-chave financeira
    return KEYWORDS_FINANCEIROS.some(keyword =>
        tipoLower.includes(keyword.toLowerCase())
    );
}
