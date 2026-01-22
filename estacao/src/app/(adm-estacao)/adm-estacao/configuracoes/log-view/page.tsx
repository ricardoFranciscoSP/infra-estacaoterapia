"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { jobsService, JobInfo } from "@/services/jobsService";
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

export default function LogsPage() {
  const [abaAtiva, setAbaAtiva] = useState<'auditoria' | 'jobs'>('auditoria');
  const [page, setPage] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [filtroModulo, setFiltroModulo] = useState<Module | "">("");
  const [filtroAcao, setFiltroAcao] = useState<ActionType | "">("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatusJob, setFiltroStatusJob] = useState<string>("");
  const [selectedAudit, setSelectedAudit] = useState<AuditoriaItem | null>(null);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPage(1);
  }, [filtroModulo, filtroAcao, filtroStatus, filtroDataInicio, filtroDataFim, busca]);

  // Preparar filtros para a API (com paginação)
  const filtros = useMemo(() => {
    const filters: {
      page: number;
      limit: number;
      module?: Module;
      actionType?: ActionType;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    } = {
      page,
      limit: registrosPorPagina,
    };

    if (filtroModulo) filters.module = filtroModulo;
    if (filtroAcao) filters.actionType = filtroAcao;
    if (filtroStatus) filters.status = filtroStatus;
    if (busca) filters.search = busca;
    if (filtroDataInicio) filters.startDate = filtroDataInicio;
    if (filtroDataFim) filters.endDate = filtroDataFim;

    return filters;
  }, [page, registrosPorPagina, filtroModulo, filtroAcao, filtroStatus, busca, filtroDataInicio, filtroDataFim]);

  // Buscar dados da API - Auditoria
  const { audits, pagination, isLoading } = useAudits(filtros);

  // Buscar dados da API - Jobs
  const { data: jobsData, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs', filtroStatusJob, registrosPorPagina],
    queryFn: async () => {
      const response = await jobsService.list({
        status: filtroStatusJob || undefined,
        limit: registrosPorPagina * 10, // Buscar mais para paginação client-side
      });
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const jobs = useMemo(() => jobsData?.data || [], [jobsData?.data]);
  const jobsFiltrados = useMemo(() => {
    let filtered = jobs;
    if (busca) {
      const buscaLower = busca.toLowerCase();
      filtered = filtered.filter(job => 
        job.name?.toLowerCase().includes(buscaLower) ||
        job.queueName?.toLowerCase().includes(buscaLower) ||
        JSON.stringify(job.data)?.toLowerCase().includes(buscaLower) ||
        job.jobId?.toLowerCase().includes(buscaLower)
      );
    }
    return filtered;
  }, [jobs, busca]);

  const jobsPaginados = useMemo(() => {
    const inicio = (page - 1) * registrosPorPagina;
    const fim = inicio + registrosPorPagina;
    return jobsFiltrados.slice(inicio, fim);
  }, [jobsFiltrados, page, registrosPorPagina]);

  const totalPaginasJobs = Math.ceil(jobsFiltrados.length / registrosPorPagina);

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroModulo("");
    setFiltroAcao("");
    setFiltroStatus("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setBusca("");
    setPage(1);
  };

  // Badge de status
  const StatusBadge = ({ status }: { status: string | null }) => {
    if (!status) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-300">
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${cor}`}>
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

  const formatAuditMetadata = (metadata?: string | null): string => {
    if (!metadata) return "-";
    try {
      const parsed = JSON.parse(metadata);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return metadata;
    }
  };

  // Listas únicas para os filtros
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

  const totalPaginas = pagination?.totalPages || 1;
  const totalRegistros = pagination?.total || 0;
  const inicioRegistro = (page - 1) * registrosPorPagina + 1;
  const fimRegistro = Math.min(page * registrosPorPagina, totalRegistros);

  const totalRegistrosJobs = jobsFiltrados.length;
  const inicioRegistroJobs = (page - 1) * registrosPorPagina + 1;
  const fimRegistroJobs = Math.min(page * registrosPorPagina, totalRegistrosJobs);

  // Badge de status para jobs
  const JobStatusBadge = ({ status }: { status: JobInfo['status'] }) => {
    const cores: Record<string, string> = {
      completed: "bg-green-100 text-green-700 border-green-300",
      failed: "bg-red-100 text-red-700 border-red-300",
      active: "bg-blue-100 text-blue-700 border-blue-300",
      waiting: "bg-yellow-100 text-yellow-700 border-yellow-300",
      delayed: "bg-purple-100 text-purple-700 border-purple-300",
    };

    const labels: Record<string, string> = {
      completed: "Concluído",
      failed: "Falhou",
      active: "Ativo",
      waiting: "Aguardando",
      delayed: "Atrasado",
    };

    const cor = cores[status] || "bg-gray-100 text-gray-700 border-gray-300";
    const label = labels[status] || status;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${cor}`}>
        {label}
      </span>
    );
  };

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Logs do Sistema</h1>
        </div>
        <p className="text-sm text-gray-500 ml-11">Visualize e filtre os logs de ações do sistema e jobs BullMQ</p>
      </motion.div>

      {/* Abas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-6"
      >
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => {
              setAbaAtiva('auditoria');
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              abaAtiva === 'auditoria'
                ? 'text-[#8494E9] border-b-2 border-[#8494E9]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Logs de Auditoria
          </button>
          <button
            onClick={() => {
              setAbaAtiva('jobs');
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              abaAtiva === 'jobs'
                ? 'text-[#8494E9] border-b-2 border-[#8494E9]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Jobs BullMQ
          </button>
        </div>
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
            placeholder="Buscar por descrição, IP, usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
          />
        </div>

        {/* Grid de filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro de Módulo */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-1">Módulo</label>
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value as Module | "")}
              className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
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
            <label className="block text-xs font-medium text-[#212529] mb-1">Ação</label>
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value as ActionType | "")}
              className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
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
            <label className="block text-xs font-medium text-[#212529] mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="Sucesso">Sucesso</option>
              <option value="Falha">Falha</option>
              <option value="Alerta">Alerta</option>
            </select>
          </div>

          {/* Filtro de Data Início */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-1">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            />
          </div>

          {/* Filtro de Data Fim */}
          <div>
            <label className="block text-xs font-medium text-[#212529] mb-1">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            />
          </div>

          {/* Filtro de Status Job (apenas para aba Jobs) */}
          {abaAtiva === 'jobs' && (
            <div>
              <label className="block text-xs font-medium text-[#212529] mb-1">Status do Job</label>
              <select
                value={filtroStatusJob}
                onChange={(e) => {
                  setFiltroStatusJob(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="completed">Concluído</option>
                <option value="failed">Falhou</option>
                <option value="active">Ativo</option>
                <option value="waiting">Aguardando</option>
                <option value="delayed">Atrasado</option>
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabela de Logs ou Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        {/* Header da tabela com paginação */}
        <div className="p-4 border-b border-[#E5E9FA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {abaAtiva === 'auditoria' 
                ? `Mostrando ${inicioRegistro} a ${fimRegistro} de ${totalRegistros} registros`
                : `Mostrando ${inicioRegistroJobs} a ${fimRegistroJobs} de ${totalRegistrosJobs} registros`
              }
            </span>
            <select
              value={registrosPorPagina}
              onChange={(e) => {
                setRegistrosPorPagina(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-[#E5E9FA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent"
            >
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={30}>30 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {abaAtiva === 'auditoria' ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Módulo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ação</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Ver</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando logs...
                      </div>
                    </td>
                  </tr>
                ) : audits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  audits.map((audit) => (
                    <tr key={audit.Id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatarDataHora(audit.Timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {audit.User?.Nome || audit.UserId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {moduleLabels[audit.Module] || audit.Module}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {actionTypeLabels[audit.ActionType] || audit.ActionType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={audit.Status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedAudit(audit)}
                          className="inline-flex items-center justify-center text-[#8494E9] hover:text-[#6B7DE0]"
                          title="Ver detalhes"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fila</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nome do Job</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tentativas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dados</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Erro</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingJobs ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando jobs...
                      </div>
                    </td>
                  </tr>
                ) : jobsPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhum job encontrado
                    </td>
                  </tr>
                ) : (
                  jobsPaginados.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatarDataHora(new Date(job.timestamp))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {job.queueName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {job.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {job.attemptsMade}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate" title={JSON.stringify(job.data, null, 2)}>
                        {JSON.stringify(job.data).substring(0, 50)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-md truncate" title={job.failedReason || ''}>
                        {job.failedReason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {((abaAtiva === 'auditoria' && totalPaginas > 1) || (abaAtiva === 'jobs' && totalPaginasJobs > 1)) && (
          <div className="p-4 border-t border-[#E5E9FA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600">
              Página {page} de {abaAtiva === 'auditoria' ? totalPaginas : totalPaginasJobs}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || (abaAtiva === 'auditoria' ? isLoading : isLoadingJobs) || (abaAtiva === 'jobs' && page === 1)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  page === 1 || (abaAtiva === 'auditoria' ? isLoading : isLoadingJobs)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border border-[#E5E9FA] hover:bg-gray-50"
                }`}
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, abaAtiva === 'auditoria' ? totalPaginas : totalPaginasJobs) }, (_, i) => {
                  const total = abaAtiva === 'auditoria' ? totalPaginas : totalPaginasJobs;
                  let pageNum: number;
                  if (total <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= total - 2) {
                    pageNum = total - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={abaAtiva === 'auditoria' ? isLoading : isLoadingJobs}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        page === pageNum
                          ? "bg-[#8494E9] text-white"
                          : "bg-white text-gray-700 border border-[#E5E9FA] hover:bg-gray-50"
                      } ${(abaAtiva === 'auditoria' ? isLoading : isLoadingJobs) ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(abaAtiva === 'auditoria' ? page === totalPaginas : page === totalPaginasJobs) || (abaAtiva === 'auditoria' ? isLoading : isLoadingJobs)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  (abaAtiva === 'auditoria' ? page === totalPaginas : page === totalPaginasJobs) || (abaAtiva === 'auditoria' ? isLoading : isLoadingJobs)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 border border-[#E5E9FA] hover:bg-gray-50"
                }`}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Detalhes do log</h3>
              <button
                onClick={() => setSelectedAudit(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Data/Hora</span>
                <div>{formatarDataHora(selectedAudit.Timestamp)}</div>
              </div>
              <div>
                <span className="text-gray-500">Usuário</span>
                <div>{selectedAudit.User?.Nome || selectedAudit.UserId}</div>
              </div>
              <div>
                <span className="text-gray-500">Módulo</span>
                <div>{moduleLabels[selectedAudit.Module] || selectedAudit.Module}</div>
              </div>
              <div>
                <span className="text-gray-500">Ação</span>
                <div>{actionTypeLabels[selectedAudit.ActionType] || selectedAudit.ActionType}</div>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <div>{selectedAudit.Status || "-"}</div>
              </div>
              <div>
                <span className="text-gray-500">IP</span>
                <div>{selectedAudit.IpAddress || "-"}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500">Descrição</span>
                <div className="whitespace-pre-wrap">{selectedAudit.Description}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500">Metadata</span>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
                  {formatAuditMetadata(selectedAudit.Metadata)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

