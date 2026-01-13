"use client";

import React, { useEffect, useState } from "react";
import { useAdmFinanceStore } from "@/store/admFinanceStore";
import { motion } from "framer-motion";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

export default function RelatoriosPage() {
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [psicologoId, setPsicologoId] = useState<string>("");
  const { relatorio, fetchRelatorio, isLoadingRelatorio, psicologos, fetchPsicologos } = useAdmFinanceStore();

  useEffect(() => {
    fetchPsicologos({ pageSize: 1000 });
  }, [fetchPsicologos]);

  const handleGerarRelatorio = () => {
    fetchRelatorio({
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      psicologoId: psicologoId || undefined,
    });
  };

  // Definir datas padrão (últimos 30 dias)
  useEffect(() => {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    setDataFim(hoje.toISOString().split("T")[0]);
    setDataInicio(trintaDiasAtras.toISOString().split("T")[0]);
  }, []);

  // Gerar relatório automaticamente ao carregar
  useEffect(() => {
    if (dataInicio && dataFim) {
      handleGerarRelatorio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#23253a] mb-2">Relatórios Financeiros</h1>
        <p className="text-sm sm:text-base text-[#6C757D]">Gere relatórios detalhados sobre a situação financeira.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#23253a] mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Psicólogo (Opcional)</label>
            <select
              value={psicologoId}
              onChange={(e) => setPsicologoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
            >
              <option value="">Todos</option>
              {psicologos.map((p) => (
                <option key={p.Id} value={p.Id}>
                  {p.Nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleGerarRelatorio}
          disabled={isLoadingRelatorio || !dataInicio || !dataFim}
          className="px-6 py-2 bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoadingRelatorio ? "Gerando..." : "Gerar Relatório"}
        </button>
      </div>

      {/* Relatório */}
      {isLoadingRelatorio ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-12 text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">Gerando relatório...</p>
        </div>
      ) : relatorio ? (
        <div className="space-y-6">
          {/* Resumo Geral */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-[#23253a] mb-4">Resumo Geral</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#F8F9FA] rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Entradas</p>
                <p className="text-xl font-bold text-[#23253a]">{formatCurrency(relatorio.resumo.totalEntradas)}</p>
              </div>
              <div className="bg-[#F8F9FA] rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Saídas</p>
                <p className="text-xl font-bold text-[#23253a]">{formatCurrency(relatorio.resumo.totalSaidas)}</p>
              </div>
              <div className="bg-[#F8F9FA] rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Repasses</p>
                <p className="text-xl font-bold text-[#23253a]">{formatCurrency(relatorio.resumo.totalRepasses)}</p>
              </div>
              <div className="bg-[#F8F9FA] rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Saldo Líquido</p>
                <p className={`text-xl font-bold ${relatorio.resumo.saldoLiquido >= 0 ? 'text-[#4CAF50]' : 'text-[#E57373]'}`}>
                  {formatCurrency(relatorio.resumo.saldoLiquido)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5E9FA]">
              <p className="text-sm text-gray-600">
                Período: {formatDate(relatorio.periodo.inicio)} até {formatDate(relatorio.periodo.fim)}
              </p>
            </div>
          </motion.div>

          {/* Por Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6"
          >
            <h2 className="text-lg font-semibold text-[#23253a] mb-4">Por Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#E8F5E9] rounded-lg p-4">
                <p className="text-xs text-[#4CAF50] mb-1">Aprovados</p>
                <p className="text-xl font-bold text-[#4CAF50]">{relatorio.porStatus.aprovado}</p>
              </div>
              <div className="bg-[#FFF9E6] rounded-lg p-4">
                <p className="text-xs text-[#FFC107] mb-1">Pendentes</p>
                <p className="text-xl font-bold text-[#FFC107]">{relatorio.porStatus.pendente}</p>
              </div>
              <div className="bg-[#FDEAEA] rounded-lg p-4">
                <p className="text-xs text-[#E57373] mb-1">Reprovados</p>
                <p className="text-xl font-bold text-[#E57373]">{relatorio.porStatus.reprovado}</p>
              </div>
              <div className="bg-[#E5E9FA] rounded-lg p-4">
                <p className="text-xs text-[#8494E9] mb-1">Processando</p>
                <p className="text-xl font-bold text-[#8494E9]">{relatorio.porStatus.processando}</p>
              </div>
            </div>
          </motion.div>

          {/* Por Psicólogo */}
          {relatorio.porPsicologo.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6"
            >
              <h2 className="text-lg font-semibold text-[#23253a] mb-4">Por Psicólogo</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F9FA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Psicólogo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Total Pago</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Total Pendente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Consultas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9FA]">
                    {relatorio.porPsicologo.map((item, index) => (
                      <motion.tr
                        key={item.psicologoId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="hover:bg-[#F8F9FA] transition-colors"
                      >
                        <td className="px-4 py-3 text-sm">{item.nome}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#4CAF50]">{formatCurrency(item.totalPago)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#FFC107]">{formatCurrency(item.totalPendente)}</td>
                        <td className="px-4 py-3 text-sm">{item.consultas}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Por Período */}
          {relatorio.porPeriodo.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-6"
            >
              <h2 className="text-lg font-semibold text-[#23253a] mb-4">Por Período</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F9FA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Mês/Ano</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Entradas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Saídas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9FA]">
                    {relatorio.porPeriodo.map((item, index) => {
                      const saldo = item.entradas - item.saidas;
                      return (
                        <motion.tr
                          key={`${item.mes}-${item.ano}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          className="hover:bg-[#F8F9FA] transition-colors"
                        >
                          <td className="px-4 py-3 text-sm">
                            {item.mes.toString().padStart(2, '0')}/{item.ano}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#4CAF50]">{formatCurrency(item.entradas)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#E57373]">{formatCurrency(item.saidas)}</td>
                          <td className={`px-4 py-3 text-sm font-semibold ${saldo >= 0 ? 'text-[#4CAF50]' : 'text-[#E57373]'}`}>
                            {formatCurrency(saldo)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-12 text-center">
          <p className="text-gray-500">Selecione os filtros e clique em &quot;Gerar Relatório&quot; para visualizar os dados.</p>
        </div>
      )}
    </main>
  );
}
