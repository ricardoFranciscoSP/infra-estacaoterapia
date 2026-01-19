"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useQuery } from "@tanstack/react-query";
import { planoService } from "@/services/planoService";
import type { PlanoAssinatura } from "@/services/planoService";
import { salvarDadosPrimeiraCompra } from "@/utils/primeiraCompraStorage";

// Força renderização dinâmica (não pode ser pré-renderizada estaticamente)
export const dynamic = 'force-dynamic';

/**
 * Página de redirecionamento para compra da primeira consulta
 * 
 * Esta rota garante que todos os pontos de entrada (Ads, Home, Marketplace)
 * convergem para o fluxo de compra da primeira sessão experimental.
 * 
 * Fluxo:
 * 1. Se não logado → redireciona para /register?planoId=...&redirect=/comprar-consulta
 * 2. Se logado → redireciona para /painel/comprar-consulta/[id]
 */
function ComprarConsultaRedirectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUserStore((state) => state.user);
  
  // Busca o planoId da query string ou tenta buscar o plano da primeira consulta
  const planoIdFromQuery = searchParams?.get("planoId");
  const productIdFromQuery = searchParams?.get("productId");
  const psicologoId = searchParams?.get("psicologoId"); // Para fluxo do marketplace
  
  // Busca o plano da primeira consulta se não tiver planoId na query
  const { data: planosData } = useQuery({
    queryKey: ['planos-comprar-consulta'],
    queryFn: async () => {
      const response = await planoService().getPlanos();
      const planos = Array.isArray(response.data) 
        ? response.data 
        : ((response.data as { plano?: unknown[] })?.plano || []);
      return planos as PlanoAssinatura[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !planoIdFromQuery, // Só busca se não tiver planoId na query
  });

  const normalize = (value?: string) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const planoPorProductId = planosData?.find((plano) => {
    if (!productIdFromQuery) return false;
    const tipo = normalize(plano.Tipo);
    return String(plano.ProductId || "") === String(productIdFromQuery) && tipo === "unica";
  });

  // Encontra o plano da primeira consulta
  const primeiraConsultaPlano = planosData?.find((plano) => {
    const tipo = normalize(plano.Tipo);
    return tipo === "primeiraconsulta" || tipo === "unica";
  });

  // Determina o planoId final
  const planoIdFinal = planoIdFromQuery || planoPorProductId?.Id || primeiraConsultaPlano?.Id;

  useEffect(() => {
    if (!planoIdFinal && !planosData) {
      // Ainda carregando planos
      return;
    }

    if (!planoIdFinal) {
      // Não encontrou plano da primeira consulta
      console.error("[ComprarConsultaRedirect] Plano da primeira consulta não encontrado");
      router.push("/");
      return;
    }

    // Coleta parâmetros UTM para persistência
    const utmParams: Record<string, string> = {};
    const utmParamNames = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    utmParamNames.forEach((param) => {
      const value = searchParams?.get(param);
      if (value) utmParams[param] = value;
    });

    // Determina contexto e origem
    const contexto = psicologoId ? 'marketplace' : 'primeira_sessao';
    const origem = psicologoId ? 'marketplace' : 'home';

    // Salva dados temporários da primeira compra
    salvarDadosPrimeiraCompra({
      planoId: planoIdFinal,
      psicologoId: psicologoId || undefined,
      contexto: contexto as 'primeira_sessao' | 'marketplace',
      origem: origem,
      utmParams: Object.keys(utmParams).length > 0 ? utmParams : undefined,
    });

    // Se não estiver logado, redireciona para registro com planoId e contexto
    if (!user) {
      const params = new URLSearchParams();
      params.set("tab", "paciente");
      params.set("planoId", planoIdFinal);
      params.set("redirect", "/comprar-consulta");
      params.set("contexto", "primeira_sessao");
      
      // Se veio do marketplace, preserva o psicologoId
      if (psicologoId) {
        params.set("psicologoId", psicologoId);
      }
      
      // Preserva parâmetros de origem (UTM, ads, etc)
      utmParamNames.forEach((param) => {
        const value = searchParams?.get(param);
        if (value) params.set(param, value);
      });
      
      router.push(`/register?${params.toString()}`);
      return;
    }

    // Se estiver logado, redireciona direto para o checkout
    router.push(`/painel/comprar-consulta/${planoIdFinal}${psicologoId ? `?psicologoId=${psicologoId}` : ""}`);
  }, [user, planoIdFinal, planosData, router, searchParams, psicologoId]);

  // Mostra loading enquanto redireciona
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#FCFBF6]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto mb-4"></div>
        <p className="text-[#49525A] text-lg">Redirecionando para o checkout...</p>
      </div>
    </div>
  );
}

export default function ComprarConsultaRedirectPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center bg-[#FCFBF6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto mb-4"></div>
          <p className="text-[#49525A] text-lg">Carregando...</p>
        </div>
      </div>
    }>
      <ComprarConsultaRedirectPageInner />
    </Suspense>
  );
}

