"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { planoService } from '@/services/planoService';
import type { PlanoAssinatura } from '@/services/planoService';
import { usePlanoById } from '@/hooks/planosHook';
import type { Planos } from '@/types/planosVendaTypes';

const CallToAction: React.FC = () => {
  const router = useRouter();
  const normalize = React.useCallback((value?: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
    []
  );

  const { data: planosData } = useQuery({
    queryKey: ['planos-cta'],
    queryFn: async () => {
      const response = await planoService().getPlanos();
      const planos = Array.isArray(response.data) ? response.data : ((response.data as { plano?: unknown[] })?.plano || []);
      return planos as PlanoAssinatura[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fallback: buscar plano do tipo "Unica" caso não encontre "primeiraconsulta"
  const { planos: planoAvulso } = usePlanoById('Unica');
  const planoTyped = React.useMemo(() => planoAvulso as Planos | undefined, [planoAvulso]);

  const primeiraConsultaPlano = React.useMemo(() => {
    if (!planosData) return undefined;
    
    // Busca por tipo "primeiraconsulta"
    let plano = planosData.find((plano) => {
      const tipo = normalize(plano.Tipo);
      return tipo === "primeiraconsulta";
    });
    
    // Se não encontrar, busca por "unica" ou "unico"
    if (!plano) {
      plano = planosData.find((plano) => {
        const tipo = normalize(plano.Tipo);
        return tipo === "unica" || tipo === "unico";
      });
    }
    
    // Debug em desenvolvimento
    if (process.env.NODE_ENV === 'development' && !plano) {
      console.log('[CallToAction] Planos disponíveis:', planosData.map(p => ({ 
        Id: p.Id, 
        Nome: p.Nome, 
        Tipo: p.Tipo, 
        Preco: p.Preco 
      })));
    }
    
    return plano;
  }, [planosData, normalize]);

  // Mesma lógica de fallback do Planos.tsx
  const precoPrimeiraConsulta = React.useMemo(() => {
    // Debug: log para verificar valores (remover em produção se necessário)
    if (process.env.NODE_ENV === 'development') {
      console.log('[CallToAction] Debug preço:', {
        primeiraConsultaPlano: primeiraConsultaPlano?.Preco,
        planoTyped: planoTyped?.Preco,
        primeiraConsultaPlanoId: primeiraConsultaPlano?.Id,
        planoTypedId: planoTyped?.Id,
      });
    }
    
    // Prioridade 1: Preço do plano encontrado na lista
    if (primeiraConsultaPlano?.Preco != null && primeiraConsultaPlano.Preco > 0) {
      return primeiraConsultaPlano.Preco;
    }
    
    // Prioridade 2: Preço do plano "Unica" via hook
    if (planoTyped?.Preco != null && planoTyped.Preco > 0) {
      return planoTyped.Preco;
    }
    
    // Fallback: retorna 0 se não encontrar
    return 0;
  }, [primeiraConsultaPlano, planoTyped]);

  const planoPrimeiraConsultaId = React.useMemo(() => {
    return primeiraConsultaPlano?.Id ?? planoTyped?.Id ?? '';
  }, [primeiraConsultaPlano, planoTyped]);

  const planoPrimeiraConsultaProductId = React.useMemo(() => {
    return primeiraConsultaPlano?.ProductId ?? planoTyped?.ProductId ?? '';
  }, [primeiraConsultaPlano, planoTyped]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="w-full flex items-center justify-center"
    >
      <div
        className="
          flex flex-col md:flex-row justify-between items-center
          w-full max-w-[1200px] h-auto md:h-[464px]
          pt-6 md:pt-[40px] pr-6 md:pr-[10px] pb-6 md:pb-[40px] pl-6 md:pl-[10px]
          gap-6 md:gap-[16px]
          rounded-[16px]
          bg-[#444D9D]
          text-white
          px-4 sm:px-8 my-0 mb-20
        "
      >
      {/* Parte da Imagem */}
      <div className="w-full md:w-1/2 flex justify-center mb-6 md:mb-0">
        <Image
          src="/assets/images/man.svg"
          alt="Ilustração de pessoa sentada em uma cadeira"
          width={220}
          height={220}
          className="w-[220px] h-[220px] md:w-[384px] md:h-[384px] object-contain"
        />
      </div>

      {/* Parte do Texto */}
      <div className="w-full md:w-1/2 flex flex-col md:items-start">
        <h2 className="font-semibold text-[28px] md:text-[40px] leading-[40px] md:leading-[64px] tracking-[0] mb-4 text-white text-center md:text-left">
          Você merece esse cuidado!
        </h2>
        <p className="font-normal text-[18px] md:text-[24px] leading-[32px] md:leading-[40px] tracking-[0] mb-6 text-center md:text-left">
          Dê o primeiro passo para o seu autoconhecimento e bem-estar emocional por apenas{' '}
          <span className="font-semibold text-[24px] md:text-[32px] leading-[32px] md:leading-[40px] tracking-[0]">
            R$ {precoPrimeiraConsulta.toFixed(2).replace('.', ',')}
          </span>
        </p>
        <button
          className="
            bg-[#F2F4FD]
            text-indigo-800
            font-bold
            w-full md:w-[358px]
            h-[48px]
            px-[24px]
            rounded-[8px]
            flex items-center justify-center
            gap-[15px]
            hover:bg-indigo-700 hover:text-white
            transition duration-300
            whitespace-nowrap overflow-hidden text-ellipsis
            cursor-pointer
          "
          onClick={() => {
            const params = new URLSearchParams();
            params.set("tab", "paciente");
            params.set("contexto", "primeira_sessao");
            params.set("redirect", "/comprar-consulta");
            if (planoPrimeiraConsultaId) params.set("planoId", planoPrimeiraConsultaId);
            if (planoPrimeiraConsultaProductId) params.set("productId", planoPrimeiraConsultaProductId);
            router.push(`/register?${params.toString()}`);
          }}
        >
          Fazer minha sessão experimental agora!
        </button>
      </div>
      </div>
    </motion.div>
  );
};

export default CallToAction;