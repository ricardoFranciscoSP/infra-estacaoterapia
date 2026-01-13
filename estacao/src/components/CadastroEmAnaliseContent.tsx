"use client";

import { FaDownload } from 'react-icons/fa';
import RedesSociaisCadastro from './RedesSociaisCadastro';
import Link from 'next/link';
import Image from 'next/image';

interface CadastroEmAnaliseContentProps {
  user?: {
    Nome?: string;
    Email?: string;
  } | null;
}

export default function CadastroEmAnaliseContent({ user }: CadastroEmAnaliseContentProps) {
  return (
    <div className="min-h-screen bg-[#f9f8f3] flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 text-[#333]">
      {/* Logo centralizado */}
      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/assets/logo/logo-estacao.svg"
            alt="Logo Estação Terapia"
            width={160}
            height={48}
            className="h-10 sm:h-12 mb-2 hover:opacity-80 transition-opacity duration-300 cursor-pointer"
            priority
          />
        </Link>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full max-w-[1176px] flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-[40px]">
        {/* Ilustração */}
        <div className="w-full max-w-[300px] sm:max-w-[400px] lg:w-[486px] lg:max-w-none h-auto flex justify-center flex-shrink-0">
          <Image
            src="/assets/analise.svg"
            alt="Ilustração análise"
            width={486}
            height={486}
            className="w-full h-auto max-w-[300px] sm:max-w-[400px] lg:w-[486px] lg:h-[486px]"
            priority
          />
        </div>

        {/* Texto e redes sociais */}
        <div className="w-full max-w-full lg:w-[690px] lg:h-auto text-center lg:text-left flex flex-col">
          <h1 className="fira-sans font-semibold text-[24px] sm:text-[32px] lg:text-[40px] leading-[32px] sm:leading-[40px] lg:leading-[64px] text-[#212529] mb-4 sm:mb-6">
            {user?.Nome ? `Olá, ${user?.Nome}!` : 'Olá!'} Seu cadastro está em análise
          </h1>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            <p className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A]">
              Recebemos suas informações e agora elas estão passando por uma avaliação com nossa equipe.
            </p>
            <p className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A]">
              Essa etapa é muito importante para garantir que todos os profissionais na Estação terapia estejam alinhados aos critérios da plataforma.
            </p>
            <p className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A]">
              Não se preocupe, que em até 5 dias úteis entraremos em contato no seu e-mail {user?.Email && (
                <span className="font-medium text-[#444D9D] break-all">({user.Email})</span>
              )} com o retorno da sua aprovação e os próximos passos.
            </p>
          </div>

          <p className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A] mb-4 sm:mb-6">
            Agradecemos seu interesse em fazer parte da plataforma 💜
          </p>

          {/* Download do guia */}
          <p className="fira-sans font-normal text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A] mb-4 sm:mb-6 text-center lg:text-left">
            Enquanto isso você pode aproveitar para conhecer melhor nossa plataforma no documento abaixo que preparamos especialmente pra você!
          </p>
          <div className="flex items-center justify-center lg:justify-start mb-6 sm:mb-8">
            <a 
              href="/assets/guia_do_ psicologo _onboarding.pdf"
              download="guia_do_psicologo_onboarding.pdf"
              className="flex items-center gap-2 fira-sans font-medium text-[14px] sm:text-[16px] leading-[20px] sm:leading-[24px] text-[#49525A] hover:text-[#444D9D] transition-colors cursor-pointer"
            >
              <FaDownload className="text-[#49525A] text-[16px] sm:text-[18px]" />
              <span>Baixe nosso guia completo</span>
            </a>
          </div>

          {/* Redes sociais */}
          <div className="w-full">
            <RedesSociaisCadastro />
          </div>
        </div>
      </div>
    </div>
  );
}
