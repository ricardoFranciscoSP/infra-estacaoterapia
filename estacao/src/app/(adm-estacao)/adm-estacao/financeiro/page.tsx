"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
// ⚡ PERFORMANCE: Chart.js carregado dinamicamente (lazy load) - reduz bundle inicial em ~200KB
import { LazyBarChart, LazyLineChart, LazyDoughnutChart } from '@/components/charts/LazyChartWrapper';
import type { ChartData } from 'chart.js';

const mockFinanceiro = [
  // Planos
  { data: "10/06/2024", paciente: "Lucas Martins", psicologo: "Dr. Ana", tipoLancamento: "Plano", tipoPlano: "Semestral", valor: 200, status: "Pago", vencimento: "15/06/2024" },
  { data: "09/06/2024", paciente: "Juliana Costa", psicologo: "Dr. João", tipoLancamento: "Plano", tipoPlano: "Trimestral", valor: 180, status: "Pendente", vencimento: "14/06/2024" },
  { data: "08/06/2024", paciente: "Pedro Henrique", psicologo: "Dr. Ana", tipoLancamento: "Plano", tipoPlano: "Mensal", valor: 220, status: "Pago", vencimento: "13/06/2024" },
  { data: "07/06/2024", paciente: "Amanda Rocha", psicologo: "Dr. João", tipoLancamento: "Plano", tipoPlano: "Trimestral", valor: 150, status: "Pago", vencimento: "12/06/2024" },
  { data: "06/06/2024", paciente: "Bruno Silva", psicologo: "Dr. Ana", tipoLancamento: "Plano", tipoPlano: "Semestral", valor: 180, status: "Pendente", vencimento: "11/06/2024" },
  // Primeira Consulta
  { data: "12/06/2024", paciente: "Lucas Martins", psicologo: "Dr. Ana", tipoLancamento: "Primeira Consulta", tipoPlano: "-", valor: 39.90, status: "Pago", vencimento: "12/06/2024" },
  // Consultas Avulsas
  { data: "13/06/2024", paciente: "Amanda Rocha", psicologo: "Dr. Carla", tipoLancamento: "Consulta Avulsa", tipoPlano: "-", valor: 79.90, status: "Pago", vencimento: "13/06/2024" },
  { data: "12/06/2024", paciente: "Juliana Costa", psicologo: "Dr. João", tipoLancamento: "Consulta Avulsa", tipoPlano: "-", valor: 79.90, status: "Pendente", vencimento: "12/06/2024" },
  // Psicólogos
  { data: "10/06/2024", paciente: "-", psicologo: "Dr. Ana", tipoLancamento: "Psicologo", tipoPlano: "-", valor: 120, status: "Pago", vencimento: "25/06/2024" },
  { data: "09/06/2024", paciente: "-", psicologo: "Dr. João", tipoLancamento: "Psicologo", tipoPlano: "-", valor: 100, status: "Pendente", vencimento: "25/06/2024" },
  { data: "11/06/2024", paciente: "-", psicologo: "Dr. Carla", tipoLancamento: "Psicologo", tipoPlano: "-", valor: 130, status: "Solicitado Saque", vencimento: "25/06/2024" },
];

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

// Função para calcular fatura do psicólogo
function getFaturaPsicologo(mes: string, ano: string) {
  // Filtra consultas realizadas (Primeira Consulta e Consulta Avulsa) no período de 01 a 25 do mês
  const consultas = mockFinanceiro.filter(item => {
    if (
      (item.tipoLancamento === "Primeira Consulta" || item.tipoLancamento === "Consulta Avulsa") &&
      item.data.endsWith(`/${mes}/${ano}`)
    ) {
      const dia = parseInt(item.data.split("/")[0]);
      return dia >= 1 && dia <= 25;
    }
    return false;
  });
  // Soma total (R$ 20,00 por consulta)
  const total = consultas.length * 20;
  return {
    total,
    quantidade: consultas.length,
    periodo: `01/${mes}/${ano} até 25/${mes}/${ano}`,
    pagamento: `30/${mes}/${ano}`
  };
}

export default function FinanceiroPage() {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [psicologoFiltro, setPsicologoFiltro] = useState("Todos");
  const [tipoPlanoFiltro, setTipoPlanoFiltro] = useState("Todos");
  const [tipoLancamentoFiltro, setTipoLancamentoFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  // Filtros consolidados
  const financeiroFiltrado = mockFinanceiro.filter((item) =>
    (busca === "" || (item.paciente && item.paciente.toLowerCase().includes(busca.toLowerCase())) || (item.psicologo && item.psicologo.toLowerCase().includes(busca.toLowerCase()))) &&
    (statusFiltro === "Todos" || item.status === statusFiltro) &&
    (psicologoFiltro === "Todos" || item.psicologo === psicologoFiltro) &&
    (tipoPlanoFiltro === "Todos" || item.tipoPlano === tipoPlanoFiltro) &&
    (tipoLancamentoFiltro === "Todos" || item.tipoLancamento === tipoLancamentoFiltro)
  );

  const total = financeiroFiltrado.length;
  const totalPaginas = Math.ceil(total / porPagina);
  const financeiroPaginado = financeiroFiltrado.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Dados para gráficos (exemplo simples)
  const pacientesData: ChartData<"doughnut" | "bar" | "line"> = {
    labels: ["Semestral", "Trimestral", "Mensal"],
    datasets: [
      {
        data: [
          mockFinanceiro.filter(f => f.tipoPlano === "Semestral").length,
          mockFinanceiro.filter(f => f.tipoPlano === "Trimestral").length,
          mockFinanceiro.filter(f => f.tipoPlano === "Mensal").length,
        ],
        backgroundColor: ["#8494E9", "#F2C94C", "#6FCF97"],
      },
    ],
  };
  const psicologosData: ChartData<"doughnut" | "bar" | "line"> = {
    labels: ["Dr. Ana", "Dr. João", "Dr. Carla"],
    datasets: [
      {
        data: [
          mockFinanceiro.filter(f => f.psicologo === "Dr. Ana").length,
          mockFinanceiro.filter(f => f.psicologo === "Dr. João").length,
          mockFinanceiro.filter(f => f.psicologo === "Dr. Carla").length,
        ],
        backgroundColor: ["#6FCF97", "#EB5757", "#BB6BD9"],
      },
    ],
  };
  const plataformaData: ChartData<"doughnut" | "bar" | "line"> = {
    labels: ["Pago", "Pendente", "Solicitado Saque"],
    datasets: [
      {
        data: [
          mockFinanceiro.filter(f => f.status === "Pago").length,
          mockFinanceiro.filter(f => f.status === "Pendente").length,
          mockFinanceiro.filter(f => f.status === "Solicitado Saque").length,
        ],
        backgroundColor: ["#56CCF2", "#F2C94C", "#BB6BD9"],
      },
    ],
  };

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

  // Fatura do psicólogo do mês atual
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
  const anoAtual = String(hoje.getFullYear());
  const faturaPsicologo = getFaturaPsicologo(mesAtual, anoAtual);

  // Dia da semana e data atual
  const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const hojeDate = new Date();
  const diaSemana = diasSemana[hojeDate.getDay()];
  const diaAtualFormatado = `${String(hojeDate.getDate()).padStart(2, "0")}/${String(hojeDate.getMonth() + 1).padStart(2, "0")}/${hojeDate.getFullYear()}`;

  // Cálculo dos totais
  const totalReceber = mockFinanceiro
    .filter(item => item.tipoLancamento === "Psicologo" && (item.status === "Pago" || item.status === "Solicitado Saque"))
    .reduce((acc, item) => acc + item.valor, 0);

  const totalPagar = mockFinanceiro
    .filter(item => item.tipoLancamento !== "Psicologo" && item.status === "Pendente")
    .reduce((acc, item) => acc + item.valor, 0);

  const lucro = totalReceber - totalPagar;

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
          <span className="text-2xl sm:text-3xl font-bold text-green-600">R$ {totalReceber.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 hover:shadow-md transition-shadow">
          <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Total a pagar</span>
          <span className="text-2xl sm:text-3xl font-bold text-red-600">R$ {totalPagar.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
          <span className="text-xs sm:text-sm font-medium text-gray-500 block mb-1">Lucro</span>
          <span className="text-2xl sm:text-3xl font-bold text-[#8494E9]">R$ {lucro.toFixed(2)}</span>
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
            R$ {faturaPsicologo.total.toFixed(2)}
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
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Solicitado Saque">Solicitado Saque</option>
            </select>
          </div>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={psicologoFiltro}
            onChange={(e) => setPsicologoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Psicólogos</option>
            <option value="Dr. Ana">Dr. Ana</option>
            <option value="Dr. João">Dr. João</option>
            <option value="Dr. Carla">Dr. Carla</option>
          </select>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={tipoPlanoFiltro}
            onChange={(e) => setTipoPlanoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Planos</option>
            <option value="Semestral">Semestral</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Mensal">Mensal</option>
          </select>
          <select
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
            value={tipoLancamentoFiltro}
            onChange={(e) => setTipoLancamentoFiltro(e.target.value)}
          >
            <option value="Todos">Todos Lançamentos</option>
            <option value="Plano">Plano</option>
            <option value="Primeira Consulta">Primeira Consulta</option>
            <option value="Consulta Avulsa">Consulta Avulsa</option>
            <option value="Psicologo">Psicólogo</option>
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
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-700 font-medium whitespace-nowrap">{item.data}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 truncate max-w-[120px]">
                      {item.tipoLancamento === "Psicologo" ? "-" : (item.paciente !== "-" ? item.paciente : "-")}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 truncate max-w-[120px]">
                      {(item.tipoLancamento === "Plano" || item.tipoLancamento === "Primeira Consulta" || item.tipoLancamento === "Consulta Avulsa")
                        ? "-" : item.psicologo}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">{item.tipoLancamento}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">
                      {item.tipoLancamento === "Psicologo" ? "-" : (item.tipoPlano !== "-" ? item.tipoPlano : "-")}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">R$ {item.valor.toFixed(2)}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{item.vencimento}</td>
                    <td className="py-3 sm:py-4 px-3 sm:px-4 md:px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${
                        item.status === "Pago" ? "bg-green-50 text-green-700 border border-green-200"
                        : item.status === "Pendente" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : item.status === "Solicitado Saque" ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-gray-50 text-gray-700 border border-gray-200"
                      }`}>
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