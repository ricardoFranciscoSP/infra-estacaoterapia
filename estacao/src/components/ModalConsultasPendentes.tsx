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

interface ModalConsultasPendentesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalConsultasPendentes({ isOpen, onClose }: ModalConsultasPendentesProps) {
  useEscapeKey(isOpen, onClose);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchConsultas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Usa o endpoint de próximas consultas que já retorna apenas consultas futuras (pendentes)
      const result = await admPsicologoService().proximasConsultas();
      const todasConsultas = Array.isArray(result.data) ? result.data : [];

      // Ordena por data e horário (mais próximas primeiro)
      const consultasOrdenadas = todasConsultas.sort((a: Consulta, b: Consulta) => {
        // Compara primeiro pela data
        const dataA = a.Date ? new Date(a.Date).getTime() : 0;
        const dataB = b.Date ? new Date(b.Date).getTime() : 0;
        
        if (dataA !== dataB) {
          return dataA - dataB; // Ordena por data (mais antiga primeiro)
        }
        
        // Se a data for igual, ordena por horário
        const horaA = a.Time || '00:00';
        const horaB = b.Time || '00:00';
        return horaA.localeCompare(horaB); // Ordena por horário (mais cedo primeiro)
      });

      // Aplica paginação no frontend
      const inicio = (page - 1) * pageSize;
      const fim = inicio + pageSize;
      const consultasPaginadas = consultasOrdenadas.slice(inicio, fim);

      setConsultas(consultasPaginadas);
      setTotalPages(Math.max(1, Math.ceil(consultasOrdenadas.length / pageSize)));
    } catch (err) {
      console.error("Erro ao buscar consultas pendentes:", err);
      setError("Erro ao carregar consultas pendentes");
      setConsultas([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isOpen) {
      fetchConsultas();
    }
  }, [isOpen, page, fetchConsultas]);

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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative z-10"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#232A5C] relative">
                <div className="flex-1 flex justify-center">
                  <h2 className="text-lg font-bold text-white">Consultas pendentes</h2>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#6D75C0] transition"
                >
                  ×
                </button>
              </div>

              {/* Content */}
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
                      Não há consultas pendentes no momento.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {consultas.map((consulta) => {
                        const statusInfo = getStatusTagInfo(consulta.Status);
                        return (
                          <div
                            key={consulta.Id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">
                                  {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {formatDate(consulta.Date)} às {formatTime(consulta.Time)}
                                </p>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                                {statusInfo.texto}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-4 py-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-600">
                          Página {page} de {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-4 py-2 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </>
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
                Consultas pendentes
              </h2>
            </div>

            {/* Content */}
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
                    Não há consultas pendentes no momento.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {consultas.map((consulta) => {
                      const statusInfo = getStatusTagInfo(consulta.Status);
                      return (
                        <div
                          key={consulta.Id}
                          className="border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">
                                {obterPrimeiroUltimoNome(consulta.Paciente?.Nome) || "Paciente"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(consulta.Date)} às {formatTime(consulta.Time)}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.text}`}>
                              {statusInfo.texto}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Anterior
                      </button>
                      <span className="text-xs text-gray-600">
                        {page}/{totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

