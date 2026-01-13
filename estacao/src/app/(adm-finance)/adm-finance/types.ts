// Tipos compartilhados para adm-finance
export type PsicologoTipo = "Autônomo" | "Pessoa Jurídica";
export type PagamentoStatus = "Pagos" | "Pendentes" | "Reprovados";

export interface Psicologo {
    id: string;
    nome: string;
    crp: string;
    dataCadastro: string;
    valor: number;
    consultas: number;
    tipo: PsicologoTipo;
}

export interface CardConfig {
    label: string;
    value: number;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    cardBg: string;
    borderColor: string;
    linkHref?: string;
    onOpenModal?: () => void;
    delay?: number;
    loading?: boolean;
}

export interface ModalConfig {
    title: string;
    badgeBg: string;
    badgeText: string;
}

export const STATUS_CONFIG: Record<PagamentoStatus, ModalConfig> = {
    Pagos: {
        title: "Psicólogos Pagos - Último Mês",
        badgeBg: "bg-[#E8F5E9]",
        badgeText: "text-[#4CAF50]",
    },
    Pendentes: {
        title: "Psicólogos Pendentes",
        badgeBg: "bg-[#FFF9E6]",
        badgeText: "text-[#FFC107]",
    },
    Reprovados: {
        title: "Psicólogos Reprovados",
        badgeBg: "bg-[#FDEAEA]",
        badgeText: "text-[#E57373]",
    },
};

export const COLORS = {
    primary: "#8494E9",
    success: "#4CAF50",
    warning: "#FFC107",
    danger: "#E57373",
    light: "#F8F9FA",
    border: "#E5E9FA",
    text: "#23253a",
    textSecondary: "#6C757D",
    textMuted: "#9CA3AF",
} as const;

export const PAGINATION_ITEMS_PER_PAGE = 20;
