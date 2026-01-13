"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAdmFinanceStore } from "@/store/admFinanceStore";
import { motion } from "framer-motion";
import Link from "next/link";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function PsicologosPage() {
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    psicologos,
    isLoadingPsicologos,
    fetchPsicologos,
    paginacaoListaPsicologos,
  } = useAdmFinanceStore();

  useEffect(() => {
    fetchPsicologos({
      status: filtroStatus || undefined,
      page,
      pageSize,
    });
  }, [filtroStatus, page, fetchPsicologos]);

  const psicologosFiltrados = useMemo(() => {
    if (!busca) return psicologos;
    const buscaLower = busca.toLowerCase();
    return psicologos.filter(
      (p) =>
        p.Nome.toLowerCase().includes(buscaLower) ||
        p.Email.toLowerCase().includes(buscaLower) ||
        (p.CRP && p.CRP.toLowerCase().includes(buscaLower))
    );
  }, [psicologos, busca]);

  const estatisticas = useMemo(() => {
    return {
      total: psicologosFiltrados.length,
      comSaldo: psicologosFiltrados.filter((p) => p.SaldoDisponivel > 0).length,
      comPendencia: psicologosFiltrados.filter((p) => p.TotalPendente > 0).length,
      totalSaldo: psicologosFiltrados.reduce((sum, p) => sum + p.SaldoDisponivel, 0),
    };
  }, [psicologosFiltrados]);

  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#23253a] mb-2">Psicólogos Ativos</h1>
        <p className="text-sm sm:text-base text-[#6C757D]">Visualize e gerencie informações financeiras dos psicólogos.</p>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4">
          <p className="text-xs text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-[#23253a]">{estatisticas.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4">
          <p className="text-xs text-gray-600 mb-1">Com Saldo</p>
          <p className="text-2xl font-bold text-[#4CAF50]">{estatisticas.comSaldo}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4">
          <p className="text-xs text-gray-600 mb-1">Com Pendência</p>
          <p className="text-2xl font-bold text-[#FFC107]">{estatisticas.comPendencia}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4">
          <p className="text-xs text-gray-600 mb-1">Saldo Total</p>
          <p className="text-2xl font-bold text-[#8494E9]">{formatCurrency(estatisticas.totalSaldo)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, email ou CRP..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            />
          </div>
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
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Pendente">Pendente</option>
              <option value="Bloqueado">Bloqueado</option>
              <option value="EmAnalise">Em Análise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden">
        {isLoadingPsicologos ? (
          <div className="p-12 text-center">
            <div className="inline-block w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Carregando...</p>
          </div>
        ) : psicologosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Nenhum psicólogo encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Psicólogo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Saldo Disponível</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Total Pago</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Pendente</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#8494E9] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9FA]">
                  {psicologosFiltrados.map((psicologo, index) => (
                    <motion.tr
                      key={psicologo.Id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-[#F8F9FA] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{psicologo.Nome}</p>
                          <p className="text-xs text-gray-500">{psicologo.Email}</p>
                          {psicologo.CRP && (
                            <p className="text-xs text-gray-400 font-mono">{psicologo.CRP}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal ${
                          psicologo.TipoPessoa === "Autônomo" 
                            ? "bg-[#8494E9]/8 text-[#8494E9]" 
                            : "bg-amber-50 text-amber-600"
                        }`}>
                          {psicologo.TipoPessoa}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[#4CAF50]">{formatCurrency(psicologo.SaldoDisponivel)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{formatCurrency(psicologo.TotalPago)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {psicologo.TotalPendente > 0 ? (
                          <span className="font-semibold text-[#FFC107]">{formatCurrency(psicologo.TotalPendente)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/adm-finance/psicologo/${psicologo.Id}`}
                            className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all hover:scale-110"
                            title="Visualizar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#E5E9FA]">
              {psicologosFiltrados.map((psicologo, index) => (
                <motion.div
                  key={psicologo.Id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 space-y-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{psicologo.Nome}</p>
                    <p className="text-xs text-gray-500 truncate">{psicologo.Email}</p>
                    {psicologo.CRP && (
                      <p className="text-xs text-gray-400 font-mono">{psicologo.CRP}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Saldo Disponível</p>
                      <p className="font-semibold text-[#4CAF50]">{formatCurrency(psicologo.SaldoDisponivel)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Total Pago</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(psicologo.TotalPago)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Pendente</p>
                      <p className={`font-semibold ${psicologo.TotalPendente > 0 ? 'text-[#FFC107]' : 'text-gray-400'}`}>
                        {psicologo.TotalPendente > 0 ? formatCurrency(psicologo.TotalPendente) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Tipo</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal ${
                        psicologo.TipoPessoa === "Autônomo" 
                          ? "bg-[#8494E9]/8 text-[#8494E9]" 
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {psicologo.TipoPessoa}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-[#E5E9FA]">
                    <Link
                      href={`/adm-finance/psicologo/${psicologo.Id}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Ver Detalhes</span>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {paginacaoListaPsicologos.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#E5E9FA] flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Página {paginacaoListaPsicologos.page} de {paginacaoListaPsicologos.totalPages} ({paginacaoListaPsicologos.total} registros)
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
                    onClick={() => setPage((p) => Math.min(paginacaoListaPsicologos.totalPages, p + 1))}
                    disabled={page === paginacaoListaPsicologos.totalPages}
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
