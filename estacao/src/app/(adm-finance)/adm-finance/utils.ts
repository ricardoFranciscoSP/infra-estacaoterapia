/**
 * Utilitários compartilhados para adm-finance
 */

/**
 * Extrai iniciais de um nome
 */
export const getInitials = (name: string): string => {
    return name
        .split(" ")
        .map((n: string) => n.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

/**
 * Formata um valor numérico como moeda brasileira
 */
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

/**
 * Formata uma data string para formato brasileiro
 */
export const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("pt-BR");
};

/**
 * Traduz e padroniza labels de status
 */
export const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
        pendente: "Pendente",
        processando: "Processando",
        aprovado: "Aprovado",
        pago: "Pago",
        cancelado: "Cancelado",
        retido: "Retido",
        PagamentoEmAnalise: "Em Análise",
    };
    return statusMap[status] || status;
};

/**
 * Calcula a porcentagem
 */
export const calculatePercentage = (part: number, total: number): number => {
    return total > 0 ? Math.round((part / total) * 100) : 0;
};

/**
 * Valida se um componente é um React.ReactNode válido
 */
export const isValidReactNode = (node: React.ReactNode): boolean => {
    return node !== null && node !== undefined && node !== false;
};
