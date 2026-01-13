"use client";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useUserBasic } from "@/hooks/user/userHook";
import { useAuthStore } from "@/store/authStore";
import { useNotificacoes } from "@/store/useNotificacoes";
import { Notificacoes } from "@/components/Notificacoes";
import { useSocketNotifications } from "@/hooks/useSocket/useSocketNotificacoes";
import Image from "next/image";

interface HeaderProps {
  onOpenSidebarMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebarMobile }) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, refetch } = useUserBasic();
  const logout = useAuthStore((state) => state.logout);
  const [avatarSrc, setAvatarSrc] = useState<string>("/assets/Profile.svg");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Hook de notificações
  const {
    notificacoes,
    unseenCount,
    marcarComoLidas,
    marcarNotificacaoComoLida,
    removeNotification,
    addNotificacao,
    fetchNotificacoes,
  } = useNotificacoes();

  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  // ✅ Handler para novas notificações via socket
  const handleNewNotification = useCallback((data: { Id?: string; Title?: string; Message?: string; CreatedAt?: string; IsForAllUsers?: boolean }) => {
    const finalId = data.Id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const createdAt = data.CreatedAt
      ? new Date(data.CreatedAt).toISOString()
      : new Date().toISOString();

    const novaNotificacao = {
      Id: finalId,
      Title: data.Title || "Nova notificação",
      Message: data.Message || "",
      CreatedAt: createdAt,
      IsForAllUsers: data.IsForAllUsers ?? false,
      Lida: false,
    };

    addNotificacao(novaNotificacao);
    
    // ✅ Recarrega notificações após um pequeno delay para garantir sincronização
    setTimeout(() => {
      fetchNotificacoes();
    }, 500);
  }, [addNotificacao, fetchNotificacoes]);

  // ✅ Usa o hook para escutar notificações em tempo real
  const socketOptions = useMemo(() => ({ onNotification: handleNewNotification }), [handleNewNotification]);
  useSocketNotifications(user?.Id || "", socketOptions);

  const handleRemoverNotificacao = async (id: string) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      await removeNotification(id);
    } finally {
      setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
    }
  };

  // Define o src do avatar com fallback seguro
  useEffect(() => {
    const candidate = Array.isArray(user?.Image)
      ? user?.Image?.[0]?.Url
      : user?.Image?.Url;
    if (candidate && typeof candidate === "string" && candidate.trim().length > 0) {
      setAvatarSrc(candidate);
    } else {
      setAvatarSrc("/assets/Profile.svg");
    }
  }, [user?.Image]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <header className="w-full bg-[#6D75C0] border-b border-[#6D75C0] md:sticky md:top-0 md:z-50 sticky-header">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 h-[56px] sm:h-[64px] md:h-[72px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Botão menu mobile */}
        <button
          className="sm:hidden p-1.5 sm:p-2 rounded hover:bg-white/10 focus:outline-none flex-shrink-0"
          onClick={onOpenSidebarMobile}
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <a href="/adm-finance" className="flex-shrink-0">
          <Image
            src="/assets/logo/logo-escuro.svg"
            alt="Logo"
            width={180}
            height={62}
            style={{ width: "auto", height: "auto" }}
            className="h-7 sm:h-8 md:h-10 w-auto"
          />
        </a>
        </div>
        <div className="flex items-center gap-3 relative flex-shrink-0">
          {/* Notificações */}
          <Notificacoes
            open={open}
            setOpen={setOpen}
            notificacoes={notificacoes}
            unseenCount={unseenCount}
            marcarComoLidas={async () => { await marcarComoLidas(); }}
            loadingIds={loadingIds}
            handleMarcarNotificacaoComoLida={async (id: string) => { await handleRemoverNotificacao(id); }}
            marcarNotificacaoComoLida={async () => {
              await marcarNotificacaoComoLida();
              return { success: true };
            }}
            buttonRef={buttonRef}
            popoverRef={popoverRef}
            isMobile={false}
            iconColor="#fff"
            isPainelPsicologo={true}
            fetchNotificacoes={fetchNotificacoes}
          />
          <Image
            src={avatarSrc}
            alt="Avatar"
            width={40}
            height={40}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border border-white/20"
            unoptimized
            onError={() => setAvatarSrc("/assets/Profile.svg")}
          />
          <button
            className="ml-1 sm:ml-2 focus:outline-none p-1"
            onClick={() => setSubmenuOpen((v) => !v)}
            aria-label="Abrir menu do usuário"
          >
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-white transition-transform ${submenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {submenuOpen && (
            <div className="absolute right-0 top-10 sm:top-12 md:top-14 bg-white border border-[#E5E9FA] rounded shadow-md w-36 sm:w-40 z-10">
              <a href="/perfil" className="block px-3 sm:px-4 py-2 text-xs sm:text-sm text-[#212529] hover:bg-[#F2F4FD]">Perfil</a>
              <button
                onClick={logout}
                className="w-full text-left block px-3 sm:px-4 py-2 text-xs sm:text-sm text-[#212529] hover:bg-[#F2F4FD]"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
