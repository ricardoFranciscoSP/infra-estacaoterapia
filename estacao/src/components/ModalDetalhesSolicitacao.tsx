import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Solicitacao } from "@/types/solicitacaoTypes";
import { parseThreadFromLog } from "@/utils/solicitacaoThread";
import { useAddResponse } from "@/hooks/solicitacaoHook";
import { useUserBasic } from "@/hooks/user/userHook";

interface ModalDetalhesSolicitacaoProps {
  open: boolean;
  onClose: () => void;
  solicitacao: Solicitacao | null;
  formatarData: (dataISO: Date | string) => string;
  onUpdate?: () => void; // Callback para atualizar lista após resposta
  modoVisualizacao?: boolean; // Se true, esconde o formulário de resposta
}

export default function ModalDetalhesSolicitacao({ open, onClose, solicitacao, formatarData, onUpdate, modoVisualizacao = false }: ModalDetalhesSolicitacaoProps) {
  const { user } = useUserBasic();
  
  // Hook para fechar com ESC
  React.useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);
  const [isMobile, setIsMobile] = React.useState(false);
  const [novaResposta, setNovaResposta] = useState("");
  const { addResponseAsync, isLoading: isAddingResponse } = useAddResponse();

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
      setNovaResposta("");
    }
  }, [open]);

  if (!solicitacao) return null;

  const thread = parseThreadFromLog(solicitacao.Log);
  const podeResponder = !modoVisualizacao && solicitacao.Status !== "Concluído";

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      "Pendente": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: "⏳" },
      "Em Análise": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "🔍" },
      "Aprovado": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "✓" },
      "Recusado": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "✗" },
      "Concluído": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: "✓" },
    };
    
    const config = statusConfig[status] || statusConfig["Pendente"];
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <span>{config.icon}</span>
        {status}
      </span>
    );
  };

  const handleEnviarResposta = async () => {
    if (!novaResposta.trim() || !solicitacao) return;

    try {
      await addResponseAsync({
        solicitacaoId: solicitacao.Id,
        mensagem: novaResposta.trim(),
      });
      setNovaResposta("");
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    }
  };

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 sm:hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Header Mobile */}
            <div className="relative flex flex-col items-center p-4 border-b border-[#E3E4F3] bg-[#232A5C]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-xl font-bold text-white hover:text-gray-200"
                aria-label="Fechar"
              >
                ×
              </button>
              <span className="block text-base font-semibold text-white mb-2 text-center">
                Detalhes da Solicitação
              </span>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Informações básicas - Melhorada */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Protocolo</p>
                    <p className="text-sm font-bold text-gray-900 font-mono break-all">{solicitacao.Protocol}</p>
                  </div>
                  {solicitacao.CreatedAt && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Data</p>
                      <p className="text-sm font-semibold text-gray-900">{formatarData(solicitacao.CreatedAt)}</p>
                    </div>
                  )}
                  {solicitacao.Tipo && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Tipo</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacao.Tipo}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                    {getStatusBadge(solicitacao.Status)}
                  </div>
                </div>
                {solicitacao.Title && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Título</p>
                    <p className="text-sm font-semibold text-gray-900">{solicitacao.Title}</p>
                  </div>
                )}
              </div>

              {/* Layout de duas colunas: Chat à esquerda, Formulário à direita */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Coluna esquerda - Chat */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 lg:border-r border-gray-200 min-h-0">
                  {thread.mensagens.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {thread.mensagens.map((msg, idx) => {
                        const isAdmin = msg.autor === 'admin';
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${
                              isAdmin
                                ? 'bg-gray-200 text-gray-800 rounded-tl-sm'
                                : 'bg-[#8494E9] text-white rounded-tr-sm'
                            }`}>
                              {/* Tail do balão de chat */}
                              {isAdmin && (
                                <div className="absolute left-0 top-0 w-0 h-0 border-t-[12px] border-t-gray-200 border-r-[12px] border-r-transparent"></div>
                              )}
                              {!isAdmin && (
                                <div className="absolute right-0 top-0 w-0 h-0 border-t-[12px] border-t-[#8494E9] border-l-[12px] border-l-transparent"></div>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold ${
                                  isAdmin ? 'text-gray-600' : 'text-white opacity-95'
                                }`}>
                                  {msg.autorNome || (isAdmin ? 'Plataforma' : user?.Nome || 'Você')}
                                </span>
                                <span className={`text-xs ${
                                  isAdmin ? 'text-gray-500' : 'text-white opacity-75'
                                }`}>
                                  {formatarData(msg.data)}
                                </span>
                              </div>
                              <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                                isAdmin ? 'text-gray-700' : 'text-white'
                              }`}>
                                {msg.mensagem}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Coluna direita - Formulário de resposta em card */}
                {podeResponder && (
                  <div className="w-full lg:w-72 flex-shrink-0 p-4 bg-gray-50">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full">
                      <div className="p-5 flex-1 flex flex-col min-h-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Sua Resposta
                        </label>
                        <textarea
                          value={novaResposta}
                          onChange={(e) => setNovaResposta(e.target.value)}
                          placeholder="Digite sua resposta ou adicione mais informações..."
                          rows={10}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C] transition flex-1"
                          maxLength={1000}
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {novaResposta.length}/1000 caracteres
                          </span>
                        </div>
                      </div>
                      <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                        <button
                          onClick={handleEnviarResposta}
                          disabled={!novaResposta.trim() || isAddingResponse}
                          className="w-full px-4 py-3 rounded-lg bg-[#232A5C] text-white font-semibold hover:bg-[#1a1f45] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          {isAddingResponse ? "Enviando..." : "Enviar Resposta"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!podeResponder && (
                <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-200 bg-white">
                  Esta solicitação foi concluída e não pode mais receber respostas.
                </div>
              )}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rounded-2xl shadow-2xl p-0 w-full max-w-[900px] relative flex flex-col max-h-[90vh] bg-white"
            initial={{ scale: 0.95, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center px-6 py-4 border-b border-[#E3E4F3] rounded-t-2xl bg-[#232A5C] relative flex-shrink-0">
              <div className="flex-1 flex justify-center">
                <h2 className="text-lg font-bold text-white">Detalhes da Solicitação</h2>
              </div>
              <button
                onClick={onClose}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-2xl px-2 py-1 rounded hover:bg-[#1a1f45] transition"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {/* Informações principais - Melhorada */}
              <div className="p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Protocolo</p>
                    <p className="text-sm font-bold text-gray-900 font-mono break-all">{solicitacao.Protocol}</p>
                  </div>
                  {solicitacao.CreatedAt && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Data</p>
                      <p className="text-sm font-semibold text-gray-900">{formatarData(solicitacao.CreatedAt)}</p>
                    </div>
                  )}
                  {solicitacao.Tipo && (
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Tipo</p>
                      <p className="text-sm font-semibold text-gray-900">{solicitacao.Tipo}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(solicitacao.Status)}
                    </div>
                  </div>
                </div>
                {solicitacao.Title && (
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Título</p>
                    <p className="text-sm font-semibold text-gray-900">{solicitacao.Title}</p>
                  </div>
                )}
              </div>

              {/* Layout de duas colunas: Chat à esquerda, Formulário à direita */}
              <div className="flex-1 flex overflow-hidden">
                {/* Coluna esquerda - Chat */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 border-r border-gray-200 min-h-0">
                  {thread.mensagens.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {thread.mensagens.map((msg, idx) => {
                        const isAdmin = msg.autor === 'admin';
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${
                              isAdmin
                                ? 'bg-gray-200 text-gray-800 rounded-tl-sm'
                                : 'bg-[#8494E9] text-white rounded-tr-sm'
                            }`}>
                              {/* Tail do balão de chat */}
                              {isAdmin && (
                                <div className="absolute left-0 top-0 w-0 h-0 border-t-[12px] border-t-gray-200 border-r-[12px] border-r-transparent"></div>
                              )}
                              {!isAdmin && (
                                <div className="absolute right-0 top-0 w-0 h-0 border-t-[12px] border-t-[#8494E9] border-l-[12px] border-l-transparent"></div>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-semibold ${
                                  isAdmin ? 'text-gray-600' : 'text-white opacity-95'
                                }`}>
                                  {msg.autorNome || (isAdmin ? 'Plataforma' : user?.Nome || 'Você')}
                                </span>
                                <span className={`text-xs ${
                                  isAdmin ? 'text-gray-500' : 'text-white opacity-75'
                                }`}>
                                  {formatarData(msg.data)}
                                </span>
                              </div>
                              <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                                isAdmin ? 'text-gray-700' : 'text-white'
                              }`}>
                                {msg.mensagem}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Coluna direita - Formulário de resposta em card */}
                {podeResponder && (
                  <div className="w-72 flex-shrink-0 p-4 bg-gray-50">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 flex flex-col h-full">
                      <div className="p-5 flex-1 flex flex-col min-h-0">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Sua Resposta
                        </label>
                        <textarea
                          value={novaResposta}
                          onChange={(e) => setNovaResposta(e.target.value)}
                          placeholder="Digite sua resposta ou adicione mais informações..."
                          rows={10}
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#232A5C] focus:border-[#232A5C] transition flex-1"
                          maxLength={1000}
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {novaResposta.length}/1000 caracteres
                          </span>
                        </div>
                      </div>
                      <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                        <button
                          onClick={handleEnviarResposta}
                          disabled={!novaResposta.trim() || isAddingResponse}
                          className="w-full px-4 py-3 rounded-lg bg-[#232A5C] text-white font-semibold hover:bg-[#1a1f45] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                          {isAddingResponse ? "Enviando..." : "Enviar Resposta"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!podeResponder && (
                <div className="p-4 border-t border-gray-200 text-center bg-white">
                  <p className="text-sm text-gray-500">
                    Esta solicitação foi concluída e não pode mais receber respostas.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
