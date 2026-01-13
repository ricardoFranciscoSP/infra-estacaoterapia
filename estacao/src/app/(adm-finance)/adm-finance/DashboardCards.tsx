"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ModalPsicologosStatus } from "./ModalPsicologosStatus";
import type { CardConfig, PagamentoStatus } from "./types";
import { COLORS } from "./types";

interface CardComponentProps extends CardConfig {
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

const TrendArrow: React.FC<{ isPositive: boolean }> = ({ isPositive }) => (
  <svg
    className={`w-4 h-4 ${isPositive ? "" : "rotate-180"}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg
    className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform duration-200"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const LoadingSkeleton: React.FC = () => (
  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
);

const Card: React.FC<CardComponentProps> = ({
  label,
  value,
  subtitle,
  trend,
  icon,
  iconBg,
  iconColor,
  cardBg,
  borderColor,
  linkHref,
  onOpenModal,
  delay = 0,
  loading = false,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (onOpenModal) {
        e.preventDefault();
        onOpenModal();
      }
    },
    [onOpenModal]
  );

  const linkClassName = `flex items-center justify-between text-sm font-medium text-[${COLORS.primary}] group/link hover:text-[#6D75C0] transition-colors duration-200 pt-4 border-t border-[${COLORS.border}]`;

  const contentJsx = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative"
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl bg-white border-2 transition-all duration-300
          hover:shadow-xl hover:-translate-y-1
          ${borderColor}
          ${cardBg}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative p-4 sm:p-5 md:p-6">
          {/* Header do Card */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div
                  className={`${iconBg} ${iconColor} p-2 sm:p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#6C757D] uppercase tracking-wide truncate">
                    {label}
                  </h3>
                  {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">{subtitle}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Valor Principal */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-baseline gap-2 flex-wrap">
              {loading ? (
                <LoadingSkeleton />
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#23253a]">{value}</span>
                  {trend && (
                    <span
                      className={`text-sm font-semibold flex items-center gap-1 ${
                        trend.isPositive ? "text-[#4CAF50]" : "text-[#E57373]"
                      }`}
                    >
                      <TrendArrow isPositive={trend.isPositive} />
                      {Math.abs(trend.value)}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Link Ver Detalhes */}
          {linkHref ? (
            <Link href={linkHref} className={linkClassName}>
              <span>Ver detalhes</span>
              <ArrowIcon />
            </Link>
          ) : (
            <div onClick={handleClick} className={`${linkClassName} cursor-pointer`} role="button" tabIndex={0}>
              <span>Ver detalhes</span>
              <ArrowIcon />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return contentJsx;
};

interface DashboardCardsProps {
  psicologos: number;
  pagos: number;
  pendentes: number;
  reprovados: number;
  isLoading?: boolean;
}

interface CardData {
  label: string;
  value: number;
  subtitle: string;
  trend: {
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
  delay: number;
  loading: boolean;
}

const PsicologosIcon: React.FC = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CheckCircleIcon: React.FC = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
  </svg>
);

const XCircleIcon: React.FC = () => (
  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
  </svg>
);

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  psicologos,
  pagos,
  pendentes,
  reprovados,
  isLoading = false,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalStatus, setModalStatus] = React.useState<PagamentoStatus>("Pagos");

  const total = psicologos;
  const pagosPercent = total > 0 ? Math.round((pagos / total) * 100) : 0;
  const pendentesPercent = total > 0 ? Math.round((pendentes / total) * 100) : 0;
  const reprovadosPercent = total > 0 ? Math.round((reprovados / total) * 100) : 0;

  const handleOpenModal = useCallback((status: PagamentoStatus): void => {
    setModalStatus(status);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback((): void => {
    setModalOpen(false);
  }, []);

  const cardsData: CardData[] = [
    {
      label: "Psicólogos",
      value: psicologos,
      subtitle: "Total cadastrados",
      trend: { value: 5, isPositive: true },
      icon: <PsicologosIcon />,
      iconBg: "bg-[#E5E9FA]",
      iconColor: "text-[#8494E9]",
      cardBg: "hover:border-[#8494E9]/30",
      borderColor: "border-[#E5E9FA]",
      linkHref: "/adm-finance/psicologos",
      delay: 0,
      loading: isLoading,
    },
    {
      label: "Pagos",
      value: pagos,
      subtitle: `${pagosPercent}% do total`,
      trend: { value: 12, isPositive: true },
      icon: <CheckCircleIcon />,
      iconBg: "bg-[#E8F5E9]",
      iconColor: "text-[#4CAF50]",
      cardBg: "hover:border-[#4CAF50]/30",
      borderColor: "border-[#E8F5E9]",
      onOpenModal: () => handleOpenModal("Pagos"),
      delay: 0.1,
      loading: isLoading,
    },
    {
      label: "Pendentes",
      value: pendentes,
      subtitle: `${pendentesPercent}% do total`,
      trend: { value: 8, isPositive: false },
      icon: <ClockIcon />,
      iconBg: "bg-[#FFF9E6]",
      iconColor: "text-[#FFC107]",
      cardBg: "hover:border-[#FFC107]/30",
      borderColor: "border-[#FFF9E6]",
      onOpenModal: () => handleOpenModal("Pendentes"),
      delay: 0.2,
      loading: isLoading,
    },
    {
      label: "Reprovados",
      value: reprovados,
      subtitle: `${reprovadosPercent}% do total`,
      trend: { value: 3, isPositive: false },
      icon: <XCircleIcon />,
      iconBg: "bg-[#FDEAEA]",
      iconColor: "text-[#E57373]",
      cardBg: "hover:border-[#E57373]/30",
      borderColor: "border-[#FDEAEA]",
      onOpenModal: () => handleOpenModal("Reprovados"),
      delay: 0.3,
      loading: isLoading,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-4 sm:mt-6">
        {cardsData.map((cardData) => (
          <Card key={cardData.label} {...cardData} />
        ))}
      </div>

      {/* Modal de Psicólogos por Status */}
      <ModalPsicologosStatus open={modalOpen} onClose={handleCloseModal} status={modalStatus} />
    </>
  );
};
