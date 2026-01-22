import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { userService, User } from "@/services/userService";

import { CreateSolicitacaoData } from "@/types/solicitacaoTypes";
import { TIPOS_SOLICITACAO_FINANCEIRO } from "@/constants/tiposSolicitacao";
import { TIPOS_SOLICITACAO_SUPORTE } from "@/constants/tiposSolicitacaoSuporte";

interface ModalCriarSolicitacaoProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSolicitacaoData) => Promise<void>;
  // tiposSolicitacao removido, pois será fixo para paciente
}

export default function ModalCriarSolicitacao({ open, onClose, onSubmit }: ModalCriarSolicitacaoProps) {
  const [title, setTitle] = React.useState("");
  const [tipo, setTipo] = React.useState("");
  // Listas fixas para paciente
  const tiposSuporte = TIPOS_SOLICITACAO_SUPORTE;
  const tiposFinanceiro = TIPOS_SOLICITACAO_FINANCEIRO;
  const [descricao, setDescricao] = React.useState("");
  const [documento, setDocumento] = React.useState<File | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Estado para público
  const [publico, setPublico] = React.useState({
    all: false,
    pacientes: false,
    psicologos: false,
    financeiro: false,
    selectedUsers: [] as string[],
    searchName: "",
  });
  
  const MAX_DESCRICAO_LENGTH = 500;

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setTipo("");
      setDescricao("");
      setDocumento(null);
      setIsSubmitting(false);
      setPublico({
        all: false,
        pacientes: false,
        psicologos: false,
        financeiro: false,
        selectedUsers: [],
        searchName: "",
      });
    }
  }, [open]);

  // Buscar pacientes
  const { data: pacientesData, isLoading: isLoadingPacientes } = useQuery<User[]>({
    queryKey: ['users', 'Patient'],
    queryFn: async () => {
      const response = await userService.list({ role: 'Patient' });
      return response.data;
    },
    enabled: publico.pacientes,
  });

  // Buscar psicólogos
  const { data: psicologosData, isLoading: isLoadingPsicologos } = useQuery<User[]>({
    queryKey: ['users', 'Psychologist'],
    queryFn: async () => {
      const response = await userService.list({ role: 'Psychologist' });
      return response.data;
    },
    enabled: publico.psicologos,
  });

  // Buscar financeiro
  const { data: financeiroData, isLoading: isLoadingFinanceiro } = useQuery<User[]>({
    queryKey: ['users', 'Finance'],
    queryFn: async () => {
      const response = await userService.list({ role: 'Finance' });
      return response.data;
    },
    enabled: publico.financeiro,
  });

  // Lista de usuários para exibir no select (filtrada por busca)
  const usuariosParaExibir = React.useMemo(() => {
    let lista: User[] = [];
    
    if (publico.pacientes && pacientesData) {
      lista = [...lista, ...pacientesData];
    }
    if (publico.psicologos && psicologosData) {
      lista = [...lista, ...psicologosData];
    }
    if (publico.financeiro && financeiroData) {
      lista = [...lista, ...financeiroData];
    }

    // Filtrar por nome
    if (publico.searchName.trim()) {
      const searchLower = publico.searchName.toLowerCase();
      lista = lista.filter(u => 
        u.Nome?.toLowerCase().includes(searchLower) ||
        u.Email?.toLowerCase().includes(searchLower)
      );
    }

    return lista;
  }, [publico.pacientes, publico.psicologos, publico.financeiro, publico.searchName, pacientesData, psicologosData, financeiroData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocumento(file);
  };


  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setPublico(prev => ({ ...prev, selectedUsers: selected }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !tipo || !descricao.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        Title: title.trim(),
        Tipo: tipo,
        Descricao: descricao.trim(),
        Documentos: documento,
        PublicoTodos: publico.all,
        PublicoPacientes: publico.pacientes,
        PublicoPsicologos: publico.psicologos,
        PublicoFinanceiro: publico.financeiro,
        DestinatariosIds: publico.all ? [] : publico.selectedUsers,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-white z-50 sm:hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative flex flex-col items-center p-4 border-b border-gray-200">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-gray-600"
                aria-label="Fechar"
              >
                ×
              </button>
              <span className="block text-base font-semibold text-gray-800 mb-2 text-center">
                Nova Solicitação
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">Título da solicitação</span>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                    placeholder="Ex: Solicitação de cancelamento de plano"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">Tipo de solicitação</span>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition"
                    required
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                  >
                    <option value="">Selecione o tipo...</option>
                    {TIPOS_SOLICITACAO_SUPORTE.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 flex flex-col">
                  <span className="text-sm font-medium text-gray-700 mb-1">Descrição</span>
                  <textarea
                    className="flex-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition min-h-[150px]"
                    placeholder="Descreva sua solicitação de forma clara e detalhada..."
                    value={descricao}
                    onChange={e => {
                      if (e.target.value.length <= MAX_DESCRICAO_LENGTH) {
                        setDescricao(e.target.value);
                      }
                    }}
                    required
                    maxLength={MAX_DESCRICAO_LENGTH}
                  />
                  <span className="text-xs text-gray-500 mt-1">{descricao.length}/{MAX_DESCRICAO_LENGTH} caracteres</span>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-1 block">Documento (opcional)</span>
                  <input
                    type="file"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-sm"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {documento && (
                    <p className="text-xs text-gray-600 mt-1">
                      Arquivo selecionado: {documento.name} ({(documento.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </label>
                <div className="flex flex-col gap-2 w-full mt-auto pt-4 border-t">
                  <button
                    className="w-full h-11 rounded-lg bg-[#8494E9] text-white font-semibold text-base cursor-pointer hover:bg-[#6D75C0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !tipo || !descricao.trim()}
                  >
                    {isSubmitting ? "Criando..." : "Criar Solicitação"}
                  </button>
                  <button
                    className="w-full h-11 rounded-lg border border-[#8494E9] text-[#8494E9] font-medium text-base bg-white cursor-pointer hover:bg-[#E6E9FF] transition"
                    type="button"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-3xl relative max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#8494E9] relative flex-shrink-0">
              <div className="flex-1 flex justify-center">
                <h2 className="text-xl font-bold text-white">Nova Solicitação</h2>
              </div>
              <button
                onClick={onClose}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#6D75C0] transition"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form
              className="p-6 flex flex-col gap-5 overflow-y-auto flex-1"
              onSubmit={handleSubmit}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Título da solicitação</span>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-gray-700"
                    placeholder="Ex: Solicitação de cancelamento de plano"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={200}
                  />
                </label>
                {/* Apenas Suporte e Financeiro */}
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de solicitação</span>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-gray-700"
                    required
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                  >
                    <option value="">Selecione o tipo...</option>
                    <optgroup label="Suporte">
                      {tiposSuporte.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Financeiro">
                      {tiposFinanceiro.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-2 block">Documento (opcional)</span>
                  <input
                    type="file"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition text-sm text-gray-700"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  {documento && (
                    <p className="text-xs text-gray-600 mt-1">
                      Arquivo selecionado: {documento.name} ({(documento.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-2 block">Descrição</span>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition min-h-[140px] text-gray-700"
                  placeholder="Descreva sua solicitação de forma clara e detalhada..."
                  value={descricao}
                  onChange={e => {
                    if (e.target.value.length <= MAX_DESCRICAO_LENGTH) {
                      setDescricao(e.target.value);
                    }
                  }}
                  required
                  maxLength={MAX_DESCRICAO_LENGTH}
                />
                <span className={`text-xs mt-1 block ${descricao.length >= MAX_DESCRICAO_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
                  {descricao.length}/{MAX_DESCRICAO_LENGTH} caracteres
                </span>
              </label>

              {/* Campo Público removido conforme solicitado */}

              {/* Busca e Select de usuários */}
              {(publico.pacientes || publico.psicologos || publico.financeiro) && (
                <div className="block">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar por nome</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all text-gray-700"
                    placeholder="Digite o nome ou email..."
                    value={publico.searchName}
                    onChange={e => setPublico(prev => ({ ...prev, searchName: e.target.value }))}
                  />
                  
                  <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">Selecionar Usuários</label>
                  {(isLoadingPacientes || isLoadingPsicologos || isLoadingFinanceiro) ? (
                    <div className="w-full px-4 py-8 border border-gray-300 rounded-lg text-center text-gray-500">
                      Carregando usuários...
                    </div>
                  ) : usuariosParaExibir.length === 0 ? (
                    <div className="w-full px-4 py-8 border border-gray-300 rounded-lg text-center text-gray-500">
                      {publico.searchName ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
                    </div>
                  ) : (
                    <>
                      <select
                        multiple
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all text-gray-700"
                        value={publico.selectedUsers}
                        onChange={handleUserSelect}
                        size={6}
                      >
                        {usuariosParaExibir.map(u => (
                          <option key={u.Id} value={u.Id} className="py-1">
                            {u.Nome} {u.Email ? `(${u.Email})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {publico.selectedUsers.length > 0 
                          ? `${publico.selectedUsers.length} usuário(s) selecionado(s). `
                          : ''}
                        Segure Ctrl/Cmd para selecionar múltiplos usuários
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 flex-shrink-0">
                <button
                  className="px-6 py-2.5 rounded-lg border border-[#75838F] bg-[#FCFBF6] text-[#23253A] font-medium hover:bg-[#F3F6F8] transition"
                  type="button"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  className="px-6 py-2.5 rounded-lg bg-[#8494E9] text-white font-semibold hover:bg-[#6D75C0] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !tipo || !descricao.trim()}
                >
                  {isSubmitting ? "Criando..." : "Criar Solicitação"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
