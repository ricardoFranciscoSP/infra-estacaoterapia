"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import Image from 'next/image';
import { useAuthStore, type User } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useNotificacoes } from "@/store/useNotificacoes";
import { Notificacoes } from "./Notificacoes";
import { useSocketNotifications } from "@/hooks/useSocket/useSocketNotificacoes";

type RawNotification = {
  Id: string;
  Title: string;
  Message: string;
  UserId?: string;
  CreatedAt: string;
  IsForAllUsers?: boolean;
  Lida?: boolean;
};

type SocketNotification = {
  Id?: string;
  Title?: string;
  Message?: string;
  CreatedAt?: string;
  IsForAllUsers?: boolean;
};

export const HeaderSala = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  
  // Determina se é paciente ou psicólogo
  const isPatient = pathname?.startsWith("/painel/room");
  
  // Notificações
  const {
    notificacoes: rawNotificacoes,
    unseenCount,
    marcarComoLidas,
    marcarNotificacaoComoLida,
    removeNotification,
    addNotificacao,
    fetchNotificacoes,
  } = useNotificacoes();

  // Mantém referência do array atual de notificações para evitar stale closures
  const rawNotificacoesRef = useRef<RawNotification[]>([]);
  useEffect(() => {
    rawNotificacoesRef.current = rawNotificacoes;
  }, [rawNotificacoes]);

  // Evita adicionar a mesma notificação múltiplas vezes (ex.: reconexões)
  const processedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    processedIdsRef.current.clear();
  }, [user?.Id]);

  // Ref para o áudio de notificação
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/notifications/notification_simple-01.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Função para tocar o som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn('⚠️ Não foi possível tocar o som de notificação:', error);
      });
    }
  }, []);

  // Buscar notificações ao montar o componente
  useEffect(() => {
    if (isPatient) {
      fetchNotificacoes();
    }
  }, [fetchNotificacoes, isPatient]);

  // Handler para novas notificações vindo do socket
  const handleNewNotification = useCallback((data: SocketNotification) => {
    if (!isPatient) return;

    const finalId = data.Id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (processedIdsRef.current.has(finalId)) {
      return;
    }
    if (rawNotificacoesRef.current.some((n) => n.Id === finalId)) {
      return;
    }

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

    processedIdsRef.current.add(finalId);
    addNotificacao(novaNotificacao);
    playNotificationSound();
    
    // ✅ Recarrega notificações após um pequeno delay para garantir sincronização completa
    setTimeout(() => {
      fetchNotificacoes();
    }, 500);
  }, [addNotificacao, playNotificationSound, isPatient, fetchNotificacoes]);

  // Usa o hook para escutar notificações
  const socketOptions = useMemo(() => ({ onNotification: handleNewNotification }), [handleNewNotification]);
  useSocketNotifications(user?.Id || "", socketOptions);

  // Garantir que todas notificações tenham o tipo esperado pelo componente Notificacoes
  const notificacoes = useMemo(
    () =>
      rawNotificacoes.map((n: RawNotification) => ({
        Id: n.Id,
        Title: n.Title,
        Message: n.Message,
        CreatedAt: n.CreatedAt,
        IsForAllUsers: n.IsForAllUsers ?? false,
        Read: n.Lida ?? false,
      })),
    [rawNotificacoes]
  );

  // Função helper para extrair a URL da imagem do usuário
  // Suporta múltiplos formatos: Image (singular), Images (plural), com url (minúsculo) ou Url (maiúsculo)
  interface UserWithImages {
    Images?: Array<{ Url?: string; url?: string }>;
    Image?: Array<{ url?: string }>;
    imageUrl?: string;
  }
  
  const getUserImageUrl = useCallback((userParam: User | null): string | null => {
    if (!userParam) return null;
    
    const userWithImages = userParam as UserWithImages;
    
    // Formato 1: Images (plural) - array com objetos { Url: string } ou { url: string }
    if (Array.isArray(userWithImages.Images) && userWithImages.Images.length > 0) {
      const firstImage = userWithImages.Images[0];
      if (firstImage && 'Url' in firstImage && typeof firstImage.Url === "string" && firstImage.Url.length > 0) {
        return firstImage.Url;
      }
      if (firstImage && 'url' in firstImage && typeof firstImage.url === "string" && firstImage.url.length > 0) {
        return firstImage.url;
      }
    }
    
    // Formato 2: Image (singular) - array com objetos { url: string } (authStore)
    if (Array.isArray(userParam.Image) && userParam.Image.length > 0) {
      const firstImage = userParam.Image[0];
      if (firstImage && 'url' in firstImage && typeof firstImage.url === "string" && firstImage.url.length > 0) {
        return firstImage.url;
      }
      if (firstImage && 'Url' in firstImage && typeof firstImage.Url === "string" && firstImage.Url.length > 0) {
        return firstImage.Url;
      }
    }
    
    // Formato 3: Objeto único com { Url: string } ou null (userHook)
    if (userParam.Image && !Array.isArray(userParam.Image)) {
      const image = userParam.Image as { Url?: string; url?: string };
      if (image.Url && typeof image.Url === "string" && image.Url.length > 0) {
        return image.Url;
      }
      if (image.url && typeof image.url === "string" && image.url.length > 0) {
        return image.url;
      }
    }
    
    return null;
  }, []);

  // Estados para menus
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Função helper para determinar o prefixo correto baseado no role do usuário
  const getBasePath = useCallback(() => {
    return user?.Role === "Psychologist" ? "/painel-psicologo" : "/painel";
  }, [user?.Role]);

  // Função helper para retornar a URL correta do perfil baseado no role
  const getProfileUrl = useCallback(() => {
    return user?.Role === "Psychologist" 
      ? "/painel-psicologo/meu-perfil" 
      : "/painel/minha-conta/dados-pessoais";
  }, [user?.Role]);

  // Extrai o primeiro nome do usuário
  const firstName = useMemo(() => {
    if (user?.Nome) {
      const name = user.Nome.split(' ')[0];
      if (name && name.trim().length > 0) {
        return name;
      }
    }
    return '';
  }, [user?.Nome]);

  // Fecha popover de notificações ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, popoverRef, buttonRef]);

  // Fecha menu do avatar ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, menuRef, avatarRef]);

  // Função para remover uma notificação individualmente
  async function handleRemoverNotificacao(id: string) {
    setLoadingIds((prev) => [...prev, id]);
    await removeNotification(id);
    setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
  }

  const imageUrl = getUserImageUrl(user);
  const isExternal = imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image"));

  return (
    <motion.header
      className="bg-[#8494E9] w-full flex items-center justify-between px-4 sm:px-6 xl:px-24 2xl:px-48 py-2 h-[70px] relative z-30 flex-shrink-0"
      style={{ minHeight: '70px', maxHeight: '70px' }}
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Logo */}
      <div className="flex items-center min-w-[76px] w-full sm:w-auto">
        <Link href={getBasePath()} className="inline-flex items-center align-middle">
          <Image 
            src="/assets/logo/logo-escuro.svg" 
            alt="Logo Estação Terapia" 
            width={76} 
            height={26} 
            className="w-[76px] h-[26px] sm:w-[180px] sm:h-[62px] object-contain hover:opacity-80 transition-opacity duration-300" 
          />
        </Link>
      </div>

      {/* Notificações e Avatar - apenas para pacientes */}
      {isPatient && user && (
        <div className="flex items-center gap-2 sm:gap-3">
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
            isPainelPsicologo={false}
            fetchNotificacoes={fetchNotificacoes}
          />

          {/* Saudação - entre o sino e o avatar */}
          <div className="flex flex-col items-start justify-center">
            <span className="text-white font-medium text-xs sm:text-sm md:text-base whitespace-nowrap">
              {firstName ? `Olá ${firstName}!` : "Olá!"}
            </span>
          </div>

          {/* Avatar e menu */}
          <div className="relative flex items-center">
            <div
              ref={avatarRef}
              className="rounded-full bg-[#E6E9FF] flex items-center justify-center cursor-pointer w-10 h-10 md:w-12 md:h-12 transition-all duration-200 overflow-hidden"
              style={{ opacity: 1, transform: 'rotate(0deg)' }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full flex items-center justify-center"
              >
                {imageUrl && isExternal ? (
                  <Image
                    src={imageUrl}
                    alt="Avatar"
                    width={48}
                    height={48}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                    style={{ minWidth: 40, minHeight: 40, maxWidth: 48, maxHeight: 48, display: 'block' }}
                    unoptimized={true}
                  />
                ) : (
                  <Image
                    src="/assets/avatar-placeholder.svg"
                    alt="Avatar padrão"
                    width={48}
                    height={48}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                    style={{ minWidth: 40, minHeight: 40, maxWidth: 48, maxHeight: 48, display: 'block' }}
                  />
                )}
              </motion.div>
            </div>
            {/* Seta ao lado direito do avatar */}
            <span
              className="flex items-center absolute top-1/2 -translate-y-1/2 pr-2 ml-10"
              style={{ cursor: 'pointer', paddingLeft: 4, paddingRight: 2 }}
              onClick={e => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 7l3 3 3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.span>
            </span>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full mt-3 w-64 max-w-[90vw] md:w-56 bg-white shadow-xl rounded-xl z-[9999] border border-[#E6E9FF] py-2"
                  style={{ maxWidth: '256px' }}
                >
                  <div
                    className="w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer hover:bg-[#E6E9FF] text-[#23253A]"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(getProfileUrl());
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <Image 
                      src="/assets/icons/avatar.svg" 
                      alt="Minha conta" 
                      width={20} 
                      height={20} 
                      className="w-5 h-5"
                    />
                    Minha conta
                  </div>
                  {user?.Role !== "Psychologist" && (
                    <div
                      className="w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer hover:bg-[#E6E9FF] text-[#23253A]"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(`${getBasePath()}/psicologos-favoritos`);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Image 
                        src="/assets/icons/heart-preto.svg" 
                        alt="Psicólogos favoritos" 
                        width={20} 
                        height={20} 
                        className="w-5 h-5"
                      />
                      Psicólogos favoritos
                    </div>
                  )}
                  <div
                    className="w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer hover:bg-[#E6E9FF] text-[#23253A]"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(`${getBasePath()}/perguntas-frequentes`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <Image 
                      src="/assets/icons/question-mark-circled.svg" 
                      alt="Perguntas frequentes" 
                      width={20} 
                      height={20} 
                      className="w-5 h-5"
                    />
                    Perguntas frequentes
                  </div>
                  <div className="my-2 border-t border-[#E6E9FF]" />
                  <button
                    className="w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer hover:bg-[#FFE6E6] text-[#49525A]"
                    onClick={async () => {
                      await logout();
                    }}
                  >
                    <Image 
                      src="/assets/icons/exit.svg" 
                      alt="Sair da conta" 
                      width={20} 
                      height={20} 
                      className="w-5 h-5"
                    />
                    Sair da conta
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.header>
  );
};
