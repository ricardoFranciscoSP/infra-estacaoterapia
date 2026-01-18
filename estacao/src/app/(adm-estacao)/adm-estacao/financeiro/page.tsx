"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
// ⚡ PERFORMANCE: Chart.js carregado dinamicamente (lazy load) - reduz bundle inicial em ~200KB
import { LazyBarChart, LazyLineChart, LazyDoughnutChart } from '@/components/charts/LazyChartWrapper';
import type { ChartData } from 'chart.js';
import { admFinanceService } from "@/services/admFinanceService";
import type { EstatisticasFinanceiras, Financeiro, FinanceiroPsicologo } from "@/types/admFinanceTypes";

type LancamentoRow = {
  id: string;
  data: string;
  paciente: string | null;
  psicologo: string | null;
  tipoLancamento: string;
  tipoPlano: string;
  valor: number;
  status: string;
  vencimento: string | null;
  origem: "paciente" | "psicologo";
};

const financeService = admFinanceService();

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const normalizeTipoFatura = (tipo?: string | null) => {
  if (!tipo) return "-";
  const map: Record<string, string> = {
    Primeira: "Primeira Consulta",
    Avulso: "Consulta Avulsa",
  };
  return map[tipo] || tipo;
};

const getStatusBadgeClass = (status: string) => {
  const statusConfig: Record<string, string> = {
    Aprovado: "bg-green-50 text-green-700 border border-green-200",
    AguardandoPagamento: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    Reprovado: "bg-red-50 text-red-700 border border-red-200",
    Cancelado: "bg-red-50 text-red-700 border border-red-200",
    EmMonitoramento: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    EmDisputa: "bg-orange-50 text-orange-700 border border-orange-200",
    Chargeback: "bg-red-50 text-red-700 border border-red-200",
    Multa: "bg-orange-50 text-orange-700 border border-orange-200",
    pago: "bg-green-50 text-green-700 border border-green-200",
    pendente: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    processando: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    aprovado: "bg-green-50 text-green-700 border border-green-200",
    cancelado: "bg-red-50 text-red-700 border border-red-200",
    retido: "bg-orange-50 text-orange-700 border border-orange-200",
    PagamentoEmAnalise: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  };

  return statusConfig[status] || "bg-gray-50 text-gray-700 border border-gray-200";
};

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

export default function FinanceiroPage() {
  const [pagamentosPacientes, setPagamentosPacientes] = useState<Financeiro[]>([]);
  const [pagamentosPsicologos, setPagamentosPsicologos] = useState<FinanceiroPsicologo[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasFinanceiras | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [psicologoFiltro, setPsicologoFiltro] = useState("Todos");
  const [tipoPlanoFiltro, setTipoPlanoFiltro] = useState("Todos");
  const [tipoLancamentoFiltro, setTipoLancamentoFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  useEffect(() => {
    let isActive = true;

    const fetchAllPages = async (
      fetchFn: (params: { page: number; pageSize: number }) => Promise<{ data: { data?: { items: unknown[]; paginacao: { totalPages: number } } } }>
    ) => {
      const pageSize = 200;
      let page = 1;
      let totalPages = 1;
      const items: unknown[] = [];

      while (page <= totalPages) {
        const response = await fetchFn({ page, pageSize });
        const data = response.data?.data;
        if (!data) break;
        items.push(...(data.items || []));
        totalPages = data.paginacao?.totalPages || 1;
        page += 1;
      }

      return items;
    };

    const fetchFinanceiro = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [estatisticasResp, pacientes, psicologos] = await Promise.all([
          financeService.obterEstatisticas(),
          fetchAllPages((params) => financeService.listarPagamentosPacientes(params)),
          fetchAllPages((params) => financeService.listarPagamentosPsicologos(params)),
        ]);

        if (!isActive) return;

        setEstatisticas(estatisticasResp.data?.data || null);
        setPagamentosPacientes(pacientes as Financeiro[]);
        setPagamentosPsicologos(psicologos as FinanceiroPsicologo[]);
      } catch (err) {
        if (!isActive) return;
        const message = err instanceof Error ? err.message : "Erro ao carregar dados financeiros";
        setError(message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchFinanceiro();

    return () => {
      isActive = false;
    };
  }, []);

  const lancamentos = useMemo<LancamentoRow[]>(() => {
    const pacientesRows = pagamentosPacientes.map((item) => {
      const tipoLancamento = normalizeTipoFatura(item.Tipo);
      const tipoPlano = item.PlanoAssinatura?.Nome || "-";
      return {
        id: item.Id,
        data: item.CreatedAt || item.DataVencimento,
        paciente: item.User?.Nome || "-",
        psicologo: "-",
        tipoLancamento,
        tipoPlano,
        valor: item.Valor,
        status: item.Status,
        vencimento: item.DataVencimento,
        origem: "paciente" as const,
      };
    });

    const psicologosRows = pagamentosPsicologos.map((item) => ({
      id: item.Id,
      data: item.CreatedAt || item.DataPagamento || item.DataVencimento,
      paciente: "-",
      psicologo: item.User?.Nome || "-",
      tipoLancamento: item.Tipo || "Psicólogo",
      tipoPlano: "-",
      valor: item.Valor,
      status: item.Status,
      vencimento: item.DataVencimento,
      origem: "psicologo" as const,
    }));

    return [...pacientesRows, ...psicologosRows].sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return dateB - dateA;
    });
  }, [pagamentosPacientes, pagamentosPsicologos]);

  const statusOptions = useMemo(() => {
    const options = Array.from(new Set(lancamentos.map((item) => item.status)));
    return options.sort();
  }, [lancamentos]);

  const psicologoOptions = useMemo(() => {
    const options = Array.from(
      new Set(lancamentos.map((item) => item.psicologo).filter((value): value is string => !!value && value !== "-"))
    );
    return options.sort();
  }, [lancamentos]);

  const tipoPlanoOptions = useMemo(() => {
    const options = Array.from(
      new Set(lancamentos.map((item) => item.tipoPlano).filter((value): value is string => !!value && value !== "-"))
    );
    return options.sort();
  }, [lancamentos]);

  const tipoLancamentoOptions = useMemo(() => {
    const options = Array.from(new Set(lancamentos.map((item) => item.tipoLancamento)));
    return options.sort();
  }, [lancamentos]);

  // Filtros consolidados
  const financeiroFiltrado = lancamentos.filter((item) =>
    (busca === "" ||
      (item.paciente && item.paciente.toLowerCase().includes(busca.toLowerCase())) ||
      (item.psicologo && item.psicologo.toLowerCase().includes(busca.toLowerCase()))) &&
    (statusFiltro === "Todos" || item.status === statusFiltro) &&
    (psicologoFiltro === "Todos" || item.psicologo === psicologoFiltro) &&
    (tipoPlanoFiltro === "Todos" || item.tipoPlano === tipoPlanoFiltro) &&
    (tipoLancamentoFiltro === "Todos" || item.tipoLancamento === tipoLancamentoFiltro)
  );

  const total = financeiroFiltrado.length;
  const totalPaginas = Math.ceil(total / porPagina);
  const financeiroPaginado = financeiroFiltrado.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Dados para gráficos com base nos registros reais
  const pacientesData: ChartData<"doughnut" | "bar" | "line"> = useMemo(() => {
    const counts = new Map<string, number>();
    pagamentosPacientes.forEach((item) => {
      const label = item.PlanoAssinatura?.Nome || normalizeTipoFatura(item.Tipo);
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const labels = Array.from(counts.keys());
    const data = labels.map((label) => counts.get(label) || 0);
    const colors = ["#8494E9", "#F2C94C", "#6FCF97", "#56CCF2", "#BB6BD9", "#EB5757"];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
        },
      ],
    };
  }, [pagamentosPacientes]);

  const psicologosData: ChartData<"doughnut" | "bar" | "line"> = useMemo(() => {
    const counts = new Map<string, number>();
    pagamentosPsicologos.forEach((item) => {
      const label = item.User?.Nome || "Sem psicólogo";
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    const labels = Array.from(counts.keys()).slice(0, 8);
    const data = labels.map((label) => counts.get(label) || 0);
    const colors = ["#6FCF97", "#EB5757", "#BB6BD9", "#56CCF2", "#F2C94C", "#8494E9", "#F2994A", "#56CC9D"];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
        },
      ],
    };
  }, [pagamentosPsicologos]);

  const plataformaData: ChartData<"doughnut" | "bar" | "line"> = useMemo(() => {
    const counts = new Map<string, number>();
    lancamentos.forEach((item) => {
      counts.set(item.status, (counts.get(item.status) || 0) + 1);
    });

    const labels = Array.from(counts.keys());
    const data = labels.map((label) => counts.get(label) || 0);
    const colors = ["#56CCF2", "#F2C94C", "#BB6BD9", "#6FCF97", "#EB5757", "#8494E9"];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((_, index) => colors[index % colors.length]),
        },
      ],
    };
  }, [lancamentos]);

  const [graficoPaciente, setGraficoPaciente] = useState("doughnut");
  const [graficoPsicologo, setGraficoPsicologo] = useState("doughnut");
  const [graficoPlataforma, setGraficoPlataforma] = useState("doughnut");

  function renderGrafico(
    tipo: string,
    data: ChartData<"doughnut" | "bar" | "line">
  ) {
    const options = { maintainAspectRatio: false };
    if (tipo === "bar") return <LazyBarChart data={data as ChartData<"bar">} options={options} />;
    if (tipo === "line") return <LazyLineChart data={data as ChartData<"line">} options={options} />;
    return <LazyDoughnutChart data={data as ChartData<"doughnut">} options={options} />;
  }

  const faturaPsicologo = useMemo(() => {
    const hoje = new Date();
    const mes = hoje.getMonth();
    const ano = hoje.getFullYear();
    const inicioPeriodo = new Date(ano, mes, 1, 0, 0, 0);
    const fimPeriodo = new Date(ano, mes, 25, 23, 59, 59);

    const entries = pagamentosPsicologos.filter((item) => {
      const data = item.DataVencimento || item.CreatedAt;
      if (!data) return false;
      const date = new Date(data);
      return date >= inicioPeriodo && date <= fimPeriodo;
    });

    const total = entries.reduce((sum, item) => sum + (item.Valor || 0), 0);
    const consultas = entries.reduce((sum, item) => sum + (item.ConsultasRealizadas || 0), 0);
    const ultimoPagamento = entries
      .filter((item) => item.DataPagamento)
      .sort((a, b) => {
        const dateA = a.DataPagamento ? new Date(a.DataPagamento).getTime() : 0;
        const dateB = b.DataPagamento ? new Date(b.DataPagamento).getTime() : 0;
        return dateB - dateA;
      })[0]?.DataPagamento;

    const periodo = `01/${String(mes + 1).padStart(2, "0")}/${ano} até 25/${String(mes + 1).padStart(2, "0")}/${ano}`;
    return {
      total,
      quantidade: consultas > 0 ? consultas : entries.length,
      periodo,
      pagamento: ultimoPagamento ? formatDate(ultimoPagamento) : "-",
    };
  }, [pagamentosPsicologos]);

  // Dia da semana e data atual
  const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const hojeDate = new Date();
  const diaSemana = diasSemana[hojeDate.getDay()];
  const diaAtualFormatado = `${String(hojeDate.getDate()).padStart(2, "0")}/${String(hojeDate.getMonth() + 1).padStart(2, "0")}/${hojeDate.getFullYear()}`;

  // Cálculo dos totais
  const totalReceber = estatisticas?.totalEntradas ?? 0;
  const totalPagar = estatisticas?.totalSaidas ?? 0;
  const lucro = estatisticas?.saldoLiquido ?? totalReceber - totalPagar;

  return (
    <main className="w-full p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">Financeiro</h1>
            <p className="text-xs sm:text-sm text-gray-500">{diaSemana} - {diaAtualFormatado}</p>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {isLoading && (
          <div className="mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            Carregando dados reais da plataforma...
          </div>
        )}
      </motion.div>

      {/* Resumo financeiro */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6"
      >
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 hover:shadow-md transition-shadow">
          <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Total a receber</span>
          <span className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrency(totalReceber)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 hover:shadow-md transition-shadow">
          <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Total a pagar</span>
          <span className="text-2xl sm:text-3xl font-bold text-red-600">{formatCurrency(totalPagar)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
          <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Lucro</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#8494E9]">{formatCurrency(lucro)}</span>
        </div>
      </motion.div>

      {/* Cards com gráficos */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6"
      >
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-3 sm:p-4 md:p-5">
          <div className="flex w-full justify-between items-center mb-3 sm:mb-4 gap-2">
            <span className="text-sm sm:text-base font-semibold text-gray-800">Pacientes</span>
            <select
              className="border border-gray-200 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-[#8494E9] focus:border-transparent outline-none"
              value={graficoPaciente}
              onChange={e => setGraficoPaciente(e.target.value)}
            >
              <option value="doughnut">Pizza</option>
              <option value="bar">Barra</option>
              <option value="line">Linha</option>
            </select>
          </div>
          <div className="w-full flex justify-center items-center" style={{ minHeight: 160 }}>
            {renderGrafico(graficoPaciente, pacientesData)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-3 sm:p-4 md:p-5">
          <div className="flex w-full justify-between items-center mb-3 sm:mb-4 gap-2">
            <span className="text-sm sm:text-base font-semibold text-gray-800">Psicólogos</span>
            <select
              className="border border-gray-200 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-[#8494E9] focus:border-transparent outline-none"
              value={graficoPsicologo}
              onChange={e => setGraficoPsicologo(e.target.value)}
            >
              <option value="doughnut">Pizza</option>
              <option value="bar">Barra</option>
              <option value="line">Linha</option>
            </select>
          </div>
          <div className="w-full flex justify-center items-center" style={{ minHeight: 160 }}>
            {renderGrafico(graficoPsicologo, psicologosData)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-3 sm:p-4 md:p-5">
          <div className="flex w-full justify-between items-center mb-3 sm:mb-4 gap-2">
            <span className="text-sm sm:text-base font-semibold text-gray-800">Plataforma</span>
            <select
              className="border border-gray-200 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-[#8494E9] focus:border-transparent outline-none"
              value={graficoPlataforma}
              onChange={e => setGraficoPlataforma(e.target.value)}
            >
              <option value="doughnut">Pizza</option>
              <option value="bar">Barra</option>
              <option value="line">Linha</option>
            </select>
          </div>
          <div className="w-full flex justify-center items-center" style={{ minHeight: 160 }}>
            {renderGrafico(graficoPlataforma, plataformaData)}
          </div>
        </div>
      </motion.div>

      {/* Fatura do Psicólogo */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 text-gray-800">Fatura do Psicólogo</h2>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="text-xs sm:text-sm text-gray-600">Período: <span className="font-semibold text-gray-800">{faturaPsicologo.periodo}</span></div>
            <div className="text-xs sm:text-sm text-gray-600">Pagamento: <span className="font-semibold text-gray-800">{faturaPsicologo.pagamento}</span></div>
            <div className="text-xs sm:text-sm text-gray-600">Consultas realizadas: <span className="font-semibold text-gray-800">{faturaPsicologo.quantidade}</span></div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#8494E9] whitespace-nowrap">
            {formatCurrency(faturaPsicologo.total)}
          </div>
        </div>
      </motion.div>

      {/* Filtros consolidados */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 mb-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Buscar paciente ou psicólogo..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FilterIcon />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="Todos">Todos Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={psicologoFiltro}
            onChange={(e) => setPsicologoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Psicólogos</option>
            {psicologoOptions.map((psicologo) => (
              <option key={psicologo} value={psicologo}>{psicologo}</option>
            ))}
          </select>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={tipoPlanoFiltro}
            onChange={(e) => setTipoPlanoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Planos</option>
            {tipoPlanoOptions.map((tipoPlano) => (
              <option key={tipoPlano} value={tipoPlano}>{tipoPlano}</option>
            ))}
          </select>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={tipoLancamentoFiltro}
            onChange={(e) => setTipoLancamentoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Lançamentos</option>
            {tipoLancamentoOptions.map((tipoLancamento) => (
              <option key={tipoLancamento} value={tipoLancamento}>{tipoLancamento}</option>
            ))}
          </select>
        </div>

        {/* Info de total e paginação */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600">
            {total > 0 ? (
              <>Total: <span className="text-[#8494E9] font-semibold">{total}</span> {total === 1 ? 'lançamento' : 'lançamentos'}</>
            ) : (
              "Nenhum lançamento encontrado"
            )}
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >
              ← Anterior
            </button>
            <span className="text-xs sm:text-sm font-medium text-gray-600 px-2 sm:px-3">
              {pagina} / {totalPaginas || 1}
            </span>
            <button
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas || totalPaginas === 0}
            >
              Próxima →
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabela consolidada */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
              <tr>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Data</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Paciente</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Psicólogo</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Tipo Lançamento</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Tipo Plano</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Valor</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Vencimento</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Status</th>
                <th className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {financeiroPaginado.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">💰</span>
                      <p className="text-gray-500 font-medium">Nenhum lançamento encontrado</p>
                      <p className="text-sm text-gray-400">Tente ajustar os filtros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                financeiroPaginado.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">{formatDate(item.data)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 truncate max-w-[120px]">
                      {item.paciente && item.paciente !== "-" ? item.paciente : "-"}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 truncate max-w-[120px]">
                      {item.psicologo && item.psicologo !== "-" ? item.psicologo : "-"}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">{item.tipoLancamento}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">
                      {item.tipoPlano !== "-" ? item.tipoPlano : "-"}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(item.valor)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{formatDate(item.vencimento)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button 
                          className="p-1 sm:p-1.5 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded transition-all"
                          title="Visualizar"
                        >
                          <EyeIcon />
                        </button>
                        <button 
                          className="p-1 sm:p-1.5 text-gray-400 hover:text-[#8494E9] hover:bg-[#8494E9]/5 rounded transition-all"
                          title="Editar"
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </main>
  );
}