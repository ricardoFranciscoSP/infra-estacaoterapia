"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { api } from "@/lib/axios";
import toast from "react-hot-toast";

interface PolicyDocument {
  Id: string;
  Titulo: string;
  Descricao?: string;
  Url: string;
  Tipo: "pdf" | "texto";
  PublicoPara: "paciente" | "psicologo" | "todos";
  Ordem: number;
  Ativo: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy?: {
    Id: string;
    Nome: string;
    Email: string;
  };
}

export default function GestaoDocumentosPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentEditando, setDocumentEditando] = useState<PolicyDocument | null>(null);
  const [documentExcluindo, setDocumentExcluindo] = useState<string | null>(null);

  useEscapeKey(isModalOpen, () => {
    setIsModalOpen(false);
    setDocumentEditando(null);
  });

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/policy-documents");
      setDocuments(response.data);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreate = () => {
    setDocumentEditando(null);
    setIsModalOpen(true);
  };

  const handleEdit = (doc: PolicyDocument) => {
    setDocumentEditando(doc);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }

    try {
      setDocumentExcluindo(id);
      await api.delete(`/policy-documents/${id}`);
      toast.success("Documento excluído com sucesso");
      await fetchDocuments();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      const apiError = error as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "Erro ao excluir documento");
    } finally {
      setDocumentExcluindo(null);
    }
  };

  const handleToggleActive = async (doc: PolicyDocument) => {
    try {
      await api.put(`/policy-documents/${doc.Id}`, {
        Ativo: !doc.Ativo
      });
      toast.success(`Documento ${!doc.Ativo ? 'ativado' : 'desativado'} com sucesso`);
      await fetchDocuments();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      const apiError = error as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "Erro ao alterar status");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDocumentEditando(null);
    fetchDocuments();
  };

  const getPublicoParaLabel = (publicoPara: string) => {
    switch (publicoPara) {
      case "paciente":
        return "Paciente";
      case "psicologo":
        return "Psicólogo";
      case "todos":
        return "Todos";
      default:
        return publicoPara;
    }
  };

  const getPublicoParaBadgeColor = (publicoPara: string) => {
    switch (publicoPara) {
      case "paciente":
        return "bg-blue-100 text-blue-800";
      case "psicologo":
        return "bg-purple-100 text-purple-800";
      case "todos":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestão de Documentos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie os documentos de políticas e termos da plataforma
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Documento
          </button>
        </div>
      </motion.div>

      {/* Tabela de Documentos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum documento cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Público
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.Id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{doc.Titulo}</div>
                      {doc.Descricao && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{doc.Descricao}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 uppercase">
                        {doc.Tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPublicoParaBadgeColor(doc.PublicoPara)}`}>
                        {getPublicoParaLabel(doc.PublicoPara)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.Ordem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(doc)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          doc.Ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {doc.Ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.CreatedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-[#8494E9] hover:text-[#6B7FD7] transition-colors"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(doc.Id)}
                          disabled={documentExcluindo === doc.Id}
                          className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {documentExcluindo === doc.Id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal de Criar/Editar */}
      {isModalOpen && (
        <ModalDocumento
          open={isModalOpen}
          onClose={handleCloseModal}
          documento={documentEditando}
        />
      )}
    </main>
  );
}

// Modal de Criar/Editar Documento
function ModalDocumento({
  open,
  onClose,
  documento,
}: {
  open: boolean;
  onClose: () => void;
  documento: PolicyDocument | null;
}) {
  const [formData, setFormData] = useState({
    Titulo: "",
    Descricao: "",
    Tipo: "pdf" as "pdf" | "texto",
    PublicoPara: "todos" as "paciente" | "psicologo" | "todos",
    Ordem: 0,
    Ativo: true,
    Url: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (documento) {
      setFormData({
        Titulo: documento.Titulo,
        Descricao: documento.Descricao || "",
        Tipo: documento.Tipo,
        PublicoPara: documento.PublicoPara,
        Ordem: documento.Ordem,
        Ativo: documento.Ativo,
        Url: documento.Url,
      });
    } else {
      setFormData({
        Titulo: "",
        Descricao: "",
        Tipo: "pdf",
        PublicoPara: "todos",
        Ordem: 0,
        Ativo: true,
        Url: "",
      });
    }
    setFile(null);
  }, [documento, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.Titulo || !formData.Tipo || !formData.PublicoPara) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.Tipo === "pdf" && !documento && !file) {
      toast.error("Selecione um arquivo PDF");
      return;
    }

    try {
      setIsLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("Titulo", formData.Titulo);
      formDataToSend.append("Descricao", formData.Descricao);
      formDataToSend.append("Tipo", formData.Tipo);
      formDataToSend.append("PublicoPara", formData.PublicoPara);
      formDataToSend.append("Ordem", formData.Ordem.toString());
      formDataToSend.append("Ativo", formData.Ativo.toString());
      
      if (formData.Tipo === "texto") {
        formDataToSend.append("Url", formData.Url);
      }
      
      if (file) {
        formDataToSend.append("file", file);
      }

      if (documento) {
        await api.put(`/policy-documents/${documento.Id}`, formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Documento atualizado com sucesso");
      } else {
        await api.post("/policy-documents", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Documento criado com sucesso");
      }

      onClose();
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      const apiError = error as { response?: { data?: { error?: string } } };
      toast.error(apiError.response?.data?.error || "Erro ao salvar documento");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#8494E9] px-6 py-4 flex items-center justify-center relative">
          <h2 className="text-xl font-semibold text-white text-center">
            {documento ? "Editar Documento" : "Novo Documento"}
          </h2>
          <button
            onClick={onClose}
            className="absolute right-6 text-white hover:text-gray-200 transition-colors"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={formData.Titulo}
                onChange={(e) => setFormData({ ...formData, Titulo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.Descricao}
                onChange={(e) => setFormData({ ...formData, Descricao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={formData.Tipo}
                onChange={(e) => setFormData({ ...formData, Tipo: e.target.value as "pdf" | "texto" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                required
              >
                <option value="pdf">PDF</option>
                <option value="texto">Texto</option>
              </select>
            </div>

            {formData.Tipo === "pdf" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arquivo PDF {!documento && "*"}
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                  required={!documento}
                />
                {documento && documento.Url && (
                  <p className="text-xs text-gray-500 mt-1">
                    Arquivo atual: <a href={documento.Url} target="_blank" rel="noopener noreferrer" className="text-[#8494E9] hover:underline">Ver arquivo</a>
                  </p>
                )}
              </div>
            )}

            {formData.Tipo === "texto" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Endpoint
                </label>
                <input
                  type="text"
                  value={formData.Url}
                  onChange={(e) => setFormData({ ...formData, Url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                  placeholder="/api/endpoint"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Público Para *
              </label>
              <select
                value={formData.PublicoPara}
                onChange={(e) => setFormData({ ...formData, PublicoPara: e.target.value as "paciente" | "psicologo" | "todos" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                required
              >
                <option value="paciente">Paciente</option>
                <option value="psicologo">Psicólogo</option>
                <option value="todos">Todos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={formData.Ordem}
                onChange={(e) => setFormData({ ...formData, Ordem: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9]"
                min="0"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.Ativo}
                onChange={(e) => setFormData({ ...formData, Ativo: e.target.checked })}
                className="w-4 h-4 text-[#8494E9] border-gray-300 rounded focus:ring-[#8494E9]"
              />
              <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
                Ativo
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            type="button"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

