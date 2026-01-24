"use client";
import React from 'react';
import AgendamentoRapido from './AgendamentoRapido';
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function PainelFooter() {
  const pathname = usePathname();
  const [isClient, setIsClient] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false); 

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isClient) return null;

  // Não mostrar footer na sala de vídeo (paciente ou psicólogo)
  if (pathname?.startsWith("/painel/room") || pathname?.startsWith("/painel-psicologo/room")) {
    return null;
  }

  return (
    <>
      {/* Botão flutuante para voltar ao topo - mobile e desktop */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          className="fixed right-4 z-[1000] bg-[#6D75C0] hover:bg-[#4b51a2] text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6D75C0] w-12 h-12 md:w-14 md:h-14 p-0 bottom-32 md:bottom-8"
          style={{ boxShadow: '0 2px 8px rgba(109,117,192,0.15)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6 11L12 5L18 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Botão flutuante e modal de agendamento rápido alinhado à esquerda - APENAS em páginas do /painel (NUNCA em /painel-psicologo) */}
      {pathname?.startsWith("/painel")
        && !pathname?.startsWith("/painel-psicologo")
        && !pathname?.startsWith("/painel/room")
        && !pathname?.startsWith("/painel/sessao")
        && !pathname?.startsWith("/painel/psicologos")
        && !pathname?.startsWith("/painel/psicologo")
        && !pathname?.startsWith("/painel/comprar-consulta")
        && !pathname?.startsWith("/painel/checkout-planos")
        && !pathname?.startsWith("/painel/minha-conta/meus-planos")
        && pathname !== "/painel/planos"
        && pathname !== "/painel/success"
        && pathname !== "/painel/error"
        && pathname !== "/painel/pix"
        && (
          <div className="fixed left-4 bottom-32 md:bottom-8 z-[1] flex items-start pointer-events-auto">
            <AgendamentoRapido />
          </div>
        )}

      {/* Footer fixo mobile - PACIENTE */}
      {!pathname?.startsWith("/painel-psicologo") && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#23264A] border-t border-[#23264A] flex md:hidden justify-between px-2 py-1 shadow-lg" style={{boxShadow:'0 0 8px rgba(35,38,74,0.10)'}}>
          {[
            { href: "/painel", icon: "/assets/icons/inicio.svg", label: "Início", match: (p: string) => p === "/painel" },
            { href: "/painel/consultas", icon: "/assets/icons/consultas.svg", label: "Consultas", match: (p: string) => p.startsWith("/painel/consultas") },
            { href: "/painel/minha-conta/meus-planos", icon: "/assets/icons/planos.svg", label: "Planos", match: (p: string) => p.startsWith("/painel/minha-conta/meus-planos") || p === "/painel/planos" },
            { href: "/painel/psicologos", icon: "/assets/icons/psicologos.svg", label: "Psicólogos", match: (p: string) => p.startsWith("/painel/psicologos") },
          ].map((item) => {
            const ativo = item.match(pathname || "");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center flex-1 py-1 transition-colors group rounded-xl mx-1 ${ativo ? "bg-[#6D75C0] text-white" : "text-[#B6B9D6] hover:text-white"}`}
                style={ativo ? { boxShadow: '0 2px 8px rgba(109,117,192,0.10)' } : {}}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                  className={`w-6 h-6 mb-1 ${ativo ? "" : "opacity-80"}`}
                  style={ativo ? { filter: 'brightness(0) invert(1)' } : { filter: 'brightness(0.7) invert(0.7)' }}
                />
                <span className={`text-xs font-medium ${ativo ? "text-white" : "group-hover:text-white"}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Footer fixo mobile - PSICÓLOGO (novo layout) */}
      {pathname?.startsWith("/painel-psicologo") && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#23264A] border-t border-[#23264A] flex md:hidden justify-between px-1 py-2 shadow-lg" style={{boxShadow:'0 0 8px rgba(35,38,74,0.10)', minHeight: 64}}>
          {[
            { href: "/painel-psicologo", icon: "/assets/icons/grid.svg", label: "Painel geral", match: (p: string) => p === "/painel-psicologo" },
            { href: "/painel-psicologo/agenda", icon: "/assets/icons/calendar.svg", label: "Agenda", match: (p: string) => p.startsWith("/painel-psicologo/agenda") },
            { href: "/painel-psicologo/financeiro", icon: "/assets/icons/financeiro.svg", label: "Financeiro", match: (p: string) => p.startsWith("/painel-psicologo/financeiro") },
          ].map((item) => {
            const ativo = item.match(pathname || "");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center flex-1 px-1 py-1 transition-colors group rounded-xl mx-0 ${ativo ? "bg-[#6D75C0] text-white w-[110px]" : "text-[#B6B9D6] hover:text-white"}`}
                style={ativo ? { boxShadow: '0 2px 8px rgba(109,117,192,0.10)', minHeight: 56, maxWidth: 120 } : { minHeight: 56 }}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                  className={`w-6 h-6 mb-1 ${ativo ? "" : "opacity-80"}`}
                  style={ativo ? { filter: 'brightness(0) invert(1)' } : { filter: 'brightness(0.7) invert(0.7)' }}
                />
                <span className={`text-xs font-medium ${ativo ? "text-white" : "group-hover:text-white"}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
      {/* Footer padrão (apenas desktop) */}
      {(pathname?.startsWith("/painel") || pathname?.startsWith("/painel-psicologo")) ? (
        // Footer apenas com copyright para áreas logadas
        <footer className="hidden md:block bg-[#E9ECFA] w-full pt-4 px-4 md:px-6 border-t border-[#dbeafe] pb-20 md:pb-4">
          <div className="max-w-7xl mx-auto w-full px-0 md:px-6">
            <div className="w-full pt-4">
              <p className="text-xs text-[#22223B] font-normal leading-relaxed text-center">
                © {new Date().getFullYear()} MINDFLUENCE PSICOLOGIA LTDA - CNPJ: 54.222.003/0001-07 | Endereço: Al. Rio Negro, 503 - Sala 2020, CEP: 06454-000 - Alphaville Industrial - Barueri, SP - Brasil - Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      ) : (
        // Footer completo para outras páginas
        <footer className="hidden md:block bg-[#E9ECFA] w-full pt-8 px-4 md:px-6 border-t border-[#dbeafe] pb-20 md:pb-4">
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 px-0 md:px-6">
          {/* Topo: Logo à esquerda, menus no meio, redes sociais à direita */}
          <div className="w-full flex flex-col md:flex-row md:justify-between md:items-start gap-8">
            {/* Mobile: 2 colunas */}
            <div className="flex flex-row w-full md:hidden">
              {/* Coluna esquerda: Logo */}
              <div className="flex flex-col items-start w-1/2 justify-start">
                <Image src="/logo.png" alt="Estação terapia" width={110} height={38} className="w-[110px] h-[38px] object-contain" style={{ width: 110, height: 38 }} priority />
              </div>
              {/* Coluna direita: Frase e redes sociais */}
              <div className="flex flex-col items-start w-1/2 justify-start">
                <span className="text-[#22223B] font-medium mb-2 text-xs leading-4 text-left w-full">Nos siga nas redes sociais:</span>
                <div className="flex gap-3 justify-start w-full mb-3">
                <a href="#" aria-label="Instagram" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/instagram.png" alt="Instagram" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="Facebook" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/facebook.png" alt="Facebook" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="LinkedIn" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/linkedin.png" alt="LinkedIn" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="TikTok" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/tiktok.png" alt="TikTok" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="YouTube" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/youtube.png" alt="YouTube" width={24} height={24} className="w-6 h-6" /></a>
                </div>
                {/* Logo Reclame Aqui */}
                <div className="flex justify-start w-full mt-1">
                  <a href="https://www.reclameaqui.com.br" target="_blank" rel="noopener noreferrer" aria-label="Reclame Aqui" className="transition-opacity hover:opacity-80 w-full max-w-[160px]">
                    <Image src="/assets/logo-reclame-aqui.png" alt="Reclame Aqui" width={160} height={52} className="w-full h-auto" />
                  </a>
                </div>
              </div>
            </div>
            {/* Desktop: Logo à esquerda */}
            <div className="hidden md:flex flex-col items-start md:w-1/4 w-full md:justify-start justify-center">
              <Image src="/logo.png" alt="Estação terapia" width={180} height={65} className="h-[65px] w-[180px] object-contain mb-0 md:mb-2" priority />
            </div>
            {/* Menus em 2 colunas - Desktop */}
            <nav className="w-full md:w-2/4">
              {/* Mobile: 2 colunas específicas */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full md:hidden">
                <div className="flex flex-col items-start gap-1">
                  <a href="#como-funciona" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Como funciona</a>
                  <a href="#para-pacientes" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Para pacientes</a>
                  <a href="#psicologos" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Para psicólogos</a>
                  <a href="/ver-psicologos" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Ver psicólogos</a>
                  <a href="/faq" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Perguntas frequentes</a>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <a href="/termo-de-uso" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Termo de uso</a>
                  <a href="/politica-de-privacidade" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Política de privacidade</a>
                  <a href="/politica-de-cookies" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Política de cookies</a>
                  <a href="/fale-conosco" className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Fale conosco</a>
                </div>
              </div>
              {/* Desktop: layout simétrico em 2 colunas */}
              <div className="hidden md:flex w-full">
                <div className="flex flex-col items-start gap-2 w-1/2">
                  <a href="#como-funciona" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Como funciona</a>
                  <a href="#para-pacientes" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Para pacientes</a>
                  <a href="/para-psicologos" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Para psicólogos</a>
                  <a href="/ver-psicologos" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Ver psicólogos</a>
                  <a href="/faq" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Perguntas frequentes</a>
                </div>
                <div className="flex flex-col items-start gap-2 w-1/2">
                  <a href="/termo-de-uso" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Termo de uso</a>
                  <a href="/politica-de-privacidade" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Política de privacidade</a>
                  <a href="/politica-de-cookies" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Política de cookies</a>
                  <a href="/fale-conosco" className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer">Fale conosco</a>
                </div>
              </div>
            </nav>
            {/* Frase e redes sociais à direita (desktop) */}
            <div className="hidden md:flex flex-col items-center md:items-end md:w-1/4 w-full mt-4 md:mt-0">
              <span className="text-[#22223B] font-medium mb-3 text-center md:text-right w-full">Nos siga nas redes sociais:</span>
              <div className="flex gap-3 justify-center md:justify-end w-full items-center mb-3">
                <a href="#" aria-label="Instagram" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/instagram.png" alt="Instagram" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="Facebook" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/facebook.png" alt="Facebook" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="LinkedIn" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/linkedin.png" alt="LinkedIn" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="TikTok" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/tiktok.png" alt="TikTok" width={24} height={24} className="w-6 h-6" /></a>
                <a href="#" aria-label="YouTube" className="transition-transform duration-150 hover:scale-110 hover:brightness-110"><Image src="/assets/icons/youtube.png" alt="YouTube" width={24} height={24} className="w-6 h-6" /></a>
              </div>
              {/* Logo Reclame Aqui abaixo das redes sociais, alinhado à direita */}
              <div className="flex justify-end w-full">
                <a href="https://www.reclameaqui.com.br" target="_blank" rel="noopener noreferrer" aria-label="Reclame Aqui" className="transition-opacity hover:opacity-80">
                  <Image src="/assets/logo-reclame-aqui.png" alt="Reclame Aqui" width={160} height={52} className="h-auto w-auto max-w-[160px]" />
                </a>
              </div>
            </div>
          </div>
          {/* Pagamento e ambiente seguro */}
          <div className="w-full flex flex-col items-start justify-start mt-6 md:mt-8 border-t border-[#dbeafe] pt-6">
            <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              {/* Formas de pagamento */}
              <div className="flex flex-col items-start md:items-start">
                <span className="font-semibold text-[#22223B] mb-3 text-left text-base leading-tight">Formas de pagamento:</span>
                <div className="flex gap-3 md:gap-4 justify-start items-center flex-wrap">
                  <Image src="/assets/icons/pix.svg" alt="Pix" width={28} height={28} className="h-7 w-auto" />
                  <Image src="/assets/icons/boleto.svg" alt="Boleto" width={28} height={28} className="h-7 w-auto" />
                  <Image src="/assets/icons/mastercard.svg" alt="Mastercard" width={28} height={28} className="h-7 w-auto" />
                  <Image src="/assets/icons/visa.svg" alt="Visa" width={28} height={28} className="h-7 w-auto" />
                  <Image src="/assets/icons/hipercard.svg" alt="Hipercard" width={28} height={28} className="h-7 w-auto" />
                </div>
              </div>
              {/* Ambiente seguro */}
              <div className="flex flex-col items-start md:items-start">
                <span className="font-semibold text-[#22223B] mb-3 text-left text-base leading-tight">Ambiente seguro:</span>
                <div className="flex justify-start items-center">
                  <Image src="/assets/icons/ssl.svg" alt="SSL" width={64} height={64} className="h-14 w-14 md:h-16 md:w-16" />
                </div>
              </div>
            </div>
            <div className="w-full mt-6">
              <p className="text-xs text-[#22223B] font-normal leading-relaxed">
                © {new Date().getFullYear()} MINDFLUENCE PSICOLOGIA LTDA - CNPJ: 54.222.003/0001-07 | Endereço: Al. Rio Negro, 503 - Sala 2020, CEP: 06454-000 - Alphaville Industrial - Barueri, SP - Brasil - Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
       </footer>
      )}
    </>
  );
}