"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
import { useAdmPaciente } from "@/hooks/admin/useAdmPaciente";
import { useAdmConsultasPorMesTodas, useAdmConsultasCanceladas, useAdmConsultasMesAtual } from "@/hooks/admin/useAdmConsultas";
import { useUserBasic } from "@/hooks/user/userHook";
import ModalCancelamentos from "@/components/ModalCancelamentos";
import ModalConsultasMesAtual from "@/components/ModalConsultasMesAtual";
// ⚡ PERFORMANCE: Chart.js carregado dinamicamente (lazy load) - reduz bundle inicial em ~200KB
import { LazyBarChart, LazyLineChart, LazyDoughnutChart } from '@/components/charts/LazyChartWrapper';
// Ícones SVG inline para olho e lápis
const EyeIcon = () => (
  <svg className="w-5 h-5 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} />
  </svg>
);
const PencilIcon = () => (
  <svg className="w-5 h-5 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7l1 1" />
  </svg>
);

interface Psicologo {
  Id: string | number;
  Nome: string;
  CreatedAt?: string;
  Status: "EmAnalise" | "Ativo" | "Inativo" | "Pendente" | "Reprovado" | string;
  // Adicione outros campos conforme necessário
}

interface Paciente {
  Id: string | number;
  Nome: string;
  CreatedAt?: string;
  Status: "Ativo" | "Pendente" | string;
  // Adicione outros campos conforme necessário
}

export default function AdminDashboard() {
  const { user } = useUserBasic();
  const userName = user?.Nome;
  const [isModalCancelamentosOpen, setIsModalCancelamentosOpen] = useState(false);
  const [isModalConsultasMesOpen, setIsModalConsultasMesOpen] = useState(false);

  // Hook para buscar psicólogos
  const { psicologos, isLoading: isPsicologosLoading, refetch } = useAdmPsicologo();
  const { pacientes, isLoading: isPacientesLoading, refetch: refetchPacientes } = useAdmPaciente();
  
  // Buscar consultas canceladas da tabela Consulta (todos os status de cancelamento)
  const { total: canceladasCount, isLoading: isCancelamentosLoading, refetch: refetchCancelamentos } = useAdmConsultasCanceladas();
  
  // Buscar consultas do mês atual (todas, independente do status)
  const { total: consultasMesAtual, isLoading: isConsultasMesAtualLoading, refetch: refetchConsultasMesAtual } = useAdmConsultasMesAtual();

  // Garante arrays válidos para evitar erros de runtime quando a API retorna objeto
  const psicologosArr: Psicologo[] = Array.isArray(psicologos) ? psicologos : [];
  const pacientesArr: Paciente[] = Array.isArray(pacientes) ? pacientes : [];

  // Dados dinâmicos para gráficos de consultas (últimos 12 meses - TODAS as consultas)
  const { labels: consultasLabels, data: consultasDataArr, refetch: refetchConsultas } = useAdmConsultasPorMesTodas();

  useEffect(() => {
    refetch();
    refetchPacientes();
    refetchConsultas();
    refetchCancelamentos();
    refetchConsultasMesAtual();
  }, [refetch, refetchPacientes, refetchConsultas, refetchCancelamentos, refetchConsultasMesAtual]);

  // Pegar os últimos 5 psicólogos cadastrados (ordenados por data de criação)
  const ultimosPsicologos = psicologosArr
    .sort((a: Psicologo, b: Psicologo) => new Date(b.CreatedAt ?? "").getTime() - new Date(a.CreatedAt ?? "").getTime())
    .slice(0, 5);

  // Quantidade de psicólogos pendentes (Status === "EmAnalise" ou "Pendente")
  const qtdPendentes = psicologosArr.filter(
    (p: Psicologo) => p.Status === "EmAnalise" || p.Status === "Pendente"
  ).length;

  // Mapeamento dos status para exibição amigável
  const statusLabels: Record<string, string> = {
    EMANALISE: "Em análise",
    EM_ANALISE: "Em análise",
    ATIVO: "Ativo",
    INATIVO: "Inativo",
    PENDENTE: "Pendente",
    REPROVADO: "Reprovado",
  };

  // Função para normalizar e formatar status
  const formatStatus = (status: string | undefined): string => {
    if (!status) return "Indefinido";
    const normalized = status
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toUpperCase()
      .replace(/\s|_/g, ''); // remove espaços e underscores
    return statusLabels[normalized] || status;
  };

  // Função para determinar a classe CSS do badge baseado no status
  const getStatusClass = (status: string | undefined): string => {
    if (!status) return "bg-gray-100 text-gray-700";
    const normalized = status
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s|_/g, '');
    
    if (normalized === "ativo") return "bg-green-100 text-green-700";
    if (normalized === "emanalise" || normalized === "pendente") return "bg-yellow-100 text-yellow-700";
    if (normalized === "reprovado" || normalized === "inativo") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  // Estado para tipo de gráfico
  const [consultasChartType, setConsultasChartType] = useState<"bar" | "line" | "doughnut">("bar");
  const [pacientesChartType, setPacientesChartType] = useState<"bar" | "line" | "doughnut">("bar");
  const [psicologosChartType, setPsicologosChartType] = useState<"bar" | "line" | "doughnut">("bar");

  
  // Consultas do mês atual já vem direto do hook useAdmConsultasMesAtual
  // Não precisa calcular mais, já está correto

  const consultasData = {
    labels: consultasLabels,
    datasets: [
      {
        label: "Consultas",
        data: consultasDataArr,
        backgroundColor: "#8494E9",
        borderColor: "#8494E9",
        borderRadius: 6,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const consultasDoughnutData = {
    labels: consultasLabels,
    datasets: [
      {
        data: consultasDataArr,
        backgroundColor: consultasLabels.map((_, i) =>
          i % 2 === 0 ? "#8494E9" : "#F2F4FD"
        ),
        borderWidth: 1,
      },
    ],
  };

  const consultasOptions = {
    responsive: true,
    plugins: {
      legend: { display: consultasChartType === "doughnut" },
      tooltip: { enabled: true },
    },
    scales: consultasChartType === "doughnut"
      ? undefined
      : {
          x: { grid: { display: false } },
          y: { grid: { display: false }, beginAtZero: true },
        },
  };

  // Dados para gráficos de pacientes
  const qtdAtivos = pacientesArr.filter((p: Paciente) => p.Status === "Ativo").length;
  const qtdPendentesPac = pacientesArr.filter((p: Paciente) => p.Status === "Pendente").length;
  const pacientesLabels = ["Ativos", "Pendentes"];
  const pacientesDataArr = [qtdAtivos, qtdPendentesPac];


  const pacientesBarLineData = {
    labels: pacientesLabels,
    datasets: [
      {
        label: "Pacientes",
        data: pacientesDataArr,
        backgroundColor: ["#8494E9", "#F2F4FD"],
        borderColor: ["#8494E9", "#F2F4FD"],
        borderRadius: 6,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const pacientesDoughnutData = {
    labels: pacientesLabels,
    datasets: [
      {
        data: pacientesDataArr,
        backgroundColor: ["#8494E9", "#F2F4FD"],
        borderWidth: 1,
      },
    ],
  };

  const pacientesOptions = {
    responsive: true,
    plugins: {
      legend: { display: pacientesChartType === "doughnut", position: 'bottom' as const },
      tooltip: { enabled: true },
    },
    scales: pacientesChartType === "doughnut"
      ? undefined
      : {
          x: { grid: { display: false } },
          y: { grid: { display: false }, beginAtZero: true },
        },
  }; 

  // Dados para gráficos de psicólogos (somente Em análise, Pendente e Ativo)
  const normalize = (s: string | undefined) =>
    (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/\s|_/g, '');

  const psicologosCategories = [
    { match: 'emanalise', label: 'Em análise' },
    { match: 'pendente', label: 'Pendente' },
    { match: 'ativo', label: 'Ativo' },
  ];

  const psicologosLabels = psicologosCategories.map(c => c.label);
  const psicologosDataArr = psicologosCategories.map(c =>
    psicologosArr.filter(p => normalize(p.Status) === c.match).length
  );
  const psicologosColors = psicologosLabels.map((_, i) => (i % 2 === 0 ? '#8494E9' : '#F2F4FD'));

  const psicologosBarLineData = {
    labels: psicologosLabels,
    datasets: [
      {
        label: "Psicólogos",
        data: psicologosDataArr,
        backgroundColor: psicologosColors,
        borderColor: psicologosColors,
        borderRadius: 6,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const psicologosDoughnutData = {
    labels: psicologosLabels,
    datasets: [
      {
        data: psicologosDataArr,
        backgroundColor: psicologosColors,
        borderWidth: 1,
      },
    ],
  };

  const psicologosOptions = {
    responsive: true,
    plugins: {
      legend: { display: psicologosChartType === "doughnut", position: 'bottom' as const },
      tooltip: { enabled: true },
    },
    scales: psicologosChartType === "doughnut"
      ? undefined
      : {
          x: { grid: { display: false } },
          y: { grid: { display: false }, beginAtZero: true },
        },
  };

  // Renderização condicional dos gráficos - usando lazy loading para melhor performance
  function renderConsultasChart() {
    if (consultasChartType === "bar") return <LazyBarChart data={consultasData} options={consultasOptions} />;
    if (consultasChartType === "line") return <LazyLineChart data={consultasData} options={consultasOptions} />;
    if (consultasChartType === "doughnut")
      return <LazyDoughnutChart data={consultasDoughnutData} options={consultasOptions} />;
    return null;
  }

  function renderPacientesChart() {
    if (pacientesChartType === "bar") return <LazyBarChart data={pacientesBarLineData} options={pacientesOptions} />;
    if (pacientesChartType === "line") return <LazyLineChart data={pacientesBarLineData} options={pacientesOptions} />;
    if (pacientesChartType === "doughnut")
      return <LazyDoughnutChart data={pacientesDoughnutData} options={pacientesOptions} />;
    return null;
  }

  function renderPsicologosChart() {
    if (psicologosChartType === "bar") return <LazyBarChart data={psicologosBarLineData} options={psicologosOptions} />;
    if (psicologosChartType === "line") return <LazyLineChart data={psicologosBarLineData} options={psicologosOptions} />;
    if (psicologosChartType === "doughnut")
      return <LazyDoughnutChart data={psicologosDoughnutData} options={psicologosOptions} />;
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.main
          key="dashboard-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 flex flex-col space-y-4 sm:space-y-6"
        >
          {/* Header */}
          <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#212529]">Dashboard</h2>
              <p className="text-xs sm:text-sm text-[#6C757D] mt-1">Olá, {userName}! Aqui está um resumo do sistema.</p>
            </div>
            <div className="text-xs sm:text-sm text-[#6C757D] font-medium whitespace-nowrap flex-shrink-0">
              {new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#8494E9] to-[#6B7FD7] rounded-xl shadow-md p-4 sm:p-5 text-white hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/90">Psicólogos</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-2">{isPsicologosLoading ? "..." : (psicologos?.length || 0)}</p>
              <a href="/adm-estacao/psicologos" className="text-xs text-white/90 hover:text-white underline font-medium transition-colors">
                Ver mais →
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-[#E5E9FA] hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-[#F2F4FD] rounded-lg p-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#6C757D]">Pacientes</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#212529] mb-2">{isPacientesLoading ? "..." : (pacientes?.length || 0)}</p>
              <a href="/adm-estacao/pacientes" className="text-xs text-[#8494E9] hover:text-[#6B7FD7] underline font-medium transition-colors">
                Ver mais →
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-[#E5E9FA] hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-[#F2F4FD] rounded-lg p-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#6C757D]">Consultas no mês</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#212529] mb-2">{isConsultasMesAtualLoading ? "..." : consultasMesAtual}</p>
              <button
                onClick={() => setIsModalConsultasMesOpen(true)}
                className="text-xs text-[#8494E9] hover:text-[#6B7FD7] underline font-medium transition-colors cursor-pointer text-left"
              >
                Ver mais →
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-[#E5E9FA] hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-yellow-50 rounded-lg p-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#6C757D]">Psicólogos Pendentes</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#212529] mb-2">{isPsicologosLoading ? "..." : qtdPendentes}</p>
              <a href="/adm-estacao/psicologos?status=EmAnalise" className="text-xs text-[#8494E9] hover:text-[#6B7FD7] underline font-medium transition-colors">
                Ver mais →
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-[#E5E9FA] hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-50 rounded-lg p-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#6C757D]">Consultas Canceladas</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-[#212529] mb-2">{isCancelamentosLoading ? "..." : canceladasCount}</p>
              <button
                onClick={() => setIsModalCancelamentosOpen(true)}
                className="text-xs text-[#8494E9] hover:text-[#6B7FD7] underline font-medium transition-colors cursor-pointer"
              >
                Ver mais →
              </button>
            </motion.div>
          </div>
          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-5 border border-[#E5E9FA] h-64 sm:h-72 flex flex-col"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#212529]">Consultas</h3>
                  <p className="text-xs text-[#6C757D]">Últimos 12 meses</p>
                </div>
                <select
                  className="border border-[#E5E9FA] rounded-lg px-2 py-1 text-xs sm:text-sm text-[#6C757D] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition-all"
                  value={consultasChartType}
                  onChange={e => setConsultasChartType(e.target.value as "bar" | "line" | "doughnut")}
                >
                  <option value="bar">📊 Barra</option>
                  <option value="line">📈 Linha</option>
                  <option value="doughnut">🍩 Pizza</option>
                </select>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden w-full min-h-0">
                <div className="w-full h-full">
                  {renderConsultasChart()}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-5 border border-[#E5E9FA] h-64 sm:h-72 flex flex-col"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#212529]">Pacientes</h3>
                  <p className="text-xs text-[#6C757D]">Por status</p>
                </div>
                <select
                  className="border border-[#E5E9FA] rounded-lg px-2 py-1 text-xs sm:text-sm text-[#6C757D] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition-all"
                  value={pacientesChartType}
                  onChange={e => setPacientesChartType(e.target.value as "bar" | "line" | "doughnut")}
                >
                  <option value="bar">📊 Barra</option>
                  <option value="line">📈 Linha</option>
                  <option value="doughnut">🍩 Pizza</option>
                </select>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden w-full min-h-0">
                <div className="w-full h-full">
                  {renderPacientesChart()}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-xl shadow-md p-3 sm:p-4 md:p-5 border border-[#E5E9FA] h-64 sm:h-72 flex flex-col"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#212529]">Psicólogos</h3>
                  <p className="text-xs text-[#6C757D]">Por status</p>
                </div>
                <select
                  className="border border-[#E5E9FA] rounded-lg px-2 py-1 text-xs sm:text-sm text-[#6C757D] focus:outline-none focus:ring-2 focus:ring-[#8494E9] transition-all"
                  value={psicologosChartType}
                  onChange={e => setPsicologosChartType(e.target.value as "bar" | "line" | "doughnut")}
                >
                  <option value="bar">📊 Barra</option>
                  <option value="line">📈 Linha</option>
                  <option value="doughnut">🍩 Pizza</option>
                </select>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden w-full min-h-0">
                <div className="w-full h-full">
                  {renderPsicologosChart()}
                </div>
              </div>
            </motion.div>
          </div>
          {/* Atividades Recentes */}
          <div className="space-y-3 sm:space-y-4">
            {/* Psicólogos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-xl shadow-md border border-[#E5E9FA] overflow-hidden"
            >
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-[#E5E9FA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-[#F2F4FD] rounded-lg p-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#212529]">Últimos Psicólogos Cadastrados</h3>
                </div>
                <a href="/adm-estacao/psicologos" className="text-xs sm:text-sm text-[#8494E9] hover:text-[#6B7FD7] font-medium transition-colors whitespace-nowrap">
                  Ver todos →
                </a>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Nome</th>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Data</th>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-2 sm:px-4 text-center text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9FA]">
                    {isPsicologosLoading ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-[#6C757D]">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8494E9]" />
                          </div>
                        </td>
                      </tr>
                    ) : ultimosPsicologos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-[#6C757D]">
                          Nenhum psicólogo encontrado.
                        </td>
                      </tr>
                    ) : (
                      ultimosPsicologos.map((p: Psicologo, i: number) => (
                        <tr key={p.Id || i} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="py-3 px-2 sm:px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2F4FD] flex items-center justify-center text-[#8494E9] font-semibold text-xs flex-shrink-0">
                                {p.Nome.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-[#212529] truncate">{p.Nome}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-xs text-[#6C757D] whitespace-nowrap">
                            {p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold ${getStatusClass(p.Status)}`}>
                                {formatStatus(p.Status)}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                            <div className="flex items-center justify-center gap-1 sm:gap-2">
                              <a href={`/adm-estacao/psicologo/${p.Id}`} title="Visualizar" className="p-1 sm:p-1.5 hover:bg-[#F2F4FD] rounded-lg transition-colors">
                                <EyeIcon />
                              </a>
                              <a href={`/adm-estacao/psicologo/${p.Id}?edit=1`} title="Editar" className="p-1 sm:p-1.5 hover:bg-[#F2F4FD] rounded-lg transition-colors">
                                <PencilIcon />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Pacientes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-white rounded-xl shadow-md border border-[#E5E9FA] overflow-hidden"
            >
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-[#E5E9FA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-[#F2F4FD] rounded-lg p-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#212529]">Últimos Pacientes Cadastrados</h3>
                </div>
                <a href="/adm-estacao/pacientes" className="text-xs sm:text-sm text-[#8494E9] hover:text-[#6B7FD7] font-medium transition-colors whitespace-nowrap">
                  Ver todos →
                </a>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Nome</th>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Data</th>
                      <th className="py-2.5 px-2 sm:px-4 text-left text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Status</th>
                      <th className="py-2.5 px-2 sm:px-4 text-center text-xs font-semibold text-[#6C757D] uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9FA]">
                    {isPacientesLoading ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-[#6C757D]">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8494E9]" />
                          </div>
                        </td>
                      </tr>
                    ) : pacientesArr.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-[#6C757D]">
                          Nenhum paciente encontrado.
                        </td>
                      </tr>
                    ) : (
                      [...pacientesArr]
                        .sort((a: Paciente, b: Paciente) => new Date(b.CreatedAt ?? "").getTime() - new Date(a.CreatedAt ?? "").getTime())
                        .slice(0, 5)
                        .map((p: Paciente, i: number) => (
                          <tr key={p.Id || i} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2F4FD] flex items-center justify-center text-[#8494E9] font-semibold text-xs flex-shrink-0">
                                  {p.Nome.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-[#212529] truncate">{p.Nome}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-xs text-[#6C757D] whitespace-nowrap">
                              {p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold ${getStatusClass(p.Status)}`}>
                                {formatStatus(p.Status)}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-center">
                                <a href="#" title="Visualizar registro" className="p-1 sm:p-1.5 hover:bg-[#F2F4FD] rounded-lg transition-colors">
                                  <EyeIcon />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </motion.main>
      </AnimatePresence>
      
      {/* Modal de Cancelamentos */}
      <ModalCancelamentos
        open={isModalCancelamentosOpen}
        onClose={() => setIsModalCancelamentosOpen(false)}
        onStatusUpdated={() => {
          refetchCancelamentos();
        }}
      />
      
      {/* Modal de Consultas do Mês Atual */}
      <ModalConsultasMesAtual
        open={isModalConsultasMesOpen}
        onClose={() => setIsModalConsultasMesOpen(false)}
      />
    </>
  );
}