"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { admPsicologoService } from "@/services/admPsicologoService";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";

interface Consulta {
  Id: string;
  Date: string;
  Time: string;
  Status: string;
  Paciente?: {
    Nome?: string;
    Images?: Array<{ Url?: string }>;
  };
}

interface TaxaOcupacao {
  disponivel: number;
  reservado: number;
  andamento: number;
  concluido: number;
  percentualOcupacao: number;
  percentualReservado: number;
}

interface ModalOcupacaoAgendaProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalOcupacaoAgenda({ isOpen, onClose }: ModalOcupacaoAgendaProps) {
  useEscapeKey(isOpen, onClose);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [taxaOcupacao, setTaxaOcupacao] = useState<TaxaOcupacao | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "reservadas" | "concluidas" | "canceladas">("todos");
  const [buscaPaciente, setBuscaPaciente] = useState("");

  const fetchData = async () => {
    setError(null);
    try {
      // Busca taxa de ocupação
      const taxaResult = await admPsicologoService().taxaOcupacao();
      setTaxaOcupacao(taxaResult.data || null);
    } catch (err) {
      console.error("Erro ao buscar taxa de ocupação:", err);
      setError("Erro ao carregar taxa de ocupação");
    }
  };

  const fetchConsultasData = useCallback(async () => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const dataInicial = primeiroDiaMes.toISOString().split('T')[0];
    const dataFinal = ultimoDiaMes.toISOString().split('T')[0];

    // Determina o status baseado no filtro
    let statusFiltro: "todos" | "efetuada" | "cancelada" = "todos";
    if (filtroStatus === "concluidas") {
      statusFiltro = "efetuada";
    } else if (filtroStatus === "canceladas") {
      statusFiltro = "cancelada";
    }

    const result = await admPsicologoService().listarHistoricoConsultas({
      status: statusFiltro,
      buscaPaciente: buscaPaciente || undefined,
      dataInicial,
      dataFinal,
      page,
      pageSize,
    });

    // Filtra consultas baseado no filtro selecionado
    let consultasFiltradas = result.data?.data || [];
    
    if (filtroStatus === "reservadas") {
      consultasFiltradas = consultasFiltradas.filter((c: Consulta) => {
        const status = c.Status?.toLowerCase() || '';
        return status === 'reservado' || status === 'agendada' || status === 'agendado' || status === 'emandamento';
      });
    }

    setConsultas(consultasFiltradas);
    setTotalPages(result.data?.totalPages || 1);
    setTotal(result.data?.total || 0);
    
    return result;
  }, [filtroStatus, buscaPaciente, page, pageSize]);

  const fetchConsultas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchConsultasData();
    } catch (err) {
      console.error("Erro ao buscar consultas:", err);
      setError("Erro ao carregar consultas");
      setConsultas([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchConsultasData]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchData();
      fetchConsultas();
    }
  }, [isOpen, fetchConsultas]);

  useEffect(() => {
    if (isOpen) {
      fetchConsultas();
    }
  }, [page, filtroStatus, buscaPaciente, isOpen, fetchConsultas]);

  const handleLimparFiltros = () => {
    setBuscaPaciente("");
    setFiltroStatus("todos");
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const parts = time.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Desktop Modal */}
          <motion.div
            className="hidden lg:flex fixed inset-0 z-50 items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-transparent"
              onClick={onClose}
            />
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative z-10"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#232A5C] relative">
                <div className="flex-1 flex justify-center">
                  <h2 className="text-lg font-bold text-white">Ocupação de agenda</h2>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#6D75C0] transition"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Taxa de Ocupação e Filtros */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  {/* Taxa de Ocupação */}
                  {taxaOcupacao && (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Taxa de ocupação do mês</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Disponível</p>
                          <p className="text-lg font-bold text-green-600">{taxaOcupacao.disponivel}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Reservado</p>
                          <p className="text-lg font-bold text-blue-600">{taxaOcupacao.reservado}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Em andamento</p>
                          <p className="text-lg font-bold text-yellow-600">{taxaOcupacao.andamento}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Concluído</p>
                          <p className="text-lg font-bold text-purple-600">{taxaOcupacao.concluido}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Ocupação</p>
                          <p className="text-lg font-bold text-[#444D9D]">{taxaOcupacao.percentualOcupacao}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filtros */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Busca por Paciente */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Buscar paciente
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nome do paciente..."
                          value={buscaPaciente}
                          onChange={(e) => setBuscaPaciente(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C]"
                        />
                        {buscaPaciente && (
                          <button
                            onClick={() => setBuscaPaciente("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtro de Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value as "todos" | "reservadas" | "concluidas" | "canceladas")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C] bg-white"
                      >
                        <option value="todos">Todas</option>
                        <option value="reservadas">Reservadas</option>
                        <option value="concluidas">Concluídas</option>
                        <option value="canceladas">Canceladas</option>
                      </select>
                    </div>
                  </div>

                  {/* Paginação Superior */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Total: <span className="font-semibold">{total}</span> consultas
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1 || isLoading}
                          className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-600 min-w-[100px] text-center">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || isLoading}
                          className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botão Limpar Filtros */}
                  {(buscaPaciente || filtroStatus !== "todos") && (
                    <div className="mt-4">
                      <button
                        onClick={handleLimparFiltros}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabela/Cards */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#232A5C]"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                  ) : consultas.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">
                        Não há consultas encontradas com os filtros selecionados.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Table Desktop */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-50">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paciente</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Horário</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consultas.map((consulta) => {
                              const statusInfo = getStatusTagInfo(consulta.Status);
                              return (
                                <tr key={consulta.Id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                                    {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    {formatDate(consulta.Date)}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    {formatTime(consulta.Time)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                                      {statusInfo.texto}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cards Mobile */}
                      <div className="md:hidden space-y-3">
                        {consultas.map((consulta) => {
                          const statusInfo = getStatusTagInfo(consulta.Status);
                          return (
                            <div
                              key={consulta.Id}
                              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-sm text-gray-900">
                                  {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
                                </p>
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                                  {statusInfo.texto}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {formatDate(consulta.Date)} às {formatTime(consulta.Time)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Paginação Inferior */}
                {totalPages > 1 && !isLoading && consultas.length > 0 && (
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} consultas
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition font-medium"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-600 min-w-[100px] text-center">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-4 py-2 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition font-medium"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile Modal */}
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header Mobile */}
            <div className="relative flex flex-col items-center p-4 border-b border-[#E3E4F3] bg-[#232A5C]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-white hover:text-gray-200 transition"
                aria-label="Fechar"
              >
                ×
              </button>
              <h2 className="text-base font-semibold text-white mb-2 text-center">
                Ocupação de agenda
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Taxa de Ocupação e Filtros Mobile */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                {/* Taxa de Ocupação */}
                {taxaOcupacao && (
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">Taxa de ocupação</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Disponível</p>
                        <p className="text-sm font-bold text-green-600">{taxaOcupacao.disponivel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Reservado</p>
                        <p className="text-sm font-bold text-blue-600">{taxaOcupacao.reservado}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Ocupação</p>
                        <p className="text-sm font-bold text-[#444D9D]">{taxaOcupacao.percentualOcupacao}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtros Mobile */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Buscar paciente
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do paciente..."
                    value={buscaPaciente}
                    onChange={(e) => setBuscaPaciente(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value as "todos" | "reservadas" | "concluidas" | "canceladas")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C] bg-white"
                  >
                    <option value="todos">Todas</option>
                    <option value="reservadas">Reservadas</option>
                    <option value="concluidas">Concluídas</option>
                    <option value="canceladas">Canceladas</option>
                  </select>
                </div>
                {(buscaPaciente || filtroStatus !== "todos") && (
                  <button
                    onClick={handleLimparFiltros}
                    className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                  >
                    Limpar filtros
                  </button>
                )}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || isLoading}
                        className="px-3 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-4 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#232A5C]"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 text-red-500">{error}</div>
                ) : consultas.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                      Não há consultas encontradas com os filtros selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {consultas.map((consulta) => {
                      const statusInfo = getStatusTagInfo(consulta.Status);
                      return (
                        <div
                          key={consulta.Id}
                          className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm text-gray-900">
                              {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
                            </p>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                              {statusInfo.texto}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {formatDate(consulta.Date)} às {formatTime(consulta.Time)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paginação Inferior Mobile */}
              {totalPages > 1 && !isLoading && consultas.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {page}/{totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-medium"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 text-xs rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-medium"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

