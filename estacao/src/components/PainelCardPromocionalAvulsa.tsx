'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlanosPacienteQuery } from '@/store/planosPacienteStore';
import { Plano } from '@/store/planoStore';

export default function PainelCardPromocionalAvulsa() {
  const router = useRouter();
  const { data: planos = [], isLoading } = usePlanosPacienteQuery();

  // Função para normalizar string (remove acentos e converte para lowercase)
  const normalize = React.useCallback((value?: string): string => {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }, []);

  // Busca o plano avulso igual ao painel de planos
  const planoConsultaAvulsa = React.useMemo<Plano | undefined>(() => {
    if (!planos || planos.length === 0) return undefined;
    return planos.find((p: Plano) => {
      if (!p) return false;
      const tipo = normalize(p.Tipo || p.Type || "");
      const nome = normalize(p.Nome || "");
      const tipoOriginal = (p.Tipo || p.Type || "").trim();
      // Critério 1: Tipo exato (case insensitive)
      if (tipo === "avulsa" || tipo === "unico") return true;
      // Critério 2: Tipo original (case sensitive) - Avulsa
      if (tipoOriginal === "Avulsa") return true;
      // Critério 3: Nome contém "avulsa"
      if (nome.includes("avulsa")) return true;
      return false;
    });
  }, [planos, normalize]);

  const handleComprar = () => {
    const planoId = planoConsultaAvulsa?.Id;
    if (planoId) {
      router.push(`/painel/comprar-consulta/${planoId}`);
    } else {
      router.push('/painel/planos');
    }
  };

  const precoFormatado = planoConsultaAvulsa?.Preco
    ? `R$ ${planoConsultaAvulsa.Preco.toFixed(2).replace('.', ',')}`
    : isLoading
      ? '...'
      : 'R$ 0,00';
  const planoUnicoId = planoConsultaAvulsa?.Id;

  return (
    <motion.aside
      className="bg-[#E5E9FA] w-full rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border border-[#E6E9FF] opacity-100"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex items-start sm:items-center gap-3 flex-1">
        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#444D9D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 sm:w-6 sm:h-6"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </div>
        <p className="text-[#232A5C] text-sm md:text-base font-fira-sans leading-relaxed">
          Precisa de uma consulta avulsa? Adquira agora por{' '}
          <span className="font-bold text-[#444D9D] text-base md:text-lg">
            {precoFormatado}
          </span>
          {' '}e tenha acesso a uma consulta de 60 minutos com o profissional da sua escolha.
        </p>
      </div>
      
      <button
        type="button"
        className="px-4 py-2 bg-[#444D9D] text-white font-semibold text-sm md:text-base rounded-lg hover:bg-[#6D75C0] transition-colors duration-200 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        onClick={handleComprar}
        disabled={isLoading && !planoUnicoId}
      >
        Comprar
      </button>
    </motion.aside>
  );
}
