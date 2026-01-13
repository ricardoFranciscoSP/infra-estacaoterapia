import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmConsultasMesAtualLista } from "@/hooks/admin/useAdmConsultas";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Calendar, Clock, Search } from "lucide-react";
import type { ConsultasRealizadas } from "@/store/admin/admConsultasStore";

interface ModalConsultasMesAtualProps {
  open: boolean;
  onClose: () => void;
}

const ModalConsultasMesAtual: React.FC<ModalConsultasMesAtualProps> = ({ open, onClose }) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const { consultas, isLoading, refetch } = useAdmConsultasMesAtualLista();
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Formatação de data
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

  // Formatação de hora
  const formatTime = (timeString: string) => {
    try {
      // Se já está no formato HH:MM, retorna
      if (timeString.includes(':')) {
        return timeString.substring(0, 5);
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  // Badge de status
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "agendada" || statusLower === "agendado") {
      return "bg-blue-100 text-blue-700";
    }
    if (statusLower === "realizada" || statusLower === "concluida" || statusLower === "concluída") {
      return "bg-green-100 text-green-700";
    }
    if (statusLower === "cancelada" || statusLower === "cancelado") {
      return "bg-red-100 text-red-700";
    }
    if (statusLower === "em andamento" || statusLower === "em_andamento") {
      return "bg-yellow-100 text-yellow-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  const formatStatus = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "agendada" || statusLower === "agendado") {
      return "Agendada";
    }
    if (statusLower === "realizada" || statusLower === "concluida" || statusLower === "concluída") {
      return "Realizada";
    }
    if (statusLower === "cancelada" || statusLower === "cancelado") {
      return "Cancelada";
    }
    if (statusLower === "em andamento" || statusLower === "em_andamento") {
      return "Em Andamento";
    }
    return status;
  };

  // Filtros aplicados
  const filteredConsultas = useMemo(() => {
    if (!consultas) return [];
    
    return consultas.filter((consulta: ConsultasRealizadas) => {
      // Filtro de busca (nome do paciente ou psicólogo)
      const searchLower = searchTerm.toLowerCase();
      const pacienteNome = consulta.Paciente?.Nome?.toLowerCase() || "";
      const psicologoNome = consulta.Psicologo?.Nome?.toLowerCase() || "";
      const matchesSearch = !searchTerm || 
        pacienteNome.includes(searchLower) || 
        psicologoNome.includes(searchLower);
      
      // Filtro de status
      const matchesStatus = !statusFilter || 
        consulta.Status?.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [consultas, searchTerm, statusFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredConsultas.length / itemsPerPage);
  const paginatedConsultas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredConsultas.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConsultas, currentPage, itemsPerPage]);

  // Status únicos para o filtro
  const uniqueStatuses = useMemo(() => {
    if (!consultas) return [];
    const statuses = new Set(consultas.map((c: ConsultasRealizadas) => c.Status).filter(Boolean));
    return Array.from(statuses);
  }, [consultas]);

  // Resetar página quando filtros mudarem
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Refetch quando modal abrir
  React.useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#212529]">
              Consultas do Mês Atual
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente ou psicólogo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] text-sm min-w-[150px]"
            >
              <option value="">Todos os status</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de consultas */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]" />
              </div>
            ) : paginatedConsultas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">
                  {filteredConsultas.length === 0 && consultas.length > 0
                    ? "Nenhuma consulta encontrada com os filtros aplicados."
                    : "Nenhuma consulta encontrada para o mês atual."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {paginatedConsultas.map((consulta: ConsultasRealizadas) => (
                    <motion.div
                      key={consulta.Id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-[#F2F4FD] flex items-center justify-center text-[#8494E9] font-semibold text-sm flex-shrink-0">
                              {consulta.Paciente?.Nome?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-[#212529] truncate">
                                {consulta.Paciente?.Nome || "Paciente não informado"}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                com {consulta.Psicologo?.Nome || "Psicólogo não informado"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 ml-13">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(consulta.Date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(consulta.Time)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(consulta.Status)}`}>
                            {formatStatus(consulta.Status)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-500">
                Mostrando {paginatedConsultas.length} de {filteredConsultas.length} consultas
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalConsultasMesAtual;
