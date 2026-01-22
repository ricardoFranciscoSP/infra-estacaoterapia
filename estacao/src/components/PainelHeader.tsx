"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { HeaderSala } from "./HeaderSala";
import PainelSidebar from "@/components/PainelSidebar";
import { useNotificacoes } from "@/store/useNotificacoes";
import { Notificacoes } from "./Notificacoes";
import Image from "next/image";
import { useSocketNotifications } from "@/hooks/useSocket/useSocketNotificacoes";
import Link from "next/link";
import { useProfilePercent } from "@/hooks/user/useProfilePercent";
 
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

// Eventos serão consumidos apenas via hook de socket, evitando payloads duplicados

import type { User } from '@/hooks/user/userHook';

interface PainelHeaderProps {
  user?: User;
}

// Componente MobileSidebarPsicologo - versão simplificada para mobile
function MobileSidebarPsicologo({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const agendaRef = useRef<HTMLLIElement>(null);

  const menuItems = [
    {
      label: "Painel geral",
      href: "/painel-psicologo",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/icon-pc.svg" alt="Painel geral" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Agenda",
      href: "/painel-psicologo/agenda",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/icon-calendar.svg" alt="Agenda" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Financeiro",
      href: "/painel-psicologo/financeiro",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/icon-union.svg" alt="Financeiro" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Meus pacientes",
      href: "/painel-psicologo/consultas",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/icon-message.svg" alt="Meus pacientes" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Solicitações",
      href: "/painel-psicologo/solicitacoes",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/icon-pc.svg" alt="Solicitações" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Meu perfil",
      href: "/painel-psicologo/meu-perfil",
      icon: (props?: { className?: string }) => (
        <Image src="/assets/icons/user.svg" alt="Meu perfil" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
      ),
    },
    {
      label: "Políticas e Termos",
      href: "/painel-psicologo/políticas-e-termos",
      icon: (props?: { className?: string }) => (
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={props?.className}
          style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}}
        >
          <path 
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M14 2v6h6" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M16 13H8" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M16 17H8" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M10 9H8" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      label: "Suporte",
      href: "#",
      isExternal: true,
      icon: (props?: { className?: string }) => (
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={props?.className}
          style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}}
        >
          <path 
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" 
            fill="currentColor"
          />
        </svg>
      ),
    },
  ];

  function handleLinkClick(href: string) {
    if (pathname !== href) {
      router.push(href);
      onClose();
    }
  }

  useEffect(() => {
    if (pathname?.includes("/agenda")) {
      setAgendaOpen(true);
    }
  }, [pathname]);

  return (
    <nav className="flex-1 px-2 py-4 overflow-y-auto">
      <ul className="space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/painel-psicologo" && pathname?.startsWith(item.href));
          
          if (item.isExternal && item.label === "Suporte") {
            const whatsappNumber = "5511960892131";
            const whatsappMessage = "Olá, preciso de suporte na Estação Terapia.";
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
            
            return (
              <li key={item.label}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-50 hover:shadow-sm"
                >
                  <span className="flex-shrink-0 text-[#25D366]">
                    {typeof item.icon === "function" ? item.icon({ className: "text-[#25D366]" }) : item.icon}
                  </span>
                  <span className="text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]">
                    {item.label}
                  </span>
                </a>
              </li>
            );
          }
          
          if (item.label === "Agenda") {
            return (
              <li key={item.label} className="relative" ref={agendaRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAgendaOpen((v) => !v);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#6D75C0] text-white font-semibold shadow-md"
                      : "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                  aria-expanded={agendaOpen}
                >
                  <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#6D75C0]"}`}>
                    {typeof item.icon === "function"
                      ? item.icon({ className: isActive ? "text-white" : "text-[#6D75C0]" })
                      : item.icon}
                  </span>
                  <span className={`flex-1 text-left ${
                    isActive
                      ? "text-white text-[14px] leading-6 font-[500] font-[fira-sans]"
                      : "text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]"
                  }`}>
                    {item.label}
                  </span>
                  <svg
                    className={`ml-auto w-4 h-4 transition-all duration-200 ${
                      agendaOpen ? "rotate-90" : ""
                    } ${isActive ? "text-white" : "text-gray-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {agendaOpen && (
                  <ul className="mt-1 space-y-1 pl-4">
                    <li>
                      <Link
                        href="/painel-psicologo/agenda"
                        className="block px-3 py-2 rounded-lg transition-all duration-200 text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans] hover:bg-[#E3E4F3] hover:text-[#6366f1]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAgendaOpen(false);
                          handleLinkClick("/painel-psicologo/agenda");
                        }}
                      >
                        Agenda
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/painel-psicologo/ver-agenda"
                        className="block px-3 py-2 rounded-lg transition-all duration-200 text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans] hover:bg-[#E3E4F3] hover:text-[#6366f1]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAgendaOpen(false);
                          handleLinkClick("/painel-psicologo/ver-agenda");
                        }}
                      >
                        Ver agenda
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            );
          }
          
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-[#6D75C0] text-white font-semibold shadow-md"
                    : "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.href);
                }}
              >
                <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#6D75C0]"}`}>
                  {typeof item.icon === "function"
                    ? item.icon({ className: isActive ? "text-white" : "text-[#6D75C0]" })
                    : item.icon}
                </span>
                <span className={`${
                  isActive
                    ? "text-white text-[14px] leading-6 font-[500] font-[fira-sans]"
                    : "text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]"
                }`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      <hr className="my-4 border-gray-200" />
      
      <ul>
        <li>
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 w-full"
            onClick={async () => {
              await logout();
              onClose();
            }}
          >
            <Image 
              src="/assets/icons/exit.svg" 
              alt="Sair" 
              width={20} 
              height={20}
            />
            <span className="text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]">
              Sair
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default function PainelHeader({ user }: PainelHeaderProps) {
  // ⚡ OTIMIZAÇÃO: Estado para garantir que componente está montado
  const [mounted, setMounted] = useState(false);
  
  // Consome usuário e loading diretamente do store
  const storeUser = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const effectiveUser = user ?? storeUser;
  
  // Calcula o percentual de preenchimento do perfil
  const profilePercent = useProfilePercent();

  // ⚡ OTIMIZAÇÃO: Garante que o componente está montado antes de fazer operações do cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Busca o usuário do store se não houver usuário disponível via prop
  useEffect(() => {
    if (!user && !effectiveUser && !isLoading) {
      fetchUser();
    }
  }, [user, effectiveUser, isLoading, fetchUser]);
  
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
    // Troca de usuário: limpa o cache de IDs processados
    processedIdsRef.current.clear();
  }, [user?.Id]);

  // ✅ Ref para o áudio de notificação
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    // Cria o elemento de áudio apenas no cliente
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://actions.google.com/sounds/v1/notifications/notification_simple-01.mp3');
      audioRef.current.volume = 0.5; // Volume ajustável (0.0 a 1.0)
    }
  }, []);

  // ✅ Função para tocar o som de notificação
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reinicia o áudio se já estiver tocando
      audioRef.current.play().catch(error => {
        console.warn('⚠️ Não foi possível tocar o som de notificação:', error);
      });
    }
  }, []);

  // ⚡ OTIMIZAÇÃO: Carrega notificações de forma não-bloqueante (não impede renderização)
  useEffect(() => {
    if (mounted && effectiveUser?.Id) {
      // Usa setTimeout para não bloquear a renderização inicial
      const timer = setTimeout(() => {
        fetchNotificacoes();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mounted, fetchNotificacoes, effectiveUser?.Id]);

  // Agrupa logs de debug em um único useEffect
  useEffect(() => {
  // ...existing code...
  }, [unseenCount, rawNotificacoes, effectiveUser]);

  // Handler para novas notificações vindo do socket (estável e com deduplicação)
  const handleNewNotification = useCallback((data: SocketNotification) => {
    const finalId = data.Id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (processedIdsRef.current.has(finalId)) {
      console.debug('⏭️ [WS] Ignorada (já processada):', finalId);
      return;
    }
    if (rawNotificacoesRef.current.some((n) => n.Id === finalId)) {
      console.debug('⏭️ [WS] Ignorada (já existe no estado):', finalId);
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

    // ✅ Marca como processada ANTES de adicionar
    processedIdsRef.current.add(finalId);

    // ✅ Adiciona a notificação ao store (já atualiza o contador automaticamente)
    addNotificacao(novaNotificacao);

    // ✅ Toca o som de notificação
    playNotificationSound();

    // ✅ Recarrega notificações após um pequeno delay para garantir sincronização completa
    // Isso garante que se houver alguma atualização no backend, seja refletida
    setTimeout(() => {
      fetchNotificacoes();
    }, 500);
  }, [addNotificacao, playNotificationSound, fetchNotificacoes]);

  // ✅ Usa o hook para escutar notificações (opções memorizadas)
  const socketOptions = useMemo(() => ({ onNotification: handleNewNotification }), [handleNewNotification]);
  useSocketNotifications(effectiveUser?.Id || "", socketOptions);

  // O hook de socket já cuida da inscrição nos eventos necessários

  // Listener manual para 'notification:new' removido; usamos apenas useSocketNotifications

  // ✅ Garantir que todas notificações tenham o tipo esperado pelo componente Notificacoes
  const notificacoes = useMemo(
    () =>
      rawNotificacoes.map((n: RawNotification) => ({
        Id: n.Id,
        Title: n.Title,
        Message: n.Message,
        CreatedAt: n.CreatedAt,
        IsForAllUsers: n.IsForAllUsers ?? false,
        Read: n.Lida ?? false, // Converte Lida para Read para compatibilidade com o tipo Notification
      })),
    [rawNotificacoes]
  );

  const logout = useAuthStore((state) => state.logout);
  
  // Função helper para extrair a URL da imagem do usuário
  // Suporta dois formatos: array com { url } (authStore) ou objeto único com { Url } (userHook)
  // Retorna o placeholder se não houver imagem cadastrada
  const getUserImageUrl = useCallback((user: typeof effectiveUser): string | null => {
    if (!user) return "/assets/avatar-placeholder.svg";
    
    // Formato 1: Array com objetos { url: string } (authStore)
    if (Array.isArray(user.Image) && user.Image.length > 0) {
      const firstImage = user.Image[0];
      if (firstImage && 'url' in firstImage && typeof firstImage.url === "string" && firstImage.url.length > 0) {
        return firstImage.url;
      }
      if (firstImage && 'Url' in firstImage && typeof firstImage.Url === "string" && firstImage.Url.length > 0) {
        return firstImage.Url;
      }
    }
    
    // Formato 2: Objeto único com { Url: string } ou null (userHook)
    if (user.Image && !Array.isArray(user.Image)) {
      const image = user.Image as { Url?: string; url?: string };
      if (image.Url && typeof image.Url === "string" && image.Url.length > 0) {
        return image.Url;
      }
      if (image.url && typeof image.url === "string" && image.url.length > 0) {
        return image.url;
      }
    }
    
    // Retorna o placeholder quando não há imagem cadastrada
    return "/assets/avatar-placeholder.svg";
  }, []);
  
  // Estado para controlar se já tentou carregar o usuário
  const [hasTriedFetch, setHasTriedFetch] = useState(false);
  
  // Tenta buscar o usuário uma vez se não houver usuário disponível
  useEffect(() => {
    if (!effectiveUser && !isLoading && !hasTriedFetch) {
      setHasTriedFetch(true);
      fetchUser();
    }
  }, [effectiveUser, isLoading, hasTriedFetch, fetchUser]);
  
  // Extrai o primeiro nome do usuário, com fallback
  // Prioriza mostrar o nome mesmo durante carregamento para melhor UX
  const firstName = useMemo(() => {
    // Tenta pegar do effectiveUser primeiro
    if (effectiveUser?.Nome) {
      const name = effectiveUser.Nome.split(' ')[0];
      if (name && name.trim().length > 0) {
        return name;
      }
    }
    // Se não tiver, tenta do storeUser
    if (storeUser?.Nome) {
      const name = storeUser.Nome.split(' ')[0];
      if (name && name.trim().length > 0) {
        return name;
      }
    }
    // Se não tiver, tenta do user passado como prop
    if (user?.Nome) {
      const name = user.Nome.split(' ')[0];
      if (name && name.trim().length > 0) {
        return name;
      }
    }
    return '';
  }, [effectiveUser?.Nome, storeUser?.Nome, user?.Nome]);

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPsicologoOpen, setSidebarPsicologoOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Função helper para determinar o prefixo correto baseado no role do usuário
  const getBasePath = useCallback(() => {
    return effectiveUser?.Role === "Psychologist" ? "/painel-psicologo" : "/painel";
  }, [effectiveUser?.Role]);

  // Função helper para retornar a URL correta do perfil baseado no role
  const getProfileUrl = useCallback(() => {
    return effectiveUser?.Role === "Psychologist" 
      ? "/painel-psicologo/meu-perfil" 
      : "/painel/minha-conta/dados-pessoais";
  }, [effectiveUser?.Role]);

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

  // Fecha sidebar (menu hambúrguer) ao clicar fora
  useEffect(() => {
    if (!sidebarOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  if (pathname && pathname.startsWith("/painel/room")) {
    return <HeaderSala />;
  }

  // Exibe loading apenas se não houver usuário disponível (nem via prop nem via store) E estiver carregando
  // Se o usuário vier via prop, não bloqueia a renderização mesmo que o store esteja carregando
  const shouldShowLoading = !effectiveUser && isLoading && !user;
  
  if (shouldShowLoading) {
    return (
      <motion.header className="w-full bg-white shadow-sm sticky top-0 z-50 sticky-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="animate-pulse w-32 h-8 bg-gray-200 rounded" />
            <div className="animate-pulse w-10 h-10 bg-gray-200 rounded-full" />
          </div>
        </div>
      </motion.header>
    );
  }

  // Função para remover uma notificação individualmente
  async function handleRemoverNotificacao(id: string) {
    setLoadingIds((prev) => [...prev, id]);
    await removeNotification(id);
    setLoadingIds((prev) => prev.filter((loadingId) => loadingId !== id));
  }

  // Verifica se está no painel do psicólogo para aplicar estilo lilás
  const isPainelPsicologo = pathname?.startsWith("/painel-psicologo") || effectiveUser?.Role === "Psychologist";
  
  return ( 
    <motion.header
      className={`w-full shadow-sm sticky top-0 z-50 sticky-header ${
        isPainelPsicologo ? "bg-[#8494E9]" : "bg-white"
      }`}
      initial={mounted ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className={`${isPainelPsicologo ? "w-full md:max-w-[1200px] md:mx-auto" : "max-w-7xl mx-auto"} ${isPainelPsicologo ? "px-4 md:pl-8 md:pr-6" : "px-4 md:px-6"} flex flex-row flex-nowrap items-center justify-between gap-3 ${isPainelPsicologo ? "py-2.5 md:py-3" : "py-3"} ${isPainelPsicologo ? "text-white" : ""}`}>
        {/* Logo - ESQUERDA - Mobile paciente inline */}
        <div className="flex items-center shrink-0">
          {/* Menu hamburguer para /painel/minha-conta/* - apenas mobile */}
          {!isPainelPsicologo && pathname && pathname.startsWith("/painel/minha-conta") && (
            <div className="md:hidden flex items-center mr-3">
              <button
                className="flex items-center justify-center w-10 h-10 rounded focus:outline-none"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
                type="button"
              >
                <svg className={`w-7 h-7 text-[#49525A]`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "-100%", opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="fixed inset-0 z-[120] flex pointer-events-auto"
                  >
                    {/* Sidebar sem overlay */}
                    <div ref={sidebarRef} className="relative z-10 bg-white w-64 max-w-full h-full shadow-xl">
                      <div className="flex justify-end p-4">
                        <button
                          onClick={() => setSidebarOpen(false)}
                          aria-label="Fechar menu"
                          className="text-2xl"
                        >
                          <svg className={`w-7 h-7 text-[#49525A]`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <PainelSidebar active={pathname} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {/* Menu hamburguer - SIDEBAR MOBILE - Psicólogo - à esquerda do logo */}
          {isPainelPsicologo && (
            <div className="md:hidden flex items-center mr-3">
              <button
                className="flex items-center justify-center w-10 h-10 rounded focus:outline-none"
                onClick={() => setSidebarPsicologoOpen(true)}
                aria-label="Abrir menu"
                type="button"
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
          <Link
            href={getBasePath()}
            className="flex items-center hover:cursor-pointer"
            style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
          >
            <Image
              src={isPainelPsicologo ? "/assets/logo/logo-escuro.svg" : "/logo.png"}
              alt="Estação Terapia"
              width={isPainelPsicologo ? 180 : 140}
              height={isPainelPsicologo ? 62 : 48}
              className={`object-contain cursor-pointer hover:opacity-80 transition-opacity duration-300 ${
                isPainelPsicologo 
                  ? "w-[120px] h-[41px] sm:w-[180px] sm:h-[62px]" 
                  : "w-[140px] h-[48px] md:w-[180px] md:h-[62px]"
              }`}
              priority
              fetchPriority="high"
            />
          </Link>
        </div>
        
        {/* Sidebar Mobile - SIDEBAR MOBILE - Psicólogo */}
        {isPainelPsicologo && (
          <>
            <AnimatePresence>
              {sidebarPsicologoOpen && (
                <>
                  {/* Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-transparent z-[120]"
                    onClick={() => setSidebarPsicologoOpen(false)}
                  />
                  {/* Sidebar */}
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="fixed inset-y-0 left-0 z-[121] w-64 max-w-[85vw] bg-white shadow-xl overflow-y-auto"
                  >
                    <div className="flex justify-end p-4 border-b border-gray-200">
                      <button
                        onClick={() => setSidebarPsicologoOpen(false)}
                        aria-label="Fechar menu"
                        className="text-2xl text-gray-600 hover:text-gray-800"
                      >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-2">
                      <MobileSidebarPsicologo onClose={() => setSidebarPsicologoOpen(false)} />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Ícones à direita - DIREITA (Sino + Avatar) - Mobile */}
        <div className="flex items-center gap-3 ml-auto shrink-0 whitespace-nowrap md:hidden">
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
            isMobile={true}
            iconColor={isPainelPsicologo ? "#fff" : "#2B2B2B"}
            isPainelPsicologo={isPainelPsicologo}
            fetchNotificacoes={fetchNotificacoes}
          />
          {/* Avatar e seta */}
          <div className="relative flex items-center">
            <div
              ref={avatarRef}
              className="rounded-full bg-[#E6E9FF] flex items-center justify-center cursor-pointer w-10 h-10 md:w-12 md:h-12 transition-all duration-200 overflow-hidden"
              style={{ opacity: 1, transform: 'rotate(0deg)' }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {/* Avatar: mostra imagem do banco se existir, senão mostra padrão */}
              {(() => {
                const imageUrl = getUserImageUrl(effectiveUser);
                const isExternal = imageUrl && imageUrl !== "/assets/avatar-placeholder.svg" && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image"));
                return (
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
                );
              })()}
            </div>
            {/* Seta ao lado direito do avatar, fora da imagem */}
            <span
              className="flex items-center ml-2 cursor-pointer"
              style={{ height: 32 }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: menuOpen ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 7l3 3 3-3" stroke={isPainelPsicologo ? "#fff" : "#000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                  className="absolute right-0 top-12 mt-2 w-64 bg-white shadow-xl rounded-xl z-[9999] border border-[#E6E9FF] py-2 md:w-56"
                  style={{ maxWidth: '320px' }}
                >
                  <div
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#E6E9FF] text-[#49525AB]"
                    }`}
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Minha conta
                  </div>
                  {/* Mostra "Psicólogos favoritos" apenas se o usuário NÃO for psicólogo */}
                  {effectiveUser?.Role !== "Psychologist" && (
                    <div
                      className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                        isPainelPsicologo 
                          ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                          : "hover:bg-[#E6E9FF] text-[#49525AB]"
                      }`}
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(`/painel/minha-conta/psicologos-favoritos`);
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
                        style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                      />
                      Psicólogos favoritos
                    </div>
                  )}
                  <div
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#E6E9FF] text-[#49525AB]"
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(isPainelPsicologo ? `${getBasePath()}/faq` : `${getBasePath()}/perguntas-frequentes`);
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Perguntas frequentes
                  </div>
                  <div className={`my-2 border-t ${isPainelPsicologo ? "border-[#E6E9FF]" : "border-[#E6E9FF]"}`} />
                  <button
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#FFE6E6] text-[#49525A]"
                    }`}
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Sair da conta
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Navegação - só desktop */}
        {isPainelPsicologo ? (
          <div className="hidden md:flex items-center gap-8 flex-shrink-0">
            <nav className="flex gap-6">
              <a
                href="/painel-psicologo"
                className={`text-white font-medium px-3 py-1 rounded-lg ${pathname === "/painel-psicologo" ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                Início
              </a>
              <a
                href="/painel-psicologo/agenda"
                className={`text-white font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel-psicologo/agenda") ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                Agenda
              </a>
              <a
                href="/painel-psicologo/consultas"
                className={`text-white font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel-psicologo/consultas") ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                Meus pacientes
              </a>
              <a
                href="/painel-psicologo/financeiro"
                className={`text-white font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel-psicologo/financeiro") ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                Financeiro
              </a>
            </nav>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-8 flex-shrink-0 flex-1 justify-center">
            <nav className="flex gap-6">
              <a
                href={getBasePath()}
                className={`text-[#2B2B2B] font-medium px-3 py-1 rounded-lg ${pathname === getBasePath() ? "bg-[#E6E9FF]" : "hover:bg-[#E6E9FF]"}`}
              >
                Início
              </a>
              <a
                href="/painel/consultas"
                className={`text-[#2B2B2B] font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel/consultas") ? "bg-[#E6E9FF]" : "hover:bg-[#E6E9FF]"}`}
              >
                Minhas consultas
              </a>
              <a
                href="/painel/psicologos"
                className={`text-[#2B2B2B] font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel/psicologos") ? "bg-[#E6E9FF]" : "hover:bg-[#E6E9FF]"}`}
              >
                Ver psicólogos
              </a>
              <a
                href="/painel/planos"
                className={`text-[#2B2B2B] font-medium px-3 py-1 rounded-lg ${pathname?.startsWith("/painel/planos") ? "bg-[#E6E9FF]" : "hover:bg-[#E6E9FF]"}`}
              >
                Planos
              </a>
            </nav>
          </div>
        )}
        {/* Notificações, nome do usuário e avatar - DIREITA - só desktop */}
        <div id="notificacao" className="hidden md:flex items-center gap-3 relative shrink-0">
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
            iconColor={isPainelPsicologo ? "#fff" : "#2B2B2B"}
            isPainelPsicologo={isPainelPsicologo}
            fetchNotificacoes={fetchNotificacoes}
          />
          {/* Nome do usuário - só desktop, entre sino e avatar */}
          <div className={`hidden md:flex flex-col items-start justify-center ${isPainelPsicologo ? "mx-2" : "mx-2"}`}>
            <span id="notificacao" className={`font-medium ${
              isPainelPsicologo ? "text-white" : "text-[#2B2B2B]"
            }`}>
              {firstName ? `Olá ${firstName}!` : "Olá!"}
            </span>
            {effectiveUser?.Role === "Psychologist" && (
              <span
                className="
                  mt-1
                  flex items-center justify-center
                  w-[118px] h-[22px]
                  px-3
                  rounded-full
                  border
                  border-white
                  opacity-100
                  bg-white/20
                  backdrop-blur-sm
                  whitespace-nowrap
                "
              >
                <span
                  className="
                    text-white text-center
                    font-fira-sans
                    font-medium
                    text-[10px]
                    leading-[14px]
                    tracking-[0]
                  "
                  style={{
                    fontFamily: 'var(--font-fira-sans), system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: 10,
                    lineHeight: '14px',
                    letterSpacing: 0
                  }}
                >
                  Nota perfil: {profilePercent}%
                </span>
              </span>
            )}
          </div>
          {/* Avatar e menu */}
          <div className="relative flex items-center">
            <div
              ref={avatarRef}
              className="rounded-full bg-[#E6E9FF] flex items-center justify-center cursor-pointer w-10 h-10 md:w-12 md:h-12 transition-all duration-200 overflow-hidden"
              style={{ opacity: 1, transform: 'rotate(0deg)' }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {/* Avatar: mostra imagem do banco se existir, senão mostra padrão */}
              {(() => {
                const imageUrl = getUserImageUrl(effectiveUser);
                const isExternal = imageUrl && imageUrl !== "/assets/avatar-placeholder.svg" && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image"));
                return (
                  <>
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
                    <span
                      className="flex items-center absolute  top-1/2 -translate-y-1/2 pr-2 ml-10"
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
                          <path d="M6 7l3 3 3-3" stroke={isPainelPsicologo ? "#fff" : "#000"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.span>
                    </span>
                  </>
                );
              })()}
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
                 
                  <div
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#E6E9FF] text-[#49525AB]"
                    }`}
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Minha conta
                  </div>
                  {/* Mostra "Psicólogos favoritos" apenas se o usuário NÃO for psicólogo */}
                  {effectiveUser?.Role !== "Psychologist" && (
                    <div
                      className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                        isPainelPsicologo 
                          ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                          : "hover:bg-[#E6E9FF] text-[#49525AB]"
                      }`}
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(`/painel/minha-conta/psicologos-favoritos`);
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
                        style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                      />
                      Psicólogos favoritos
                    </div>
                  )}
                  <div
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#E6E9FF] text-[#49525AB]"
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(isPainelPsicologo ? `${getBasePath()}/faq` : `${getBasePath()}/perguntas-frequentes`);
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Perguntas frequentes
                  </div>
                  <div className={`my-2 border-t ${isPainelPsicologo ? "border-[#E6E9FF]" : "border-[#E6E9FF]"}`} />
                  <button
                    className={`w-full flex items-center gap-3 text-left px-5 py-2 cursor-pointer ${
                      isPainelPsicologo 
                        ? "hover:bg-[#E6E9FF] text-[#23253A]" 
                        : "hover:bg-[#FFE6E6] text-[#49525A]"
                    }`}
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
                      style={{ filter: isPainelPsicologo ? "brightness(0) saturate(100%)" : "none" }}
                    />
                    Sair da conta
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}