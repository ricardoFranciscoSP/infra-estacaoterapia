"use client";
import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";


interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  modules?: string[];
  basePath?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onClose, modules, basePath = "/adm-estacao" }) => {
  const logout = useAuthStore((state) => state.logout);
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [gestaoConsultasOpen, setGestaoConsultasOpen] = useState(false);
  const configRef = useRef<HTMLLIElement>(null);
  const relatoriosRef = useRef<HTMLLIElement>(null);
  const gestaoConsultasRef = useRef<HTMLLIElement>(null);

  // Normaliza pathname removendo barra final (exceto na raiz)
  const currentPath = (pathname?.replace(/\/+$/, "") || "/");

  const isActive = (href: string) => {
    const hrefNorm = href.replace(/\/+$/, "") || "/";
    // Para a raiz do admin, match exato
    if (hrefNorm === basePath) {
      return currentPath === hrefNorm;
    }
    // Para as demais rotas, match exato ou prefixo seguido de '/'
    return currentPath === hrefNorm || currentPath.startsWith(hrefNorm + "/");
  };

  // Abre submenu de Configurações se estiver em uma rota relacionada
  useEffect(() => {
    if (
      currentPath?.includes("/configuracoes") ||
      currentPath?.includes("/seguranca") ||
      currentPath?.includes("/auditoria") ||
      currentPath?.includes("/permissoes") ||
      currentPath?.includes("/logs") ||
      currentPath?.includes("/log-view") ||
      currentPath?.includes("/gerar-token-manual")
    ) {
      setConfigOpen(true);
    }
  }, [currentPath]);

  // Abre submenu de Relatórios se estiver em uma rota relacionada
  useEffect(() => {
    if (currentPath?.includes("/relatorios")) {
      setRelatoriosOpen(true);
    }
  }, [currentPath]);

  // Abre submenu de Gestão de Consultas se estiver em uma rota relacionada
  useEffect(() => {
    if (currentPath?.includes("/gestao-consultas")) {
      setGestaoConsultasOpen(true);
    }
  }, [currentPath]);

  // Fecha submenu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        configRef.current &&
        !configRef.current.contains(event.target as Node)
      ) {
        setConfigOpen(false);
      }
      if (
        relatoriosRef.current &&
        !relatoriosRef.current.contains(event.target as Node)
      ) {
        setRelatoriosOpen(false);
      }
      if (
        gestaoConsultasRef.current &&
        !gestaoConsultasRef.current.contains(event.target as Node)
      ) {
        setGestaoConsultasOpen(false);
      }
    }
    if (configOpen || relatoriosOpen || gestaoConsultasOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [configOpen, relatoriosOpen, gestaoConsultasOpen]);

  const allLinks: Array<{ href: string; label: string; icon: string; config?: boolean }> = [
    { href: `${basePath}`, label: "Dashboard", icon: "dashboard" },
    { href: `${basePath}/psicologos`, label: "Psicólogos", icon: "users" },
    { href: `${basePath}/pacientes`, label: "Pacientes", icon: "users-alt" },
    { href: `${basePath}/depoimentos`, label: "Depoimentos", icon: "chat" },
    { href: `${basePath}/faq`, label: "Faq", icon: "question" },
    { href: `${basePath}/gestao-consultas`, label: "Gestão de Consultas", icon: "calendar" },
    { href: `${basePath}/gerar-agenda-manual`, label: "Gerar Agenda Manual", icon: "calendar" },
    { href: `${basePath}/relatorios`, label: "Relatórios", icon: "report" },
    { href: `${basePath}/financeiro`, label: "Financeiro", icon: "money" },
    { href: `${basePath}/notificacoes`, label: "Notificações", icon: "bell" },
    { href: `${basePath}/solicitacoes`, label: "Solicitações", icon: "inbox" },
    { href: `${basePath}/configuracoes`, label: "Configurações", icon: "cog", config: true },
  ];
  // Se modules for passado, filtra os links
  const links = modules
    ? allLinks.filter((l) => modules.includes(l.label))
    : allLinks;

  const Icon: React.FC<{ name: string; active?: boolean }> = ({ name, active }) => {
    const common = `w-5 h-5 flex-shrink-0 ${active ? "text-[#8494E9]" : "text-[#6C757D]"}`;
    switch (name) {
      case "dashboard":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h7V3H3v9zm0 9h7v-7H3v7zm11 0h7v-9h-7v9zm0-16h7V3h-7v2z"/>
          </svg>
        );
      case "users":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        );
      case "users-alt":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a5 5 0 100-10 5 5 0 000 10z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 10-16 0"/>
          </svg>
        );
      case "chat":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4v8z"/>
          </svg>
        );
      case "question":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10a4 4 0 118 0c0 2-2 3-2 3M12 17h.01"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        );
      case "report":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m4 6V7m4 10V11"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3z"/>
          </svg>
        );
      case "money":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        );
      case "bell":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        );
      case "audit":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 8h6M9 16h6"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4z"/>
          </svg>
        );
      case "key":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="7" cy="17" r="3"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 17h11l-3-3 3-3h-7"/>
          </svg>
        );
      case "inbox":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16l-2 10H6L4 4z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 14l2 6h8l2-6"/>
          </svg>
        );
      case "cog":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317l.5-1.932a1 1 0 011.95 0l.5 1.932a1 1 0 00.671.71 8.003 8.003 0 014.243 2.454 1 1 0 00.709.33l1.932.5a1 1 0 010 1.95l-1.932.5a1 1 0 00-.71.671 8.003 8.003 0 01-2.454 4.243 1 1 0 00-.33.709l-.5 1.932a1 1 0 01-1.95 0l-.5-1.932a1 1 0 00-.671-.71 8.003 8.003 0 01-4.243-2.454 1 1 0 00-.709-.33l-1.932-.5a1 1 0 010-1.95l1.932.5a1 1 0 00.71-.671 8.003 8.003 0 012.454-4.243 1 1 0 00.33-.709z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        );
      case "calendar":
        return (
          <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18M7 14h.01M11 14h.01M15 14h.01M19 14h.01"/>
          </svg>
        );
      default:
        return <span className={common}>•</span>;
    }
  };

  return (
    <aside
      className={
        mobile
          ? "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E5E9FA] flex flex-col py-8 px-4 shadow-lg"
          : "hidden sm:flex w-64 bg-white border-r border-[#E5E9FA] flex-col justify-between py-8 px-4"
      }
    >
      {mobile && (
        <button
          className="mb-6 self-end p-2 rounded hover:bg-[#F2F4FD] focus:outline-none"
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <svg className="w-6 h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <nav>
        <ul className="space-y-2">
          {links.map((link) => {
            const active = isActive(link.href);
            const isConfig = link.label === "Configurações";
            const isRelatorios = link.label === "Relatórios";
            const isGestaoConsultas = link.label === "Gestão de Consultas";
            const configActive = 
              isActive(`${basePath}/configuracoes`) ||
              isActive(`${basePath}/auditoria`) ||
              isActive(`${basePath}/permissoes`) ||
              isActive(`${basePath}/configuracoes/gestao-documentos`) ||
              isActive(`${basePath}/configuracoes/log-view`) ||
              isActive(`${basePath}/configuracoes/backups`) ||
              isActive(`${basePath}/configuracoes/gerar-token-manual`);
            const relatoriosActive = 
              isActive(`${basePath}/relatorios`);
            const gestaoConsultasActive =
              isActive(`${basePath}/gestao-consultas`);
            
            // Renderiza submenu para Gestão de Consultas
            if (isGestaoConsultas) {
              return (
                <li key={link.href} ref={gestaoConsultasRef}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      gestaoConsultasActive ? "bg-[#F2F4FD] text-[#2D3A8C]" : "hover:bg-[#F2F4FD] text-[#343A40]"
                    }`}
                    onClick={() => setGestaoConsultasOpen((prev) => !prev)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon name={link.icon} active={gestaoConsultasActive} />
                      <span className="font-medium">{link.label}</span>
                    </span>
                    <span className={`text-xs ${gestaoConsultasOpen ? "rotate-180" : ""}`}>⌃</span>
                  </button>
                  {gestaoConsultasOpen && (
                    <ul className="ml-8 mt-2 space-y-1">
                      <li>
                        <Link
                          href={`${basePath}/gestao-consultas/consultas`}
                          className={`block px-3 py-2 rounded-md text-sm ${
                            isActive(`${basePath}/gestao-consultas/consultas`)
                              ? "bg-[#E9ECFF] text-[#2D3A8C]"
                              : "text-[#6C757D] hover:bg-[#F2F4FD]"
                          }`}
                        >
                          Consultas
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/gestao-consultas/cancelamentos`}
                          className={`block px-3 py-2 rounded-md text-sm ${
                            isActive(`${basePath}/gestao-consultas/cancelamentos`)
                              ? "bg-[#E9ECFF] text-[#2D3A8C]"
                              : "text-[#6C757D] hover:bg-[#F2F4FD]"
                          }`}
                        >
                          Cancelamentos
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              );
            }
            
            // Renderiza submenu para Relatórios
            if (isRelatorios) {
              return (
                <li
                  key={link.href}
                  ref={relatoriosRef}
                  className={
                    (relatoriosActive ? " border-l-2 border-[#8494E9] bg-[#F2F4FD] rounded" : "")
                  }
                >
                  <button
                    type="button"
                    onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 font-medium hover:bg-[#F2F4FD] rounded ${
                      relatoriosActive ? "text-[#8494E9]" : "text-[#212529]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={link.icon} active={relatoriosActive} />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${relatoriosOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {relatoriosOpen && (
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>
                        <Link
                          href={`${basePath}/relatorios`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/relatorios`) && 
                            !currentPath.includes("/relatorios/usuarios") &&
                            !currentPath.includes("/relatorios/financeiro") &&
                            !currentPath.includes("/relatorios/operacional") &&
                            !currentPath.includes("/relatorios/analise")
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Todos</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/relatorios/usuarios`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/relatorios/usuarios`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Usuários</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/relatorios/financeiro`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/relatorios/financeiro`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Financeiro</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/relatorios/operacional`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/relatorios/operacional`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Operacional</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/relatorios/analise`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/relatorios/analise`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Análise</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              );
            }
            
            // Renderiza submenu para Configurações
            if (isConfig) {
              return (
                <li
                  key={link.href}
                  ref={configRef}
                  className={
                    (link.config
                      ? mobile
                        ? "pt-4 border-t border-[#E5E9FA]"
                        : "mt-8"
                      : "") +
                    (configActive ? " border-l-2 border-[#8494E9] bg-[#F2F4FD] rounded" : "")
                  }
                >
                  <button
                    type="button"
                    onClick={() => setConfigOpen(!configOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 font-medium hover:bg-[#F2F4FD] rounded ${
                      configActive ? "text-[#8494E9]" : "text-[#212529]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={link.icon} active={configActive} />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${configOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {configOpen && (
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>
                        <Link
                          href={`${basePath}/configuracoes`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes`) && 
                            !isActive(`${basePath}/configuracoes/seguranca`) &&
                            !isActive(`${basePath}/auditoria`) &&
                            !isActive(`${basePath}/permissoes`) &&
                            !isActive(`${basePath}/configuracoes/log-view`) &&
                            !isActive(`${basePath}/configuracoes/backups`) &&
                            !isActive(`${basePath}/configuracoes/gerar-token-manual`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Geral</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/gerar-token-manual`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/gerar-token-manual`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Tokens Manuais</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/auditoria`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/auditoria`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Auditoria</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/log-view`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/log-view`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Logs</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/permissoes`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/permissoes`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Permissões</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/seguranca/redefinicao-senha`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/seguranca/redefinicao-senha`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Redefinição de Senha</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/backups`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/backups`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Backups</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/gestao-documentos`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/gestao-documentos`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Gestão de Documentos</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/atribuir-consultas-avulsas`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/atribuir-consultas-avulsas`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Atribuir Consultas Avulsas</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/configuracoes/planos`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/configuracoes/planos`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Planos</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${basePath}/banners`}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded hover:bg-[#F2F4FD] ${
                            isActive(`${basePath}/banners`)
                              ? "text-[#8494E9] bg-[#F2F4FD]"
                              : "text-[#6C757D]"
                          }`}
                          onClick={onClose}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>Gestão de Banners</span>
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              );
            }

            // Renderiza item normal
            return (
              <li
                key={link.href}
                className={
                  (link.config
                    ? mobile
                      ? "pt-4 border-t border-[#E5E9FA]"
                      : "mt-8"
                    : "") +
                  (active ? " border-l-2 border-[#8494E9] bg-[#F2F4FD] rounded" : "")
                }
              >
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 px-3 py-2 font-medium hover:bg-[#F2F4FD] rounded ${
                    active ? "text-[#8494E9]" : "text-[#212529]"
                  }`}
                  onClick={onClose}
                >
                  <Icon name={link.icon} active={active} />
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="mt-8 pt-4 border-t border-[#E5E9FA]">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center px-3 py-2 rounded font-medium text-[#E57373] hover:bg-[#F2F4FD] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2 text-[#E57373]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3"/>
              </svg>
              Sair
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};
