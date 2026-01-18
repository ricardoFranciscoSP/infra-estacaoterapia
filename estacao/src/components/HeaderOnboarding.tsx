"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { createOnboarding } from '@/store/api/userStore';
import Image from 'next/image';
import { recuperarDadosPrimeiraCompra } from '@/utils/primeiraCompraStorage';

const HeaderOnboarding: React.FC = () => {
  // Estado para controlar o progresso da barra
  const [progress, setProgress] = useState(50); // Inicia com 50%
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/objetivos') {
        setProgress(75);
      }
    }
  }, []);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Função para atualizar o progresso ao clicar em "Pular"
  const handleSkip = async () => {
    setLoading(true);
    setProgress(100);
    try {
      console.log('Criando onboarding...');
      await createOnboarding([]);
      
      // Verifica se há dados da primeira consulta salvos
      const dadosPrimeiraCompra = await recuperarDadosPrimeiraCompra();
      if (dadosPrimeiraCompra?.planoId) {
        // Redireciona para a página de compra da primeira consulta
        router.push(`/painel/comprar-consulta/${dadosPrimeiraCompra.planoId}${dadosPrimeiraCompra.psicologoId ? `?psicologoId=${dadosPrimeiraCompra.psicologoId}` : ''}`);
      } else {
        // Fluxo normal: redireciona para o painel
        router.push('/painel');
      }
    } catch (error) {
      console.error('Erro ao criar onboarding:', error);
      router.push('/painel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.header
      className={`
        w-full
        bg-[#1A2A44] text-white
        z-50 border-b border-[#22335a]
        flex items-center
        px-5 pt-4 pb-4
        h-[56px] min-h-[56px] max-h-[56px]
       md:top-0 md:left-0
        md:p-4 md:h-auto md:relative
        md:w-full md:max-w-none
        md:px-0 md:pt-0 md:pb-0
        md:justify-between
      `}
      style={{
        maxWidth: '100%',
        width: '100%',
        opacity: 1,
      }}
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* MOBILE: Distribuição horizontal total */}
      <div className="w-full flex items-center justify-between md:hidden">
        {/* Logo à esquerda */}
        <button
          className="
            flex items-center
            p-0 m-0
            bg-none border-none
            w-[64px] h-[22px]
          "
          style={{ background: 'none', border: 'none' }}
          onClick={() => router.push('/')}
        >
          <Image
            src="/assets/logo.png"
            alt="Logo Estação Terapia"
            width={64}
            height={22}
            className="
              w-[64px] h-[22px] object-contain
            "
            style={{ opacity: 1, transform: 'rotate(0deg)' }}
            priority
          />
        </button>
        {/* Barra de progresso centralizada */}
        <div className="flex-1 flex justify-center items-center px-2">
          <div
            className="
              bg-[#E3E4F3] rounded-[8px]
              h-[6px] w-[155px] min-w-[155px] max-w-[155px]
              relative
            "
            style={{ opacity: 1, transform: 'rotate(0deg)' }}
          >
            <div
              className="h-full rounded-[8px] transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: '#8494E9'
              }}
            ></div>
          </div>
        </div>
        {/* Botão Pular à direita */}
        <button
          onClick={handleSkip}
          className="
            font-medium text-[14px] leading-[22px] align-middle
            text-[#FCFBF6] hover:bg-[#8494E9] hover:text-white
            transition-colors px-2 py-1 rounded-md ml-2
          "
          style={{ letterSpacing: 0 }}
          disabled={loading}
        >
          Pular
        </button>
      </div>
      {/* DESKTOP: Layout antigo */}
      <div className="hidden md:flex w-full items-center justify-between md:max-w-6xl md:mx-auto md:px-0">
        {/* Logotipo */}
        <button
          className="
            flex items-center
            p-0 m-0
            bg-none border-none
            w-[180px] h-[62px] md:mr-16
          "
          style={{ background: 'none', border: 'none' }}
          onClick={() => router.push('/')}
        >
          <Image
            src="/assets/logo.png"
            alt="Logo Estação Terapia"
            width={180}
            height={62}
            className="
              w-[180px] h-[62px] object-contain
            "
            style={{ opacity: 1, transform: 'rotate(0deg)' }}
            priority
          />
        </button>
        {/* Barra de Progresso */}
        <div className="flex-1 flex justify-center items-center md:ml-8">
          <div
            className="
              bg-[#E3E4F3] rounded-[8px]
              h-[6px] w-[792px] relative
            "
            style={{ opacity: 1, transform: 'rotate(0deg)' }}
          >
            <div
              className="h-full rounded-[8px] transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: '#8494E9'
              }}
            ></div>
          </div>
        </div>
        {/* Botão Pular */}
        <button
          onClick={handleSkip}
          className="
            font-medium text-[18px] leading-[28px] align-middle
            text-[#FCFBF6] hover:bg-[#8494E9] hover:text-white
            transition-colors px-6 py-2 rounded-md ml-16
          "
          style={{ letterSpacing: 0 }}
          disabled={loading}
        >
          Pular
        </button>
      </div>
    </motion.header>
  );
};

export default HeaderOnboarding;