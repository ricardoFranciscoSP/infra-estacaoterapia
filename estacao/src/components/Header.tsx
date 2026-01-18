"use client"; 
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { useUserBasic } from '@/hooks/user/userHook';
import { useAuthStore } from "@/store/authStore";
import Image from 'next/image'; 
import Head from 'next/head';
import { useNotificacoes, type Notificacao } from "@/store/useNotificacoes";
import { Notificacoes } from "./Notificacoes";
import { useSocketNotifications } from "@/hooks/useSocket/useSocketNotificacoes";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#para-pacientes', label: 'Para pacientes' },
  { href: '/para-psicologos', label: 'Para psicólogos' },
  { href: '/ver-psicologos', label: 'Ver psicólogos' },
  { href: '#planos', label: 'Planos' },
  { href: 'https://blog.estacaoterapia.com.br/', label: 'Blog', external: true },
];


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

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState<string>(typeof window !== "undefined" ? window.location.hash : "");
  const [mounted, setMounted] = useState(false);
  
  // ⚡ OTIMIZAÇÃO: Carrega dados do usuário de forma não-bloqueante
  const { user } = useUserBasic();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  
  // Notificações - carregadas de forma não-bloqueante
  const {
    notificacoes: rawNotificacoes,
    unseenCount,
    marcarComoLidas,
    marcarNotificacaoComoLida,
    removeNotification,
    addNotificacao,
    fetchNotificacoes,
  } = useNotificacoes();
  
  // ⚡ OTIMIZAÇÃO: Garante que o componente está montado antes de fazer operações do cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const rawNotificacoesRef = useRef<RawNotification[]>([]);
  useEffect(() => {
    rawNotificacoesRef.current = rawNotificacoes;
  }, [rawNotificacoes]);

  const processedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (user?.Id) {
      processedIdsRef.current.clear();
    }
  }, [user?.Id]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn('⚠️ Não foi possível tocar o som de notificação:', error);
      });
    }
  }, []);

  // ⚡ OTIMIZAÇÃO: Carrega notificações de forma não-bloqueante (não impede renderização)
  useEffect(() => {
    if (mounted && user && typeof user === 'object' && user.success !== false) {
      // Usa setTimeout para não bloquear a renderização inicial
      const timer = setTimeout(() => {
        fetchNotificacoes();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mounted, fetchNotificacoes, user]);

  const handleNewNotification = useCallback((data: SocketNotification) => {
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
  }, [addNotificacao, playNotificationSound, fetchNotificacoes]);

  const socketOptions = useMemo(() => ({ onNotification: handleNewNotification }), [handleNewNotification]);
  const userId = user && typeof user === 'object' && user.success !== false ? user.Id || "" : "";
  useSocketNotifications(userId, socketOptions);

  const notificacoes = useMemo(
    () =>
      rawNotificacoes.map((n: RawNotification) => ({
        Id: n.Id,
        Title: n.Title,
        Message: n.Message,
        CreatedAt: n.CreatedAt,
        IsForAllUsers: n.IsForAllUsers ?? false,
        Lida: n.Lida ?? false,
      })),
    [rawNotificacoes]
  );

  const [open, setOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleRemoverNotificacao = async (id: string) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      await removeNotification(id);
    } finally {
      setLoadingIds((prev) => prev.filter((lid) => lid !== id));
    }
  };

  const clearHash = () => {
    if (typeof window === 'undefined') return;
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      window.location.hash = '';
    }
    setCurrentHash('');
  };

  // Função para verificar se o link está ativo
  const isActive = (href: string) => {
    if (href.startsWith("#")) {
      // Não selecionar nada por padrão; só ativa quando o hash corresponder
      return pathname === "/" && currentHash === href;
    }
    return pathname === href;
  };

  const handleAnchorClick = (href: string, external?: boolean) => {
    if (external) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Verifica se o usuário está logado e redireciona para área logada se necessário
    const isLoggedIn = user && typeof user === 'object' && user.success !== false;
    const isPatient = isLoggedIn && user.Role === "Patient";
    
    // Redireciona "Ver psicólogos" para área logada se for paciente
    if (href === '/ver-psicologos' && isPatient) {
      clearHash();
      router.push('/painel/psicologos');
      return;
    }
    
    // Redireciona "Planos" (#planos) para área logada se for paciente
    if (href === '#planos' && isPatient) {
      clearHash();
      router.push('/painel/planos');
      return;
    }
    
    if (href.startsWith("#")) {
      if (typeof window !== 'undefined' && window.location.pathname !== "/") {
        // vindo de outra rota: define o hash no estado e navega
        setCurrentHash(href);
        router.push("/" + href);
      } else {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        // garante atualização imediata do estado
        if (typeof window !== 'undefined') {
          window.location.hash = href;
          setCurrentHash(href);
        }
      }
    } else {
      // limpamos qualquer hash ativo antes de mudar de rota
      clearHash();
      router.push(href);
    }
  };

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  // Sincroniza/limpa hash quando a rota (pathname) muda
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/') {
      // remove qualquer hash da URL e limpa estado
      if (window.location.hash) {
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          window.location.hash = '';
        }
      }
      setCurrentHash('');
    } else {
      // ao voltar para home, sincroniza com o hash atual
      setCurrentHash(window.location.hash || '');
    }
  }, [pathname]);

  useEffect(() => {
    if (!showUserMenu) return;
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // Tipagem do usuário básico
  interface UserImage {
    url?: string;
    Url?: string;
  }
  interface UserBasic {
    Nome?: string;
    Image?: UserImage[] | null;
    success?: boolean;
    Role?: string;
  }

  interface UserAvatarMenuProps {
    user: UserBasic;
    isMobile?: boolean;
    onGoToPainel?: () => void;
    onLogout?: () => void;
    notificacoes?: Notificacao[];
    unseenCount?: number;
    open?: boolean;
    setOpen?: (open: boolean) => void;
    loadingIds?: string[];
    handleRemoverNotificacao?: (id: string) => Promise<void>;
    marcarNotificacaoComoLida?: () => Promise<{ success: boolean } | null>;
    marcarComoLidas?: () => Promise<void>;
    buttonRef?: React.RefObject<HTMLButtonElement | null>;
    popoverRef?: React.RefObject<HTMLDivElement | null>;
  }

  const UserAvatarMenu: React.FC<UserAvatarMenuProps> = ({ 
    user, 
    isMobile = false, 
    onGoToPainel, 
    onLogout,
    notificacoes = [],
    unseenCount = 0,
    open = false,
    setOpen = () => {},
    loadingIds = [],
    handleRemoverNotificacao = async () => {},
    marcarNotificacaoComoLida = async () => ({ success: true }),
    marcarComoLidas = async () => {},
    buttonRef,
    popoverRef,
  }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const avatarRef = React.useRef<HTMLDivElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const router = useRouter();
    const localButtonRef = React.useRef<HTMLButtonElement>(null);
    const localPopoverRef = React.useRef<HTMLDivElement>(null);
    const effectiveButtonRef = buttonRef || localButtonRef;
    const effectivePopoverRef = popoverRef || localPopoverRef;
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
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);
    let imageUrl: string | null = null;
    if (user && Array.isArray(user.Image) && user.Image[0]?.url && typeof user.Image[0].url === "string" && user.Image[0].url.length > 0) {
      imageUrl = user.Image[0].url;
    }
    // Se não houver imagem, usa o placeholder
    if (!imageUrl) {
      imageUrl = "/assets/avatar-placeholder.svg";
    }
    const isExternal: boolean = !!(imageUrl && imageUrl !== "/assets/avatar-placeholder.svg" && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image")));
    return (
      <div className={`relative flex items-center ${isMobile ? '' : 'justify-end gap-3'}`} style={{ minWidth: isMobile ? undefined : 120 }}>
        {!isMobile && (
          <>
            {/* Ícone de Notificação */}
            <Notificacoes
              open={open}
              setOpen={setOpen}
              notificacoes={notificacoes}
              unseenCount={unseenCount}
              marcarComoLidas={marcarComoLidas}
              loadingIds={loadingIds}
              handleMarcarNotificacaoComoLida={handleRemoverNotificacao}
              marcarNotificacaoComoLida={marcarNotificacaoComoLida}
              buttonRef={effectiveButtonRef}
              popoverRef={effectivePopoverRef}
              isMobile={false}
            />
            {/* Texto de saudação */}
            <span className="text-[#23253a] font-medium whitespace-nowrap max-w-[120px] truncate" style={{fontSize: 16}}>
              Olá {user?.Nome?.split(' ')[0] || 'usuário'}!
            </span>
          </>
        )}
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
              <Image
                src={imageUrl || "/assets/avatar-placeholder.svg"}
                alt="Avatar"
                width={48}
                height={48}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                style={{ minWidth: 40, minHeight: 40, maxWidth: 48, maxHeight: 48, display: 'block' }}
                unoptimized={!isExternal}
              />
            </motion.div>
            {/* Seta ao lado direito do avatar */}
            {!isMobile && (
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
                    <path d="M6 7l3 3 3-3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.span>
              </span>
            )}
          </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-5 w-64 max-w-[90vw] md:left-auto md:right-0 md:top-full md:translate-x-0 md:mt-3 md:w-56 md:max-w-none bg-white shadow-xl rounded-xl z-[9999] border border-[#E6E9FF] py-2"
              style={{ maxWidth: '256px' }}
            >
              <div className="flex flex-col gap-1 px-4 py-2">
                <button
                  className="w-full px-5 py-2 bg-[#6c6bb6] text-white rounded-md font-bold hover:bg-[#23253a] transition-colors cursor-pointer mt-2"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onGoToPainel) {
                      onGoToPainel();
                    } else {
                      router.push('/painel');
                    }
                  }}
                >
                  Painel
                </button>
                <button
                  className="w-full px-5 py-2 mt-1 bg-[#FFE0E0] text-[#B30000] rounded-md font-bold hover:bg-[#b91c1c] transition-colors cursor-pointer flex items-center justify-center gap-2 fira-sans"
                  onClick={async () => {
                    setMenuOpen(false);
                    if (onLogout) {
                      await onLogout();
                    } else {
                      await useAuthStore.getState().logout();
                      router.push('/login');
                    }
                  }}
                >
                  <Image
                    src="/assets/icons/exit.svg"
                    alt="Sair"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  Sair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </Head>
      <motion.header 
        className="bg-[#fcfbf6] w-full sticky top-0 z-50 border-b border-[#E3E6E8] sticky-header"
        initial={mounted ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ margin: 0, padding: 0 }}
      >
        {/* Conteúdo centralizado do header */}
        <div className="w-full max-w-[1300px] mx-auto flex items-center px-4 lg:flex-row flex-col lg:justify-start justify-between" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}> 
          {/* Mobile Header customizado */}
          <div className="flex w-full items-center justify-between lg:hidden">
            {/* Logo à esquerda */}
            <button
              className="inline-flex items-center align-middle cursor-pointer"
              onClick={() => { clearHash(); router.push('/'); }}
              style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
            >
              <Image 
                src="/logo.png" 
                alt="Logo Estação Terapia" 
                width={100} 
                height={35} 
                className="object-contain hover:opacity-80 transition-opacity duration-300 cursor-pointer" 
                style={{ width: 100, height: 35 }}
                priority
                fetchPriority="high"
                sizes="100px"
              />
            </button>
            {/* Avatar ou Botões Cadastro/Login + Menu hamburguer à direita */}
            <div className="flex items-center gap-1.5">
              {!(user && typeof user === 'object' && user.success !== false)
                ? <>
                    <button
                      className="px-2.5 py-1.5 border-2 border-[#6D75C0] text-[#6D75C0] rounded-[6px] font-medium text-[13px] bg-transparent hover:bg-[#ecebfa] transition-colors whitespace-nowrap cursor-pointer"
                      onClick={() => router.push('/register')}
                    >
                      Criar conta
                    </button>
                    <button
                      className="px-2.5 py-1.5 bg-[#6D75C0] text-[#FCFBF6] rounded-[6px] font-medium text-[13px] border-2 border-[#6D75C0] hover:bg-[#23253a] transition-colors whitespace-nowrap cursor-pointer"
                      onClick={() => router.push('/login')}
                    >
                      Entrar
                    </button>
                  </>
                : null
              }
              <button
                className="p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-[#6c6bb6]"
                aria-label="Abrir menu"
                onClick={() => setMenuOpen(true)}
              >
                <span className="block w-6 h-0.5 bg-[#23253a] mb-1"></span>
                <span className="block w-6 h-0.5 bg-[#23253a] mb-1"></span>
                <span className="block w-6 h-0.5 bg-[#23253a]"></span>
              </button>
            </div>
          </div>
          {/* Desktop Header */}
          <div className="hidden lg:flex w-full items-center justify-between">
            {/* Logo à esquerda */}
            <button
              className="inline-flex items-center align-middle cursor-pointer min-w-[180px]"
              onClick={() => { clearHash(); router.push('/'); }}
              style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
            >
              <Image 
                src="/logo.png" 
                alt="Logo Estação Terapia" 
                width={190} 
                height={64} 
                className="object-contain hover:opacity-80 transition-opacity duration-300 cursor-pointer" 
                style={{ width: 190, height: 64 }}
                priority
                fetchPriority="high"
                sizes="190px"
              />
            </button>
            {/* Links de navegação */}
            <nav className="flex gap-3 xl:gap-5 2xl:gap-6 ml-8 flex-1">
              {navLinks
                .filter((link) => {
                  // Oculta "Ver psicólogos" se o usuário for Psicólogo
                  const isLoggedIn = user && typeof user === 'object' && user.success !== false;
                  const isPsychologist = isLoggedIn && user.Role === "Psychologist";
                  if (link.href === '/ver-psicologos' && isPsychologist) {
                    return false;
                  }
                  return true;
                })
                .map((link, idx) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    handleAnchorClick(link.href, link.external);
                  }}
                  className={`font-sans text-[16px] leading-[24px] font-medium align-middle text-[#26220D] px-2 py-1 rounded-md transition-colors whitespace-nowrap flex items-center justify-center
                    ${isActive(link.href) ? 'bg-[#c7d0fa] text-[#23253a]' : 'hover:bg-[#e5e9fa] hover:text-[#23253a]'} cursor-pointer
                    ${idx === navLinks.length - 1 ? 'mr-4 2xl:mr-8' : ''}`}
                  style={{letterSpacing: 0, verticalAlign: 'middle'}}
                >
                  {link.label}
                </button>
              ))}
            </nav>
            {/* Avatar ou Botões Desktop */}
            {user && typeof user === 'object' && user.success !== false && user.Role !== "Admin"
              ? <UserAvatarMenu 
                  user={{
                    Nome: user.Nome,
                    Image: Array.isArray(user.Image)
                      ? user.Image.map((img: UserImage) => ({ url: img.url ?? img.Url }))
                      : user.Image
                        ? [{ url: (user.Image as UserImage).url ?? (user.Image as UserImage).Url }]
                        : null,
                    success: user.success,
                    Role: user.Role
                  }} 
                  isMobile={false}
                  notificacoes={notificacoes}
                  unseenCount={unseenCount}
                  open={open}
                  setOpen={setOpen}
                  loadingIds={loadingIds}
                  handleRemoverNotificacao={handleRemoverNotificacao}
                  marcarNotificacaoComoLida={async () => {
                    await marcarNotificacaoComoLida();
                    return { success: true };
                  }}
                  marcarComoLidas={async () => { await marcarComoLidas(); }}
                  buttonRef={buttonRef}
                  popoverRef={popoverRef}
                />
              : <div className="gap-[16px] min-w-[120px] justify-end flex relative">
                  <button
                    className="w-[133px] h-[40px] px-[16px] flex items-center justify-center border-2 border-[#6D75C0] text-[#6D75C0] rounded-[6px] font-bold fira-sans text-[16px] leading-[24px] bg-transparent hover:bg-[#6B7DD8] hover:text-white hover:border-[#6B7DD8] transition-colors whitespace-nowrap cursor-pointer"
                    style={{letterSpacing: 0, verticalAlign: 'middle'}}
                    onClick={() => router.push('/register')}
                  >
                    Criar conta
                  </button>
                  <button
                    className="w-[133px] h-[40px] px-[16px] flex items-center justify-center bg-[#6D75C0] text-[#FCFBF6] rounded-[6px] font-bold fira-sans text-[16px] leading-[24px] border-2 border-[#6D75C0] hover:bg-[#6B7DD8] hover:border-[#6B7DD8] transition-colors whitespace-nowrap cursor-pointer"
                    style={{letterSpacing: 0, verticalAlign: 'middle'}}
                    onClick={() => router.push('/login')}
                  >
                    Entrar
                  </button>
                </div>
            }
          </div>
        </div>

        {/* Drawer Mobile */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="fixed inset-0 bg-transparent z-50 flex justify-center items-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#fcfbf7] w-full h-auto shadow-lg flex flex-col relative mt-0 rounded-b-[48px]"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                exit={{ y: -100 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-200">
                  <button
                    className="inline-flex items-center align-middle"
                    onClick={() => {
                      setMenuOpen(false);
                      clearHash();
                      router.push('/');
                    }}
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                  >
                    <Image 
                      src="/logo.png" 
                      alt="Logo Estação Terapia" 
                      width={140} 
                      height={48} 
                      className="object-contain hover:opacity-80 transition-opacity duration-300" 
                      style={{ width: 140, height: 48 }} 
                      priority
                      fetchPriority="high"
                      sizes="140px"
                    />
                  </button>
                  <button
                    className="absolute top-4 right-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#6c6bb6]"
                    aria-label="Fechar menu"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="#23253a" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M6 6L18 18" stroke="#23253a" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <div className="flex flex-col gap-4 px-4 py-6 flex-1">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      type="button"
                      className={`text-center font-extrabold text-lg leading-6 align-middle py-2 transition-colors
                        ${isActive(link.href) ? 'bg-[#c7d0fa] text-[#23253a]' : 'text-[#212529] hover:text-[#6c6bb6]'} cursor-pointer
                      `}
                      onClick={() => {
                        setMenuOpen(false);
                        handleAnchorClick(link.href, link.external);
                      }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
                {/* Avatar ou Botões Drawer Mobile */}
                <div className="flex flex-col gap-3 px-4 pb-6">
                  {user && typeof user === 'object' && user.success !== false
                    ? <>
                        <button
                          className="w-full px-5 py-2 bg-[#c7d0fa] text-[#23253a] rounded-md font-bold hover:bg-[#6c6bb6] hover:text-white transition-colors cursor-pointer"
                          onClick={() => {
                            setMenuOpen(false);
                            router.push('/painel');
                          }}
                        >
                          Painel
                        </button>
                        <button
                          className="w-full px-5 py-2 bg-[#ffe0e0] text-[#b30000] rounded-md font-bold hover:bg-[#b91c1c] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2 fira-sans"
                          onClick={async () => {
                            setMenuOpen(false);
                            await useAuthStore.getState().logout();
                            router.push('/login');
                          }}
                        >
                          <Image
                            src="/assets/icons/exit.svg"
                            alt="Sair"
                            width={20}
                            height={20}
                            className="w-5 h-5"
                          />
                          Sair
                        </button>
                      </>
                    : <>
                        <button
                          className="w-full px-5 py-2 border-2 border-[#6c6bb6] text-[#6c6bb6] rounded-md font-bold bg-transparent hover:bg-[#6B7DD8] hover:text-white hover:border-[#6B7DD8] transition-colors"
                          onClick={() => {
                            setMenuOpen(false);
                            router.push('/register');
                          }}
                        >
                          Criar conta
                        </button>
                        <button
                          className="w-full px-5 py-2 bg-[#6c6bb6] text-white rounded-md font-bold hover:bg-[#6B7DD8] transition-colors cursor-pointer"
                          onClick={() => {
                            setMenuOpen(false);
                            router.push('/login');
                          }}
                        >
                          Entrar
                        </button>
                      </>
                  }
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
};

export default Header;
