/**
 * Tipos de solicitações financeiras
 * Este arquivo centraliza todos os tipos de solicitações relacionadas ao departamento financeiro
 */

export const TIPOS_SOLICITACAO_FINANCEIRO: { value: string; label: string }[] = [
    { value: "Atraso no Recebimento do Pagamento", label: "Atraso no Recebimento do Pagamento" },
    { value: "Cobrança após cancelamento do plano", label: "Cobrança após cancelamento do plano" },
    { value: "Cobrança de Multa Indevida", label: "Cobrança de Multa Indevida" },
    { value: "Cobrança Recorrente no Cartão de Crédito", label: "Cobrança Recorrente no Cartão de Crédito" },
    { value: "Compra Efetuada - Saldo Não Creditada", label: "Compra Efetuada - Saldo Não Creditada" },
    { value: "Contestação de dedução contratual por cancelamento", label: "Contestação de dedução contratual por cancelamento" },
    { value: "Contestação de Perda de Prazo para Solicitação de Saque", label: "Contestação de Perda de Prazo para Solicitação de Saque" },
    { value: "Dúvida sobre percentual de repasse contratual", label: "Dúvida sobre percentual de repasse contratual" },
    { value: "Erro na exibição do extrato financeiro (inconsistência)", label: "Erro na exibição do extrato financeiro (inconsistência)" },
    { value: "Não recebi o valor integral correspondente às sessões", label: "Não recebi o valor integral correspondente às sessões" },
    { value: "Necessidade de documento fiscal (NF/recibo)", label: "Necessidade de documento fiscal (NF/recibo)" },
    { value: "Problema ao solicitar saque", label: "Problema ao solicitar saque" },
    { value: "Problemas na Transação do Pix", label: "Problemas na Transação do Pix" },
    { value: "Reembolso de pagamentos (funcionalidade ausente)", label: "Reembolso de pagamentos (funcionalidade ausente)" },
    { value: "Sugestão de novas integrações de pagamento", label: "Sugestão de novas integrações de pagamento" },
    { value: "Transação de compra não efetuada", label: "Transação de compra não efetuada" },
    { value: "Valor Cobrado Desconhecido", label: "Valor Cobrado Desconhecido" },
    { value: "Valor Cobrado em Duplicidade", label: "Valor Cobrado em Duplicidade" },
    { value: "Valor desconhecido na fatura", label: "Valor desconhecido na fatura" },
    { value: "Solicitação de Descredenciamento Voluntário", label: "Solicitação de Descredenciamento Voluntário" },
    { value: "Apresentação de Defesa de Não Conformidade", label: "Apresentação de Defesa de Não Conformidade" },
    { value: "Apresentação de Recurso de Não Conformidade", label: "Apresentação de Recurso de Não Conformidade" },
    { value: "Contestação por Erro Material Pós-Pagamento", label: "Contestação por Erro Material Pós-Pagamento" },
    { value: "Contestação de Apuração - Estação Valoriza", label: "Contestação de Apuração - Estação Valoriza" },
];

/**
 * Lista simplificada dos valores dos tipos financeiros
 */
export const TIPOS_FINANCEIROS_VALUES = TIPOS_SOLICITACAO_FINANCEIRO.map(t => t.value);

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
export function isTipoFinanceiro(tipo: string | null | undefined): boolean {
    if (!tipo) return false;

    const tipoLower = tipo.toLowerCase();

    // Verifica se o tipo está na lista de tipos específicos
    const isInList = TIPOS_FINANCEIROS_VALUES.some(tipoFinanceiro =>
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
