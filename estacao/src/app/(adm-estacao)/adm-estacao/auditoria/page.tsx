"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auditoriaService } from "@/services/auditoriaService";
import { ActionType, Module, AuditoriaItem } from "@/types/auditoria";
import { useAudits } from "@/hooks/auditHook";

// Mapeamento de ActionType para exibição
const actionTypeLabels: Record<ActionType, string> = {
  Create: "Criação",
  Read: "Visualização",
  Update: "Atualização",
  Delete: "Exclusão",
  Approve: "Aprovação",
  Reject: "Rejeição",
  Manage: "Gerenciar",
  Login: "Login",
  Logout: "Logout",
};

// Mapeamento de Module para exibição
const moduleLabels: Record<Module, string> = {
  Authentication: "Autenticação",
  Users: "Usuários",
  Payments: "Pagamentos",
  Consultations: "Consultas",
  Schedules: "Agendamentos",
  Financial: "Financeiro",
  Reports: "Relatórios",
  Notifications: "Notificações",
  Permissions: "Permissões",
  Auditoria: "Auditoria",
  Psychologists: "Psicólogos",
  Patients: "Pacientes",
  Communication: "Comunicação",
};

export default function AuditoriaPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filtroModulo, setFiltroModulo] = useState<Module | "">("");
  const [filtroAcao, setFiltroAcao] = useState<ActionType | "">("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [modalDetalhes, setModalDetalhes] = useState<{ open: boolean; audit: AuditoriaItem | null }>({ open: false, audit: null });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPage(1);
  }, [filtroModulo, filtroAcao, filtroStatus, filtroUsuario, filtroDataInicio, filtroDataFim, busca]);

  // Preparar filtros para a API (com paginação)
  const filtros = useMemo(() => {
    const filters: {
      page: number;
      limit: number;
      module?: Module;
      actionType?: ActionType;
      status?: string;
      userId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {
      page,
      limit,
    };

    if (filtroModulo) filters.module = filtroModulo;
    if (filtroAcao) filters.actionType = filtroAcao;
    if (filtroStatus) filters.status = filtroStatus;
    if (filtroUsuario) filters.userId = filtroUsuario;
    if (busca) filters.search = busca;
    if (filtroDataInicio) filters.startDate = filtroDataInicio;
    if (filtroDataFim) filters.endDate = filtroDataFim;

    return filters;
  }, [page, limit, filtroModulo, filtroAcao, filtroStatus, filtroUsuario, busca, filtroDataInicio, filtroDataFim]);

  // Preparar filtros para exportação (sem paginação - todos os dados filtrados)
  const filtrosExportacao = useMemo(() => {
    const filters: {
      module?: Module;
      actionType?: ActionType;
      status?: string;
      userId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    if (filtroModulo) filters.module = filtroModulo;
    if (filtroAcao) filters.actionType = filtroAcao;
    if (filtroStatus) filters.status = filtroStatus;
    if (filtroUsuario) filters.userId = filtroUsuario;
    if (busca) filters.search = busca;
    if (filtroDataInicio) filters.startDate = filtroDataInicio;
    if (filtroDataFim) filters.endDate = filtroDataFim;

    return filters;
  }, [filtroModulo, filtroAcao, filtroStatus, filtroUsuario, busca, filtroDataInicio, filtroDataFim]);

  // Buscar dados da API
  const { audits, pagination, isLoading } = useAudits(filtros);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroModulo("");
    setFiltroAcao("");
    setFiltroStatus("");
    setFiltroUsuario("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setBusca("");
    setPage(1);
  };

  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);

  // Exportar para CSV
  const exportarCSV = () => {
    if (audits.length === 0) return;
    auditoriaService.baixarCSV(
      audits,
      `auditoria_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  // Exportar para Excel (com todos os dados filtrados, sem paginação)
  const exportarExcel = async () => {
    try {
      setExportando('excel');
      await auditoriaService.exportarParaExcel(filtrosExportacao);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar para Excel. Tente novamente.');
    } finally {
      setExportando(null);
    }
  };

  // Exportar para PDF (com todos os dados filtrados, sem paginação)
  const exportarPDF = async () => {
    try {
      setExportando('pdf');
      await auditoriaService.exportarParaPDF(filtrosExportacao);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar para PDF. Tente novamente.');
    } finally {
      setExportando(null);
    }
  };

  // Badge de status
  const StatusBadge = ({ status }: { status: string | null }) => {
    if (!status) {
      return (
        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
          -
        </span>
      );
    }

    const statusLower = status.toLowerCase();
    const cores: Record<string, string> = {
      sucesso: "bg-green-100 text-green-700 border-green-300",
      falha: "bg-red-100 text-red-700 border-red-300",
      alerta: "bg-yellow-100 text-yellow-700 border-yellow-300",
      success: "bg-green-100 text-green-700 border-green-300",
      failure: "bg-red-100 text-red-700 border-red-300",
      alert: "bg-yellow-100 text-yellow-700 border-yellow-300",
    };

    const cor = cores[statusLower] || "bg-gray-100 text-gray-700 border-gray-300";

    return (
      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border ${cor}`}>
        {status}
      </span>
    );
  };

  // Formatar data/hora
  const formatarDataHora = (timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Listas únicas para os filtros (opções disponíveis)
  const modulosDisponiveis: Module[] = [
    "Authentication",
    "Users",
    "Payments",
    "Consultations",
    "Schedules",
    "Financial",
    "Reports",
    "Notifications",
    "Permissions",
    "Psychologists",
    "Patients",
    "Communication",
  ];

  const acoesDisponiveis: ActionType[] = [
    "Create",
    "Read",
    "Update",
    "Delete",
    "Approve",
    "Reject",
    "Manage",
    "Login",
    "Logout",
  ];

  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Auditoria</h1>
        </div>
        <p className="text-sm text-gray-500 ml-11">Visualize e filtre todos os eventos do sistema</p>
      </motion.div>

      {/* Card de Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-5 mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </h2>
          <button
            onClick={limparFiltros}
            className="text-sm text-[#8494E9] hover:text-[#6B7DE0] font-medium transition-colors"
          >
            Limpar filtros
          </button>
        </div>

        {/* Busca geral */}
        <div className="mb-4 relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por ID, ação, módulo, IP..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
          />
        </div>

        {/* Grid de filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filtro de Módulo */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Módulo</label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value as Module | "")}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            >
              <option value="">Todos os módulos</option>
              {modulosDisponiveis.map((modulo) => (
                <option key={modulo} value={modulo}>
                  {moduleLabels[modulo]}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Ação */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Ação</label>
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value as ActionType | "")}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            >
              <option value="">Todas as ações</option>
              {acoesDisponiveis.map((acao) => (
                <option key={acao} value={acao}>
                  {actionTypeLabels[acao]}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Status */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="Sucesso">Sucesso</option>
              <option value="Falha">Falha</option>
              <option value="Alerta">Alerta</option>
            </select>
          </div>

          {/* Filtro de Usuário (somente ID) */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Usuário ID</label>
            <input
              type="text"
              placeholder="ex.: USR001"
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            />
          </div>

          {/* Filtro de Data Início */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            />
          </div>

          {/* Filtro de Data Fim */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-0.5 sm:mb-1">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full min-w-0 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            />
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-[#E5E9FA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-[#6C757D]">
            Exibindo <span className="font-semibold text-[#212529]">{audits.length}</span> de{" "}
            <span className="font-semibold text-[#212529]">{pagination.total}</span> registros
            {pagination.totalPages > 0 && (
              <> (Página {pagination.page} de {pagination.totalPages})</>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={exportarCSV}
              disabled={audits.length === 0 || isLoading}
              title="Exporta apenas os dados da página atual"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button
              onClick={exportarExcel}
              disabled={isLoading || exportando === 'excel'}
              title="Exporta todos os dados filtrados (não apenas a página atual)"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportando === 'excel' ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </>
              )}
            </button>
            <button
              onClick={exportarPDF}
              disabled={isLoading || exportando === 'pdf'}
              title="Exporta todos os dados filtrados (não apenas a página atual)"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportando === 'pdf' ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabela de Auditoria */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        {/* Versão Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-[#F2F4FD]">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Usuário ID
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Módulo
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Detalhes
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  IP
                </th>
                <th className="px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-[#212529] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9FA]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-[#6C757D]">
                  </td>
                </tr>
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-[#6C757D]">
                    Nenhum registro encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                audits.map((item) => (
                  <tr key={item.Id} className="hover:bg-[#F9FAFB] transition-colors cursor-pointer" onClick={() => setModalDetalhes({ open: true, audit: item })}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-[#212529]">
                      {formatarDataHora(item.Timestamp)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-mono text-[#212529]">{item.UserId}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-[#212529]">
                      {moduleLabels[item.Module] || item.Module}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-[#212529]">
                      {actionTypeLabels[item.ActionType] || item.ActionType}
                    </td>
                    <td className="px-4 py-2.5 text-xs sm:text-sm text-[#6C757D] max-w-xs truncate">{item.Description}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-[#6C757D] font-mono">
                      {item.IpAddress || "-"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge status={item.Status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile */}
        <div className="md:hidden divide-y divide-[#E5E9FA]">
          {isLoading ? (
            <div className="px-3 py-5 text-center text-[#6C757D] text-xs"></div>
          ) : audits.length === 0 ? (
            <div className="px-3 py-5 text-center text-[#6C757D] text-xs">
              Nenhum registro encontrado com os filtros aplicados.
            </div>
          ) : (
            audits.map((item) => (
              <div key={item.Id} className="p-2.5 space-y-1.5 w-full cursor-pointer hover:bg-[#F9FAFB] transition-colors" onClick={() => setModalDetalhes({ open: true, audit: item })}>
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-[#6C757D] mb-0.5">Usuário ID</p>
                    <p className="text-xs font-medium text-[#212529] font-mono break-all">{item.UserId}</p>
                  </div>
                  <StatusBadge status={item.Status} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs w-full">
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#6C757D]">Módulo:</span>
                    <p className="text-[#212529] font-medium break-words">
                      {moduleLabels[item.Module] || item.Module}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#6C757D]">Ação:</span>
                    <p className="text-[#212529] font-medium break-words">
                      {actionTypeLabels[item.ActionType] || item.ActionType}
                    </p>
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-[10px] text-[#6C757D]">Detalhes:</span>
                  <p className="text-[#212529] break-words whitespace-normal">{item.Description}</p>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-[#6C757D] w-full">
                  <span className="break-words">{formatarDataHora(item.Timestamp)}</span>
                  <span className="font-mono break-all">{item.IpAddress || "-"}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#E5E9FA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || isLoading}
                className="px-3 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg hover:bg-[#F2F4FD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs sm:text-sm text-[#6C757D]">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={page === pagination.totalPages || isLoading}
                className="px-3 py-1.5 text-xs sm:text-sm border border-[#E5E9FA] rounded-lg hover:bg-[#F2F4FD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
            <div className="text-xs text-[#6C757D]">
              {pagination.total} registro(s) no total
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {modalDetalhes.open && modalDetalhes.audit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setModalDetalhes({ open: false, audit: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#8494E9] text-white">
                <div>
                  <h2 className="text-lg font-semibold">Detalhes da Auditoria</h2>
                  <p className="text-sm text-white/80 font-mono">{modalDetalhes.audit.Id}</p>
                </div>
                <button
                  className="p-2 rounded hover:bg-white/10 transition-colors"
                  onClick={() => setModalDetalhes({ open: false, audit: null })}
                  aria-label="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Data/Hora */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Data/Hora</p>
                    <p className="text-sm font-semibold text-gray-900">{formatarDataHora(modalDetalhes.audit.Timestamp)}</p>
                  </div>

                  {/* Status */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={modalDetalhes.audit.Status} />
                    </div>
                  </div>

                  {/* Usuário ID */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Usuário ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900 break-all">{modalDetalhes.audit.UserId}</p>
                    {modalDetalhes.audit.User && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Nome:</span> {modalDetalhes.audit.User.Nome}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Email:</span> {modalDetalhes.audit.User.Email}
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Role:</span> {modalDetalhes.audit.User.Role}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* IP Address */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Endereço IP</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{modalDetalhes.audit.IpAddress || "-"}</p>
                  </div>

                  {/* Módulo */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Módulo</p>
                    <p className="text-sm font-semibold text-gray-900">{moduleLabels[modalDetalhes.audit.Module] || modalDetalhes.audit.Module}</p>
                  </div>

                  {/* Ação */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Ação</p>
                    <p className="text-sm font-semibold text-gray-900">{actionTypeLabels[modalDetalhes.audit.ActionType] || modalDetalhes.audit.ActionType}</p>
                  </div>
                </div>

                {/* Descrição */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Descrição</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{modalDetalhes.audit.Description}</p>
                </div>

                {/* Metadata */}
                {modalDetalhes.audit.Metadata && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Metadata</p>
                    <pre className="text-xs text-gray-900 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                      {(() => {
                        try {
                          const parsed = JSON.parse(modalDetalhes.audit.Metadata || "{}");
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return modalDetalhes.audit.Metadata;
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setModalDetalhes({ open: false, audit: null })}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}