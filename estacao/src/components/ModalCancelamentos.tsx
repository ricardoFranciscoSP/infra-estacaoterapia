import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmCancelamentos, type Cancelamento } from "@/hooks/admin/useAdmCancelamentos";
import { api } from "@/lib/axios";
import toast from "react-hot-toast";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, X } from "lucide-react";
import Image from "next/image";

interface ModalCancelamentosProps {
  open: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const ModalCancelamentos: React.FC<ModalCancelamentosProps> = ({ open, onClose, onStatusUpdated }) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  const { cancelamentos, isLoading, refetch } = useAdmCancelamentos('EmAnalise');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Estados para edição de status
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Estados para visualização de documento
  const [documentoModal, setDocumentoModal] = useState<{
    open: boolean;
    loading: boolean;
    url: string | null;
    nome: string;
    error: string | null;
  }>({
    open: false,
    loading: false,
    url: null,
    nome: '',
    error: null
  });

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

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "emanalise" || statusLower === "em_analise") {
      return "bg-yellow-100 text-yellow-700";
    }
    if (statusLower === "deferido") {
      return "bg-green-100 text-green-700";
    }
    if (statusLower === "indeferido") {
      return "bg-red-100 text-red-700";
    }
    if (statusLower === "cancelado") {
      return "bg-gray-100 text-gray-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  const formatStatus = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "emanalise" || statusLower === "em_analise") {
      return "Em Análise";
    }
    if (statusLower === "deferido") {
      return "Deferido";
    }
    if (statusLower === "indeferido") {
      return "Indeferido";
    }
    if (statusLower === "cancelado") {
      return "Cancelado";
    }
    return status;
  };


  // Obter documento completo (para visualização)
  const getDocument = (cancelamento: { Documents?: Array<{ Url?: string; Id?: string; Type?: string; Description?: string }>; LinkDock?: string }): { url: string; id?: string; type?: string; description?: string } | null => {
    const documents = cancelamento.Documents;
    if (documents && documents.length > 0) {
      return {
        url: documents[0].Url || '',
        id: documents[0].Id,
        type: documents[0].Type,
        description: documents[0].Description || undefined
      };
    }
    if (cancelamento.LinkDock) {
      return {
        url: cancelamento.LinkDock
      };
    }
    return null;
  };

  // Função para obter URL assinada do documento
  const getSignedDocumentUrl = async (documentId: string): Promise<string | null> => {
    try {
      const response = await api.get(`/files/documents/${documentId}`);
      return response.data?.url || null;
    } catch (error) {
      console.error('[getSignedDocumentUrl] Erro ao buscar URL assinada:', error);
      return null;
    }
  };

  // Função para abrir modal de visualização de documento
  const handleVisualizarDocumento = async (cancelamento: Cancelamento) => {
    const documento = getDocument(cancelamento);
    if (!documento) {
      toast.error('Documento não encontrado');
      return;
    }

    setDocumentoModal({
      open: true,
      loading: true,
      url: null,
      nome: documento.type || 'Documento de cancelamento',
      error: null
    });

    try {
      // Se tiver ID, busca URL assinada
      if (documento.id) {
        const signedUrl = await getSignedDocumentUrl(documento.id);
        if (signedUrl) {
          setDocumentoModal(prev => ({ ...prev, loading: false, url: signedUrl }));
          return;
        }
      }
      
      // Fallback para URL direta
      if (documento.url) {
        setDocumentoModal(prev => ({ ...prev, loading: false, url: documento.url! }));
      } else {
        setDocumentoModal(prev => ({ ...prev, loading: false, error: 'URL do documento não disponível' }));
      }
    } catch (error) {
      console.error('Erro ao carregar documento:', error);
      setDocumentoModal(prev => ({ ...prev, loading: false, error: 'Erro ao carregar documento' }));
    }
  };

  const filteredCancelamentos = useMemo(() => {
    if (!cancelamentos || cancelamentos.length === 0) return [];

    return cancelamentos.filter((cancelamento) => {
      const protocolo = (cancelamento.Protocolo || "").toLowerCase();
      const motivo = (cancelamento.Motivo || "").toLowerCase();
      const status = cancelamento.Status || "";
      const data = cancelamento.Data || "";
      const autor = cancelamento.Autor;
      const sessao = cancelamento.Sessao;
      const psicologo = sessao?.Psicologo;
      
      const nomePaciente = (autor?.Nome || "").toLowerCase();
      const nomePsicologo = (psicologo?.Nome || "").toLowerCase();
      const emailPaciente = (autor?.Email || "").toLowerCase();
      const emailPsicologo = (psicologo?.Email || "").toLowerCase();

      // Filtro de busca
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        protocolo.includes(searchLower) ||
        motivo.includes(searchLower) ||
        nomePaciente.includes(searchLower) ||
        nomePsicologo.includes(searchLower) ||
        emailPaciente.includes(searchLower) ||
        emailPsicologo.includes(searchLower);

      // Filtro de status
      const matchesStatus = !statusFilter || status === statusFilter;

      // Filtro de data
      const matchesDate = !dateFilter || formatDate(data) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [cancelamentos, searchTerm, statusFilter, dateFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredCancelamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCancelamentos = filteredCancelamentos.slice(startIndex, endIndex);

  // Resetar página quando filtros mudarem
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, itemsPerPage]);

  // Obter status únicos para o filtro
  const uniqueStatuses = useMemo(() => {
    if (!cancelamentos || cancelamentos.length === 0) return [];
    const statuses = new Set<string>();
    cancelamentos.forEach((c) => {
      const status = c.Status;
      if (status) statuses.add(status);
    });
    return Array.from(statuses);
  }, [cancelamentos]);

  // Obter datas únicas para o filtro
  const uniqueDates = useMemo(() => {
    if (!cancelamentos || cancelamentos.length === 0) return [];
    const dates = new Set<string>();
    cancelamentos.forEach((c) => {
      const data = c.Data;
      if (data) {
        const formatted = formatDate(data);
        if (formatted) dates.add(formatted);
      }
    });
    return Array.from(dates).sort().reverse();
  }, [cancelamentos]);

  // Função para atualizar status
  const handleUpdateStatus = async (cancelamentoId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await api.patch(`/cancelamento/${cancelamentoId}/status`, { status: newStatus });
      toast.success("Status atualizado com sucesso!");
      setEditingStatusId(null);
      refetch();
      // Notificar o componente pai para atualizar o card
      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || "Erro ao atualizar status"
        : "Erro ao atualizar status";
      toast.error(errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full h-[60px] bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] flex items-center justify-between px-6 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Consultas Canceladas</h2>
              <button
                onClick={onClose}
                className="text-white text-2xl font-bold hover:text-gray-200 transition-colors"
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>

            {/* Filtros */}
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Busca */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Buscar
                  </label>
                  <input
                    type="text"
                    placeholder="Protocolo, paciente, psicólogo, motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                  />
                </div>

                {/* Filtro de Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] bg-white"
                  >
                    <option value="">Todos</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Data */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Data
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] bg-white"
                  >
                    <option value="">Todas</option>
                    {uniqueDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info de resultados */}
              <div className="mt-3 text-xs text-gray-600">
                Mostrando {paginatedCancelamentos.length} de {filteredCancelamentos.length} cancelamento(s)
                {filteredCancelamentos.length !== (cancelamentos?.length || 0) && (
                  <span> (filtrado de {cancelamentos?.length || 0} total)</span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
                  <span className="ml-3 text-gray-600">Carregando cancelamentos...</span>
                </div>
              ) : filteredCancelamentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg">
                    {searchTerm || statusFilter || dateFilter
                      ? "Nenhum cancelamento encontrado com os filtros aplicados"
                      : "Nenhum cancelamento encontrado"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Protocolo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Paciente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Psicólogo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Motivo
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Doc
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedCancelamentos.map((cancelamento) => {
                        // Usa apenas PascalCase conforme o tipo Cancelamento
                        const id = cancelamento.Id;
                        const protocolo = cancelamento.Protocolo;
                        const motivo = cancelamento.Motivo;
                        const status = cancelamento.Status;
                        const data = cancelamento.Data;
                        const horario = cancelamento.Horario;
                        const autor = cancelamento.Autor;
                        const sessao = cancelamento.Sessao;
                        const psicologo = sessao?.Psicologo;
                        
                        return (
                          <tr key={id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {protocolo || "N/A"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {autor?.Nome || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {autor?.Email || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {psicologo?.Nome || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {psicologo?.Email || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(data)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {horario || ""}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={motivo}>
                                {motivo || "N/A"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(() => {
                                const documento = getDocument(cancelamento);
                                
                                // Mostra documento se existir (não apenas força maior)
                                if (documento && documento.url) {
                                  return (
                                    <button
                                      onClick={() => handleVisualizarDocumento(cancelamento)}
                                      className="inline-flex items-center justify-center w-8 h-8 text-[#8494E9] hover:text-[#6B7FD7] hover:bg-[#8494E9]/10 rounded-lg transition-colors"
                                      title="Visualizar documento"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  );
                                }
                                return <span className="text-gray-400">-</span>;
                              })()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {editingStatusId === id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={status}
                                    onChange={(e) => handleUpdateStatus(id, e.target.value)}
                                    disabled={updatingStatus}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#8494E9] bg-white"
                                    autoFocus
                                  >
                                    <option value="EmAnalise">Em Análise</option>
                                    <option value="Deferido">Deferido</option>
                                    <option value="Indeferido">Indeferido</option>
                                    <option value="Cancelado">Cancelado</option>
                                  </select>
                                  <button
                                    onClick={() => setEditingStatusId(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                    disabled={updatingStatus}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingStatusId(id)}
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${getStatusBadge(
                                    status
                                  )}`}
                                  title="Clique para editar status"
                                >
                                  {formatStatus(status)}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer com Paginação */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Itens por página:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9] bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-[#8494E9] text-white"
                            : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>

              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages || 1}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de visualização de documento */}
      <Dialog open={documentoModal.open} onOpenChange={(open) => {
        if (!open) {
          setDocumentoModal({ open: false, loading: false, url: null, nome: '', error: null });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Visualizar Documento</span>
              <button
                onClick={() => setDocumentoModal({ open: false, loading: false, url: null, nome: '', error: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {documentoModal.loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando documento...</p>
                </div>
              </div>
            ) : documentoModal.error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600">{documentoModal.error}</p>
                </div>
              </div>
            ) : documentoModal.url ? (
              <div className="flex flex-col gap-4">
                {(() => {
                  const urlStr = documentoModal.url.toLowerCase();
                  const nameStr = (documentoModal.nome || "").toLowerCase();
                  const endsWithExt = (s: string, ext: string) => new RegExp(`\\.${ext}(\\?|$)`, "i").test(s);
                  const isPDF = endsWithExt(urlStr, "pdf") || endsWithExt(nameStr, "pdf");
                  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
                  const isDoc = ["doc", "docx"].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
                  const officeViewerUrl = isDoc && documentoModal.url ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentoModal.url)}` : undefined;

                  if (isPDF) {
                    return (
                      <iframe
                        src={documentoModal.url}
                        className="w-full h-[70vh] border rounded-lg"
                        title="Documento PDF"
                      />
                    );
                  } else if (isImage) {
                    return (
                      <div className="flex justify-center">
                        <Image
                          src={documentoModal.url || ''}
                          alt="Documento"
                          width={800}
                          height={600}
                          className="max-w-full max-h-[70vh] rounded-lg border object-contain"
                        />
                      </div>
                    );
                  } else if (isDoc && officeViewerUrl) {
                    return (
                      <div className="flex flex-col gap-3">
                        <iframe
                          src={officeViewerUrl}
                          title="Documento do Word"
                          className="w-full h-[70vh] border rounded-lg"
                        />
                        <p className="text-xs text-gray-500">
                          Pré-visualização fornecida pelo Microsoft Office Viewer. Caso não carregue, utilize o botão Baixar abaixo.
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
                        <FileText className="w-12 h-12 text-gray-400" />
                        <p className="text-sm">Tipo de arquivo não suportado para visualização no navegador.</p>
                        <p className="text-xs text-gray-500">Clique em Baixar para abrir no aplicativo apropriado.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            ) : null}
          </div>

          {documentoModal.url && (
            <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50">
              <span className="text-xs sm:text-sm text-gray-600">
                Clique em &ldquo;Baixar&rdquo; para salvar o documento
              </span>
              <a
                href={documentoModal.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Baixar documento
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
};

export default ModalCancelamentos;
