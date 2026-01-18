"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from 'next/image'; 
import Link from 'next/link';
import AlertaCvv from './AlertaCvv';
import RedesSociaisFooter from './RedesSociaisFooter';
import ReclameAquiSeal from './ReclameAquiSeal';
import { useUserBasic } from '@/hooks/user/userHook';

export default function Footer() {
  const router = useRouter();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { user } = useUserBasic();

  // Função para tratar links de âncora
  const handleFooterAnchorClick = (href: string) => {
    // Verifica se o usuário está logado e redireciona para área logada se necessário
    const isLoggedIn = user && typeof user === 'object' && user.success !== false;
    const isPatient = isLoggedIn && user.Role === "Patient";
    
    // Redireciona "Ver psicólogos" para área logada se for paciente
    if (href === '/ver-psicologos' && isPatient) {
      router.push('/painel/psicologos');
      return;
    }
    
    // Redireciona "Planos" (#planos) para área logada se for paciente
    if (href === '#planos' && isPatient) {
      router.push('/painel/planos');
      return;
    }
    
    if (href.startsWith("#")) {
      if (window.location.pathname !== "/") {
        router.push("/" + href);
      } else {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(href);
    }
  };
  
  // Helper para verificar se deve exibir o link "Ver psicólogos"
  const shouldShowVerPsicologos = () => {
    const isLoggedIn = user && typeof user === 'object' && user.success !== false;
    const isPsychologist = isLoggedIn && user.Role === "Psychologist";
    return !isPsychologist;
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Alerta CVV - sempre visível, inclusive no mobile, acima do rodapé principal */}
      <div className="w-full bg-[#4b51a2] px-4 py-2 flex items-center justify-center z-40">
        <AlertaCvv />
      </div>
      <motion.footer
        className="bg-[#E9ECFA] w-full border-t border-[#dbeafe] pt-8 pb-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
      <div className="w-full max-w-[1300px] mx-auto flex flex-col gap-8 px-4 py-4"> 
        {/* Topo: Logo à esquerda, frase e redes sociais à direita */}
        {/* Topo: Logo e redes sociais em 2 colunas no mobile, layout antigo no desktop */}
        <div className="w-full flex flex-col md:flex-row md:justify-between md:items-start gap-8">
          {/* Mobile: 2 colunas, Desktop: layout antigo */}
          <div className="flex flex-row w-full md:hidden">
            {/* Coluna esquerda: Logo */}
            <Link
              href="/"
              className="flex flex-col items-start w-1/2 justify-start"
              style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
            >
              <Image 
                src="/logo.png" 
                alt="Estação terapia" 
                width={110} 
                height={38} 
                className="w-[110px] h-[38px] object-contain" 
                style={{ width: 110, height: 38 }} 
                priority
                sizes="110px"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/logo.png') {
                    target.src = '/logo.png';
                  }
                }}
              />
            </Link>
            {/* Coluna direita: Frase e redes sociais */}
            <div className="flex flex-col items-start w-1/2 justify-start">
              <span className="text-[#22223B] font-medium mb-2 text-xs leading-4 text-left w-full">Nos siga nas redes sociais:</span>
        <div className="flex gap-3 justify-start w-full mb-3">
          <Link href="https://www.instagram.com/estacaoterapia" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Image 
              src="/assets/icons/instagram.webp" 
              alt="Instagram" 
              className="w-6 h-6" 
              width={24} 
              height={24}
              sizes="24px"
              quality={80}
              loading="lazy"
              onError={() => {
                console.warn('Erro ao carregar ícone do Instagram');
              }}
            />
          </Link>
          <Link href="https://www.facebook.com/profile.php?id=61582287230956" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <Image 
              src="/assets/icons/facebook.webp" 
              alt="Facebook" 
              className="w-6 h-6" 
              width={24} 
              height={24}
              sizes="24px"
              quality={80}
              loading="lazy"
              onError={() => {
                console.warn('Erro ao carregar ícone do Facebook');
              }}
            />
          </Link>
          <Link href="https://www.linkedin.com/in/estacaoterapia" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Image 
              src="/assets/icons/linkedin.webp" 
              alt="LinkedIn" 
              className="w-6 h-6" 
              width={24} 
              height={24}
              sizes="24px"
              quality={80}
              loading="lazy"
              onError={() => {
                console.warn('Erro ao carregar ícone do LinkedIn');
              }}
            />
          </Link>
          <Link href="http://tiktok.com/@estacaoterapia" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <Image 
              src="/assets/icons/tiktok.webp" 
              alt="TikTok" 
              className="w-6 h-6" 
              width={24} 
              height={24}
              sizes="24px"
              quality={80}
              loading="lazy"
              onError={() => {
                console.warn('Erro ao carregar ícone do TikTok');
              }}
            />
          </Link>
          {/* <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Image src="/assets/icons/youtube.webp" alt="YouTube" className="w-6 h-6" width={24} height={24} /></Link> */}
        </div>
        {/* Reclame Aqui Verified Seal */}
        <ReclameAquiSeal />
            </div>
          </div>
          {/* Desktop: layout antigo */}
          <motion.div
            className="hidden md:flex flex-row md:flex-col items-center md:items-start md:w-1/4 w-full md:justify-start justify-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          > 
            <Link
              href="/"
              role="link"
              aria-label="Página inicial Estação terapia"
              className="h-[65px] w-[180px] mb-0 md:mb-2 outline-none border-none bg-transparent p-0 m-0 cursor-pointer flex items-center"
              tabIndex={0}
              onClick={e => {
                e.preventDefault();
                router.push('/');
              }}
            >
              <Image
                src="/logo.png"
                alt="Estação terapia - Página inicial"
                width={180}
                height={65}
                className="h-[65px] w-[180px] object-contain"
                priority
              />
            </Link>
          </motion.div>
          {/* Menus em 2 colunas, mobile custom, desktop antigo */}
          <nav className="w-full md:w-2/4">
            {/* Mobile: 2 colunas específicas */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full md:hidden">
              <div className="flex flex-col items-start gap-1">
                <button type="button" onClick={() => handleFooterAnchorClick("#como-funciona")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Como funciona</button>
                <button type="button" onClick={() => handleFooterAnchorClick("#para-pacientes")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Para pacientes</button>
                <button type="button" onClick={() => handleFooterAnchorClick("/para-psicologos")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Para psicólogos</button>
                {shouldShowVerPsicologos() && (
                  <button type="button" onClick={() => handleFooterAnchorClick("/ver-psicologos")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Ver psicólogos</button>
                )}
                <button type="button" onClick={() => window.open('https://blog.estacaoterapia.com.br/', '_blank', 'noopener,noreferrer')} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Blog</button>
                <button type="button" onClick={() => handleFooterAnchorClick("/faq")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Perguntas frequentes</button>
              </div>
              <div className="flex flex-col items-start gap-1">
                <button type="button" onClick={() => handleFooterAnchorClick("/termo-de-uso")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Termo de uso</button>
                <button type="button" onClick={() => handleFooterAnchorClick("/politica-de-privacidade")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Política de privacidade</button>
                <button type="button" onClick={() => handleFooterAnchorClick("/politica-de-cookies")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Política de cookies</button>
                <button type="button" onClick={() => handleFooterAnchorClick("/fale-conosco")} className="text-[#6D75C0] font-medium text-[15px] leading-5 hover:underline">Fale conosco</button>
              </div>
            </div>
            {/* Desktop: layout antigo */}
            <div className="hidden md:flex w-full">
              <div className="flex flex-col items-start gap-2 w-1/2">
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("#como-funciona")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Como funciona</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("#para-pacientes")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Para pacientes</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/para-psicologos")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Para psicólogos</button>
                {shouldShowVerPsicologos() && (
                  <button
                    type="button"
                    onClick={() => handleFooterAnchorClick("/ver-psicologos")}
                    className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                  >Ver psicólogos</button>
                )}
                <button
                  type="button"
                  onClick={() => window.open('https://blog.estacaoterapia.com.br/', '_blank', 'noopener,noreferrer')}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Blog</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/faq")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Perguntas frequentes</button>
              </div>
              <div className="flex flex-col items-start gap-2 w-1/2">
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/termo-de-uso")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Termo de uso</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/politica-de-privacidade")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Política de privacidade</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/politica-de-cookies")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Política de cookies</button>
                <button
                  type="button"
                  onClick={() => handleFooterAnchorClick("/fale-conosco")}
                  className="hover:underline font-fira-sans font-medium text-[18px] leading-[28px] text-[#6D75C0] align-middle cursor-pointer"
                >Fale conosco</button>
              </div>
            </div>
          </nav>
          {/* Frase e redes sociais à direita (desktop) */}
          <RedesSociaisFooter />
        </div>
        {/* Pagamento e ambiente seguro */}
        <div className="w-full flex flex-col items-start justify-start mt-4 md:mt-6 border-t border-[#dbeafe] pt-6">
          <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Formas de pagamento */}
            <div className="flex flex-col items-start md:items-start md:w-auto">
              <span className="font-semibold text-[#22223B] mb-3 text-left text-base leading-tight" style={{ lineHeight: '1.5' }}>Formas de pagamento:</span>
              <div className="flex gap-3 md:gap-4 justify-start items-center flex-wrap">
                <Image src="/assets/icons/pix.svg" alt="Pix" className="h-7 w-auto" width={28} height={28} />
                <Image src="/assets/icons/boleto.svg" alt="Boleto" className="h-7 w-auto" width={28} height={28} />
                <Image src="/assets/icons/mastercard.svg" alt="Mastercard" className="h-7 w-auto" width={28} height={28} />
                <Image src="/assets/icons/visa.svg" alt="Visa" className="h-7 w-auto" width={28} height={28} />
                <Image src="/assets/icons/hipercard.svg" alt="Hipercard" className="h-7 w-auto" width={28} height={28} />
              </div>
            </div>
            {/* Ambiente seguro */}
            <div className="flex flex-col items-start md:items-start md:w-auto">
              <span className="font-semibold text-[#22223B] mb-3 text-left text-base leading-tight">Ambiente seguro:</span>
              <div className="flex justify-start items-center">
                <Image src="/assets/icons/ssl.svg" alt="SSL" className="h-14 w-14 md:h-16 md:w-16" width={64} height={64} />
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
      {/* Botão flutuante para voltar ao topo */}
      {showScrollTop && (
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          className="fixed right-4 bottom-6 z-50 bg-[#6D75C0] hover:bg-[#4b51a2] text-white rounded-full shadow-lg p-3 flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6D75C0]"
          style={{ boxShadow: '0 2px 8px rgba(109,117,192,0.15)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3 }}
        >
          {/* Ícone seta para cima SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6 11L12 5L18 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      )}
      {/* Botão flutuante WhatsApp */}
      <Link
        href="https://wa.me/5511960892131"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale conosco no WhatsApp"
        className="fixed right-4 bottom-24 z-50 bg-[#25D366] hover:bg-[#128C7E] rounded-full shadow-lg p-3 flex items-center justify-center transition-colors duration-200 cursor-pointer"
        style={{ boxShadow: '0 2px 8px rgba(37,211,102,0.25)' }}
      >
        {/* SVG oficial WhatsApp */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <g>
            <circle cx="16" cy="16" r="16" fill="#25D366"/>
            <path d="M16 7.5c-4.7 0-8.5 3.7-8.5 8.3 0 1.5.4 2.9 1.1 4.1L7 25l5.3-1.4c1.2.6 2.5.9 3.7.9 4.7 0 8.5-3.7 8.5-8.3S20.7 7.5 16 7.5zm0 14.7c-1.2 0-2.4-.3-3.5-.9l-.3-.2-3.1.8.8-3-.2-.3c-.7-1.1-1-2.3-1-3.6 0-3.7 3.2-6.7 7.1-6.7s7.1 3 7.1 6.7-3.2 6.7-7.1 6.7zm4-5.1c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.1-.5.7-.6.8-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-.9-.6-.5-1-1.2-1.1-1.3-.1-.1 0-.2.1-.3.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.2.1-.3 0-.5-.1-.1-.5-1.2-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.8 2.3 1.1 2.7.3.4 1.7 2.7 4.2 3.6.6.2 1.1.3 1.5.2.5-.1 1.1-.5 1.2-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" fill="#fff"/>
          </g>
        </svg>
      </Link>
      </motion.footer>
    </>
  );
}
