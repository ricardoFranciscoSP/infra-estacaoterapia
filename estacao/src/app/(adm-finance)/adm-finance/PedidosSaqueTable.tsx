"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdmFinanceStore } from "@/store/admFinanceStore";
import type { FinanceiroPsicologo } from "@/types/admFinanceTypes";
import { getInitials, formatCurrency, formatDate, getStatusLabel } from "./utils";

interface PedidoFormatado {
  id: string;
  userId: string;
  nome: string;
  dataPedido: string;
  valor: number;
  numeroConsultas: number;
  status: string;
  statusOriginal: string;
}

interface StatusConfig {
  bg: string;
  text: string;
}

const EyeIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const STATUS_CLASSES: Record<string, StatusConfig> = {
  Pendente: { bg: "bg-[#FFF9E6]", text: "text-[#FFC107]" },
  Aprovado: { bg: "bg-[#E8F5E9]", text: "text-[#4CAF50]" },
  Reprovado: { bg: "bg-[#FDEAEA]", text: "text-[#E57373]" },
  Processado: { bg: "bg-[#E5E9FA]", text: "text-[#8494E9]" },
};

const getStatusConfig = (status: string): StatusConfig => {
  return STATUS_CLASSES[status] || STATUS_CLASSES.Pendente;
};

interface PedidoRowProps {
  pedido: PedidoFormatado;
  index: number;
  statusConfig: StatusConfig;
}

const DesktopPedidoRow: React.FC<PedidoRowProps> = ({ pedido, index, statusConfig }) => (
  <motion.tr
    key={pedido.id}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05 }}
    className="hover:bg-[#F8F9FA] transition-colors"
  >
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#8494E9]/10 flex items-center justify-center text-[#8494E9] font-semibold text-xs sm:text-sm flex-shrink-0">
          {getInitials(pedido.nome)}
        </div>
        <span className="font-medium text-gray-800 text-sm sm:text-base truncate">{pedido.nome}</span>
      </div>
    </td>
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
      {pedido.dataPedido}
    </td>
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
      <span className="font-semibold text-[#23253a] text-sm sm:text-base">{formatCurrency(pedido.valor)}</span>
    </td>
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">
      <span className="font-medium">{pedido.numeroConsultas}</span>
    </td>
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 whitespace-nowrap">
      <span
        className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}
      >
        {pedido.status}
      </span>
    </td>
    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <Link
          href={`/adm-finance/psicologo/${pedido.userId}`}
          className="p-1.5 sm:p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all hover:scale-110"
          title="Visualizar"
        >
          <EyeIcon />
        </Link>
      </div>
    </td>
  </motion.tr>
);

const MobilePedidoCard: React.FC<PedidoRowProps> = ({ pedido, index, statusConfig }) => (
  <motion.div
    key={pedido.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="p-3 sm:p-4 space-y-3"
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-[#8494E9]/10 flex items-center justify-center text-[#8494E9] font-semibold text-sm flex-shrink-0">
          {getInitials(pedido.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">{pedido.nome}</p>
          <p className="text-xs text-gray-500 mt-0.5">{pedido.dataPedido}</p>
        </div>
      </div>
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} flex-shrink-0 ml-2`}
      >
        {pedido.status}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Valor</p>
        <p className="font-semibold text-[#23253a]">{formatCurrency(pedido.valor)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Consultas</p>
        <p className="font-medium text-gray-700">{pedido.numeroConsultas}</p>
      </div>
    </div>
    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E9FA]">
      <Link
        href={`/adm-finance/psicologo/${pedido.userId}`}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
      >
        <EyeIcon />
        <span>Ver</span>
      </Link>
    </div>
  </motion.div>
);

interface DesktopTableProps {
  pedidosFormatados: PedidoFormatado[];
  isLoading: boolean;
}

const DesktopTable: React.FC<DesktopTableProps> = ({ pedidosFormatados, isLoading }) => (
  <div className="hidden md:block overflow-x-auto -mx-3 sm:mx-0">
    <table className="w-full min-w-[800px]">
      <thead className="bg-[#F8F9FA]">
        <tr>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Nome
          </th>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Data do Pedido
          </th>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Valor
          </th>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Consultas
          </th>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Status
          </th>
          <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
            Ações
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E5E9FA]">
        {isLoading ? (
          <tr>
            <td colSpan={6} className="py-12 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-500 text-sm">Carregando pedidos...</span>
              </div>
            </td>
          </tr>
        ) : pedidosFormatados.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-12 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-gray-400 text-4xl">💳</span>
                <span className="text-gray-500 font-medium">Nenhum pedido de saque encontrado</span>
                <span className="text-gray-400 text-sm">Os pedidos aparecerão aqui quando houver solicitações</span>
              </div>
            </td>
          </tr>
        ) : (
          pedidosFormatados.map((pedido, index) => {
            const statusConfig = getStatusConfig(pedido.status);
            return <DesktopPedidoRow key={pedido.id} pedido={pedido} index={index} statusConfig={statusConfig} />;
          })
        )}
      </tbody>
    </table>
  </div>
);

interface MobileTableProps {
  pedidosFormatados: PedidoFormatado[];
  isLoading: boolean;
}

const MobileTable: React.FC<MobileTableProps> = ({ pedidosFormatados, isLoading }) => (
  <div className="md:hidden divide-y divide-[#E5E9FA] px-3 sm:px-4">
    {isLoading ? (
      <div className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500 text-sm">Carregando pedidos...</span>
        </div>
      </div>
    ) : pedidosFormatados.length === 0 ? (
      <div className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-gray-400 text-4xl">💳</span>
          <span className="text-gray-500 font-medium">Nenhum pedido de saque encontrado</span>
        </div>
      </div>
    ) : (
      pedidosFormatados.map((pedido, index) => {
        const statusConfig = getStatusConfig(pedido.status);
        return <MobilePedidoCard key={pedido.id} pedido={pedido} index={index} statusConfig={statusConfig} />;
      })
    )}
  </div>
);

interface PedidosSaqueTableMainProps {
  pedidos?: FinanceiroPsicologo[];
  isLoading?: boolean;
}

export const PedidosSaqueTable: React.FC<PedidosSaqueTableMainProps> = ({
  pedidos: pedidosProp,
  isLoading: isLoadingProp,
}) => {
  const { pagamentosPsicologos, isLoadingPagamentosPsicologos, fetchPagamentosPsicologos } = useAdmFinanceStore();

  useEffect(() => {
    void fetchPagamentosPsicologos({
      status: undefined,
      page: 1,
      pageSize: 10,
    });
  }, [fetchPagamentosPsicologos]);

  const pedidosPendentes = useMemo(
    (): FinanceiroPsicologo[] =>
      pagamentosPsicologos
        .filter((p) => p.Status === "pendente" || p.Status === "processando")
        .slice(0, 10),
    [pagamentosPsicologos]
  );

  const pedidos = pedidosProp || pedidosPendentes;
  const isLoading = isLoadingProp ?? isLoadingPagamentosPsicologos;

  const pedidosFormatados = useMemo((): PedidoFormatado[] => {
    return pedidos.map((p) => ({
      id: p.Id,
      userId: p.UserId,
      nome: p.User?.Nome || "N/A",
      dataPedido: formatDate(p.CreatedAt),
      valor: p.Valor,
      numeroConsultas: p.ConsultasRealizadas || 0,
      status: getStatusLabel(p.Status),
      statusOriginal: p.Status,
    }));
  }, [pedidos]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="mt-8 bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
    >
      {/* Header da Tabela */}
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-[#E5E9FA] bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-[#8494E9]/10 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#23253a]">Pedidos de Saque</h2>
          </div>
          <Link
            href="/adm-finance/financeiro"
            className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#8494E9] hover:text-[#6D75C0] transition-colors whitespace-nowrap"
          >
            Ver todos
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Tabelas */}
      <DesktopTable pedidosFormatados={pedidosFormatados} isLoading={isLoading} />
      <MobileTable pedidosFormatados={pedidosFormatados} isLoading={isLoading} />
    </motion.div>
  );
};
