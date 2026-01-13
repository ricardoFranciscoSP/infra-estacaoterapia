"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAdmFinanceStore } from "@/store/admFinanceStore";
import { motion } from "framer-motion";
import { FinanceiroPsicologo, Financeiro } from "@/types/admFinanceTypes";

type TabType = "entradas" | "repasses" | "pendentes";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    Aprovado: { bg: "bg-[#E8F5E9]", text: "text-[#4CAF50]" },
    AguardandoPagamento: { bg: "bg-[#FFF9E6]", text: "text-[#FFC107]" },
    Reprovado: { bg: "bg-[#FDEAEA]", text: "text-[#E57373]" },
    Cancelado: { bg: "bg-[#FDEAEA]", text: "text-[#E57373]" },
    pago: { bg: "bg-[#E8F5E9]", text: "text-[#4CAF50]" },
    pendente: { bg: "bg-[#FFF9E6]", text: "text-[#FFC107]" },
    processando: { bg: "bg-[#E5E9FA]", text: "text-[#8494E9]" },
    aprovado: { bg: "bg-[#E8F5E9]", text: "text-[#4CAF50]" },
    cancelado: { bg: "bg-[#FDEAEA]", text: "text-[#E57373]" },
  };

  const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {status}
    </span>
  );
};

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<TabType>("entradas");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    pagamentosPacientes,
    pagamentosPsicologos,
    isLoadingPagamentosPacientes,
    isLoadingPagamentosPsicologos,
    fetchPagamentosPacientes,
    fetchPagamentosPsicologos,
    paginacaoPacientes,
    paginacaoPsicologos,
  } = useAdmFinanceStore();

  useEffect(() => {
    const filtros = {
      status: filtroStatus || undefined,
      dataInicio: filtroDataInicio || undefined,
      dataFim: filtroDataFim || undefined,
      page,
      pageSize,
    };

    if (activeTab === "entradas") {
      fetchPagamentosPacientes(filtros);
    } else if (activeTab === "repasses" || activeTab === "pendentes") {
      const statusFilter = activeTab === "pendentes" ? "pendente" : undefined;
      fetchPagamentosPsicologos({
        ...filtros,
        status: statusFilter || filtroStatus || undefined,
      });
    }
  }, [activeTab, filtroStatus, filtroDataInicio, filtroDataFim, page, fetchPagamentosPacientes, fetchPagamentosPsicologos]);

  const dadosFiltrados = useMemo(() => {
    if (activeTab === "entradas") {
      return pagamentosPacientes;
    } else if (activeTab === "repasses") {
      return pagamentosPsicologos.filter((p) => p.Status === "pago" || p.Status === "aprovado");
    } else {
      return pagamentosPsicologos.filter((p) => p.Status === "pendente" || p.Status === "processando");
    }
  }, [activeTab, pagamentosPacientes, pagamentosPsicologos]);

  const totalGeral = useMemo(() => {
    return dadosFiltrados.reduce((sum, item) => {
      if (activeTab === "entradas") {
        return sum + (item as Financeiro).Valor;
      } else {
        return sum + (item as FinanceiroPsicologo).Valor;
      }
    }, 0);
  }, [dadosFiltrados, activeTab]);

  const paginacaoAtual = activeTab === "entradas" ? paginacaoPacientes : paginacaoPsicologos;
  const isLoading = activeTab === "entradas" ? isLoadingPagamentosPacientes : isLoadingPagamentosPsicologos;

  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#23253a] mb-2">Financeiro Geral</h1>
        <p className="text-sm sm:text-base text-[#6C757D]">Gerencie entradas, repasses e pendências financeiras.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-[#E5E9FA]">
        <div className="flex flex-wrap gap-2">
          {(["entradas", "repasses", "pendentes"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-[#8494E9] text-[#8494E9]"
                  : "border-transparent text-[#6C757D] hover:text-[#8494E9]"
              }`}
            >
              {tab === "entradas" ? "Entradas" : tab === "repasses" ? "Repasses" : "Pendências"}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros e Resumo */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => {
                setFiltroStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            >
              <option value="">Todos</option>
              {activeTab === "entradas" ? (
                <>
                  <option value="Aprovado">Aprovado</option>
                  <option value="AguardandoPagamento">Aguardando Pagamento</option>
                  <option value="Reprovado">Reprovado</option>
                  <option value="Cancelado">Cancelado</option>
                </>
              ) : (
                <>
                  <option value="pago">Pago</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="pendente">Pendente</option>
                  <option value="processando">Processando</option>
                  <option value="cancelado">Cancelado</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => {
                setFiltroDataInicio(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => {
                setFiltroDataFim(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            />
          </div>
          <div className="flex items-end">
            <div className="w-full bg-[#F8F9FA] rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Total {activeTab === "entradas" ? "Entradas" : activeTab === "repasses" ? "Repasses" : "Pendências"}</p>
              <p className="text-lg font-bold text-[#23253a]">{formatCurrency(totalGeral)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Carregando...</p>
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    {activeTab === "entradas" ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Paciente</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Plano</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Vencimento</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Status</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Psicólogo</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Período</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Vencimento</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9FA]">
                  {dadosFiltrados.map((item, index) => (
                    <motion.tr
                      key={activeTab === "entradas" ? (item as Financeiro).Id : (item as FinanceiroPsicologo).Id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-[#F8F9FA] transition-colors"
                    >
                      {activeTab === "entradas" ? (
                        <>
                          <td className="px-6 py-4 text-sm">{(item as Financeiro).User?.Nome || "N/A"}</td>
                          <td className="px-6 py-4 text-sm">{(item as Financeiro).PlanoAssinatura?.Nome || "N/A"}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{formatCurrency((item as Financeiro).Valor)}</td>
                          <td className="px-6 py-4 text-sm">{formatDate((item as Financeiro).DataVencimento)}</td>
                          <td className="px-6 py-4">{getStatusBadge((item as Financeiro).Status)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-sm">{(item as FinanceiroPsicologo).User?.Nome || "N/A"}</td>
                          <td className="px-6 py-4 text-sm">{(item as FinanceiroPsicologo).Periodo || "N/A"}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{formatCurrency((item as FinanceiroPsicologo).Valor)}</td>
                          <td className="px-6 py-4 text-sm">{formatDate((item as FinanceiroPsicologo).DataVencimento)}</td>
                          <td className="px-6 py-4">{getStatusBadge((item as FinanceiroPsicologo).Status)}</td>
                        </>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#E5E9FA]">
              {dadosFiltrados.map((item, index) => (
                <motion.div
                  key={activeTab === "entradas" ? (item as Financeiro).Id : (item as FinanceiroPsicologo).Id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 space-y-2"
                >
                  {activeTab === "entradas" ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{(item as Financeiro).User?.Nome || "N/A"}</p>
                          <p className="text-sm text-gray-500">{(item as Financeiro).PlanoAssinatura?.Nome || "N/A"}</p>
                        </div>
                        {getStatusBadge((item as Financeiro).Status)}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Valor:</span>
                        <span className="font-semibold">{formatCurrency((item as Financeiro).Valor)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Vencimento:</span>
                        <span>{formatDate((item as Financeiro).DataVencimento)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{(item as FinanceiroPsicologo).User?.Nome || "N/A"}</p>
                          <p className="text-sm text-gray-500">{(item as FinanceiroPsicologo).Periodo || "N/A"}</p>
                        </div>
                        {getStatusBadge((item as FinanceiroPsicologo).Status)}
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Valor:</span>
                        <span className="font-semibold">{formatCurrency((item as FinanceiroPsicologo).Valor)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Vencimento:</span>
                        <span>{formatDate((item as FinanceiroPsicologo).DataVencimento)}</span>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {paginacaoAtual.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#E5E9FA] flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Página {paginacaoAtual.page} de {paginacaoAtual.totalPages} ({paginacaoAtual.total} registros)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-[#8494E9] border border-[#8494E9] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8494E9] hover:text-white transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(paginacaoAtual.totalPages, p + 1))}
                    disabled={page === paginacaoAtual.totalPages}
                    className="px-4 py-2 text-sm font-medium text-[#8494E9] border border-[#8494E9] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8494E9] hover:text-white transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
