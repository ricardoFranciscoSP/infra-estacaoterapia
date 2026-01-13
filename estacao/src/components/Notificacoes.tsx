"use client";
import React, { RefObject, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Notification } from "@/services/notificationService";
interface NotificacoesProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  notificacoes: Notification[];
  unseenCount: number;
  marcarComoLidas: () => Promise<void>;
  loadingIds: string[];
  handleMarcarNotificacaoComoLida: (id: string) => Promise<void>;
  marcarNotificacaoComoLida: () => Promise<{ success: boolean } | null>; 
  buttonRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  iconColor?: string; // Cor do ícone (para header lilás)
  isPainelPsicologo?: boolean; // Indica se está no painel do psicólogo
  fetchNotificacoes?: () => Promise<void>; // Função para atualizar notificações
}

export function Notificacoes({
  open,
  setOpen,
  notificacoes,
  unseenCount,
  loadingIds,
  handleMarcarNotificacaoComoLida,
  marcarNotificacaoComoLida,
  buttonRef,
  popoverRef,
  isMobile = false,
  iconColor = "#2B2B2B",
  isPainelPsicologo = false,
  fetchNotificacoes,
}: NotificacoesProps) {
  // Estado para efeito de piscar
  const [highlight, setHighlight] = useState(false);
  const [lastUnseen, setLastUnseen] = useState(unseenCount);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);

  // ✅ Efeito visual quando recebe nova notificação
  useEffect(() => {
    console.log('🔔 [Notificacoes] unseenCount mudou:', { unseenCount, lastUnseen });
    
    if (unseenCount > lastUnseen) {
      console.log('✨ [Notificacoes] Ativando efeito de highlight');
      setHighlight(true);
      setTimeout(() => setHighlight(false), 600); 
    }
    setLastUnseen(unseenCount);
  }, [unseenCount, lastUnseen]);

  // Seleciona/deseleciona todos os checkboxes das notificações não lidas
  const handleSelectAllChange = () => {
    const allIds = notificacoes
      .filter((n) => !n.Read && !loadingIds.includes(n.Id))
      .map((n) => n.Id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  // Remove todas as notificações selecionadas ao clicar em aplicar
  const handleAplicarClick = async () => {
    setApplyLoading(true);
    try {
      const result = await marcarNotificacaoComoLida();
      if (result !== null && result.success) {
        setSelectedIds([]);
        setSelectAll(false);
        // Atualiza as notificações sem recarregar a página
        if (fetchNotificacoes) {
          await fetchNotificacoes();
        }
        if (typeof setOpen === "function") setOpen(false);
      }
    } finally {
      setApplyLoading(false);
    }
  };

  // Remove individualmente ao clicar no checkbox da notificação
  const handleIndividualCheckbox = async (id: string) => {
    setSelectedIds((prev) => prev.filter((nid) => nid !== id));
    await handleMarcarNotificacaoComoLida(id);
  };

  return (
    <div className={`relative flex items-center justify-center ${isMobile ? "w-10 h-10" : "w-12 h-12"}`}>
      <button
        ref={buttonRef}
        className={`flex items-center justify-center ${isMobile ? "w-10 h-10" : "w-12 h-12"} font-medium focus:outline-none relative hover:cursor-pointer ${highlight ? "animate-notification-blink" : ""}`}
        style={{ cursor: 'pointer', color: iconColor }}
        onClick={() => setOpen(!open)}
        aria-label="Notificações"
        type="button"
      >
        <Image
          id="notificacao"
          src="/icons/icon-sino.svg"
          alt="Notificações"
          className={isMobile ? "w-6 h-6" : "w-7 h-7"}
          style={{ 
            cursor: 'pointer', 
            filter: iconColor === "#fff" || iconColor === "white" 
              ? "brightness(0) invert(1)" 
              : "none" 
          }}
          width={isMobile ? 24 : 28}
          height={isMobile ? 24 : 28}
          unoptimized
        />
        {unseenCount > 0 && (
          <span className="absolute top-1 right-1 bg-[#A3A8F7] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow">
            {unseenCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className={`${isMobile ? "fixed right-2 left-2 top-[90px] bottom-[20px] max-h-[calc(100vh-200px)]" : "absolute right-0 mt-3 w-[370px] top-full"} bg-white shadow-xl rounded-xl z-50 border border-[#E6E9FF] flex flex-col ${isMobile ? "w-auto" : ""}`}
          >
            <div className={`${isMobile ? "p-4 flex-1 flex flex-col min-h-0" : "p-6"}`}>
              <h3 className={`font-bold ${isMobile ? "text-base" : "text-lg"} ${isMobile ? "mb-3" : "mb-4"} border-b border-[#E6E9FF] ${isMobile ? "pb-2" : "pb-2"} flex items-center justify-between flex-shrink-0 ${
                isPainelPsicologo ? "text-[#2B2B2B]" : "text-[#2B2B2B]"
              }`}>
                Notificações
                {notificacoes.length > 0 && (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      className={`accent-[#A3A8F7] ${isMobile ? "ml-1 w-4 h-4" : "ml-2"}`}
                      checked={
                        notificacoes.length > 0 &&
                        selectedIds.length ===
                          notificacoes.filter((n) => !n.Read && !loadingIds.includes(n.Id)).length &&
                        notificacoes.filter((n) => !n.Read && !loadingIds.includes(n.Id)).length > 0
                      }
                      onChange={handleSelectAllChange}
                      title="Selecionar todas"
                      ref={input => {
                        if (input) {
                          input.indeterminate =
                            selectedIds.length > 0 &&
                            selectedIds.length <
                              notificacoes.filter((n) => !n.Read && !loadingIds.includes(n.Id)).length;
                        }
                      }}
                    />
                    {selectedIds.length > 0 && (
                      <button
                        className={`${isMobile ? "ml-1 px-2 py-1 text-[10px]" : "ml-2 px-2 py-1 text-xs"} bg-[#A3A8F7] text-white rounded hover:bg-[#8b8ee6] transition flex items-center whitespace-nowrap`}
                        onClick={handleAplicarClick}
                        disabled={applyLoading}
                      >
                        {applyLoading && (
                          <svg className={`${isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-1"} animate-spin text-white`} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                          </svg>
                        )}
                        {applyLoading ? "Aplicando..." : "Aplicar"}
                      </button>
                    )}
                  </span>
                )}
              </h3>
              <div className={`flex flex-col ${isMobile ? "gap-2 flex-1 min-h-0 overflow-y-auto" : "gap-3"} ${notificacoes.length > 3 && !isMobile ? "max-h-60 overflow-y-auto" : ""}`}>
                {notificacoes.length === 0 && (
                  <span className="text-sm text-gray-500">Nenhuma notificação.</span>
                )}
                {notificacoes.map((n) => (
                  <div key={n.Id} className={`flex items-start ${isMobile ? "gap-2 p-2" : "gap-3 p-2"} rounded hover:bg-[#F5F6FA]`}>
                    {loadingIds.includes(n.Id) ? (
                      <span className={`${isMobile ? "mt-0.5 w-4 h-4" : "mt-1 w-4 h-4"} flex items-center justify-center flex-shrink-0`}>
                        <svg className={`animate-spin ${isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} text-[#A3A8F7]`} viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                        </svg>
                      </span>
                    ) : (
                      <input
                        type="checkbox"
                        className={`accent-[#A3A8F7] ${isMobile ? "mt-0.5 w-4 h-4 flex-shrink-0" : "mt-1"}`}
                        checked={selectedIds.includes(n.Id)}
                        onChange={async () => {
                          if (!selectAll) {
                            await handleIndividualCheckbox(n.Id);
                          }
                        }}
                        title="Remover notificação"
                        disabled={n.Read || selectAll}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${isMobile ? "text-xs" : "text-sm"} ${
                        isPainelPsicologo ? "text-[#2B2B2B]" : "text-[#2B2B2B]"
                      } break-words`}>{n.Title}</div>
                      <div className={`${isMobile ? "text-[11px] leading-relaxed" : "text-xs"} ${
                        isPainelPsicologo ? "text-[#2B2B2B]" : "text-[#2B2B2B]"
                      } break-words mt-0.5`}>{n.Message}</div>
                      <div className={`${isMobile ? "text-[9px]" : "text-[10px]"} text-gray-400 mt-1`}>{new Date(n.CreatedAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx global>{`
        @keyframes notification-blink {
          0% { box-shadow: 0 0 0 0 #a3a8f7; }
          50% { box-shadow: 0 0 10px 4px #a3a8f7; }
          100% { box-shadow: 0 0 0 0 #a3a8f7; }
        }
        .animate-notification-blink {
          animation: notification-blink 0.6s;
        }
      `}</style>
    </div>
  );
}
