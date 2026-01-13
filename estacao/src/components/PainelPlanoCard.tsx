"use client";
import React from "react";
import { motion } from "framer-motion";
import { useGetUserPlano, useUserMe } from "@/hooks/user/userHook";
import { useFaturaById } from "@/hooks/controleFaturaHook";
import { useRouter } from "next/navigation";
import { useCreditoAvulso } from "@/hooks/useHook";
import { CreditoAvulso } from "@/services/userAvulsoService";
import type { AssinaturaPlanoType, CicloPlanoType } from "@/types/planoTypes";
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, ensureSocketConnection } from "@/lib/socket";

export default function PainelPlanoCard() { 
  const { user } = useUserMe();
  const { plano, isLoading, refetch: refetchPlano } = useGetUserPlano();
  const { creditoAvulso, refetch: refetchCreditoAvulso } = useCreditoAvulso();
  const router = useRouter();
  const queryClient = useQueryClient();

 
  // Listener de WebSocket para atualizar plano em tempo real
  React.useEffect(() => {
    if (!user?.Id) return;

    const socket = getSocket();
    if (!socket) return;

    ensureSocketConnection();

    // Listener para atualizações de consulta (quando uma reserva é criada/cancelada)
    const handleConsultaAtualizada = () => {
      console.log('[PainelPlanoCard] Evento de consulta atualizada recebido, refazendo busca do plano...');
      queryClient.invalidateQueries({ queryKey: ['userPlano'] });
      refetchPlano();
      refetchCreditoAvulso();
    };

    // Listener para atualizações de plano/ciclo
    const handlePlanoAtualizado = () => {
      console.log('[PainelPlanoCard] Evento de plano atualizado recebido, refazendo busca do plano...');
      queryClient.invalidateQueries({ queryKey: ['userPlano'] });
      refetchPlano();
    };

    // Listener para notificações gerais que podem afetar o plano
    const handleNovaNotificacao = (data: { message?: string; type?: string }) => {
      // Se a notificação for relacionada a plano, consulta ou ciclo, atualiza
      const message = data.message?.toLowerCase() || '';
      const type = data.type?.toLowerCase() || '';
      
      if (
        message.includes('plano') || 
        message.includes('consulta') || 
        message.includes('ciclo') ||
        message.includes('reserva') ||
        type === 'plano' ||
        type === 'consulta' ||
        type === 'cancelamento'
      ) {
        console.log('[PainelPlanoCard] Notificação relacionada a plano/consulta detectada, atualizando...');
        queryClient.invalidateQueries({ queryKey: ['userPlano'] });
        refetchPlano();
        refetchCreditoAvulso();
      }
    };

    // Entra na sala do usuário para receber eventos
    socket.emit("join-room", `user_${user.Id}`);

    // Registra listeners
    socket.on("consulta:atualizada", handleConsultaAtualizada);
    socket.on("plano:atualizado", handlePlanoAtualizado);
    socket.on("ciclo:atualizado", handlePlanoAtualizado);
    socket.on("consulta_reservada", handleConsultaAtualizada);
    socket.on("nova_notificacao", handleNovaNotificacao);
    socket.on("proximaConsultaAtualizada", handleConsultaAtualizada);

    // Cleanup
    return () => {
      socket.off("consulta:atualizada", handleConsultaAtualizada);
      socket.off("plano:atualizado", handlePlanoAtualizado);
      socket.off("ciclo:atualizado", handlePlanoAtualizado);
      socket.off("consulta_reservada", handleConsultaAtualizada);
      socket.off("nova_notificacao", handleNovaNotificacao);
      socket.off("proximaConsultaAtualizada", handleConsultaAtualizada);
      socket.emit("leave-room", `user_${user.Id}`);
    };
  }, [user?.Id, queryClient, refetchPlano, refetchCreditoAvulso]);


  // Função auxiliar para verificar se um ciclo tem consultas válidas
  const cicloTemConsultasValidas = React.useCallback((ciclo: CicloPlanoType): boolean => {
    // Valida Status do CicloPlano
    if (ciclo.Status !== "Ativo") {
      return false;
    }
    
    // Verifica se tem consultas disponíveis
    if ((ciclo.ConsultasDisponiveis || 0) <= 0) {
      return false;
    }
    
    // Verifica validade de 30 dias a partir de CreatedAt
    if (!ciclo.CreatedAt) {
      return false;
    }
    
    const agora = new Date();
    const dataCriacao = new Date(ciclo.CreatedAt);
    const dataValidade = new Date(dataCriacao);
    dataValidade.setDate(dataValidade.getDate() + 30);
    
    // Ciclo é válido se ainda não passou dos 30 dias
    return dataValidade >= agora;
  }, []);

  // Busca planos priorizando: Ativo com consultas válidas OU Cancelado com consultas válidas
  const planoParaExibir = React.useMemo(() => {
    if (!Array.isArray(plano) || plano.length === 0) return null;
    
    // PRIORIDADE 1: Plano com Status "Ativo" que tenha ciclo com Status "Ativo" e consultas válidas
    const planoAtivoComConsultas = plano.find((p: AssinaturaPlanoType) => {
      // Valida Status da AssinaturaPlano
      if (p.Status !== 'Ativo' && p.Status !== 'AguardandoPagamento') {
        return false;
      }
      
      // Valida se tem ciclos com Status "Ativo" e consultas válidas
      if (!p.Ciclos || !Array.isArray(p.Ciclos)) {
        return false;
      }
      
      return p.Ciclos.some((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
    });
    
    if (planoAtivoComConsultas) {
      return planoAtivoComConsultas;
    }
    
    // PRIORIDADE 2: Plano com Status "Cancelado" que tenha ciclo com Status "Ativo" e consultas válidas
    const planosCancelados = plano
      .filter((p: AssinaturaPlanoType) => p.Status === 'Cancelado')
      .sort((a, b) => {
        const dataA = new Date(a.DataInicio || 0).getTime();
        const dataB = new Date(b.DataInicio || 0).getTime();
        return dataB - dataA; // Mais recente primeiro
      });
    
    for (const p of planosCancelados) {
      if (p.Ciclos && Array.isArray(p.Ciclos)) {
        const temCicloComConsultas = p.Ciclos.some((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
        if (temCicloComConsultas) {
          return p;
        }
      }
    }
    
    // PRIORIDADE 3: Se não encontrou com consultas válidas, retorna plano ativo mesmo sem consultas
    const planoAtivoSemConsultas = plano.find((p: AssinaturaPlanoType) => {
      return p.Status === 'Ativo' || p.Status === 'AguardandoPagamento';
    });
    
    if (planoAtivoSemConsultas) {
      return planoAtivoSemConsultas;
    }
    
    return null;
  }, [plano, cicloTemConsultasValidas]);

  // Busca TODOS os ciclos ativos do plano com consultas válidas (valida Status do CicloPlano)
  const ciclosAtivosValidos = React.useMemo(() => {
    if (!planoParaExibir || !planoParaExibir.Ciclos || !Array.isArray(planoParaExibir.Ciclos)) {
      return [];
    }
    
    // Filtra apenas ciclos que têm consultas válidas (Status "Ativo" + consultas disponíveis + validade)
    return planoParaExibir.Ciclos.filter((ciclo: CicloPlanoType) => cicloTemConsultasValidas(ciclo));
  }, [planoParaExibir, cicloTemConsultasValidas]);

  // Pega o ciclo mais recente entre os válidos (para exibição)
  const cicloAtivo = React.useMemo(() => {
    if (ciclosAtivosValidos.length === 0) {
      return null;
    }
    
    // Ordena por CreatedAt (mais recente primeiro) e pega o primeiro
    return [...ciclosAtivosValidos].sort((a, b) => {
      const dataA = new Date(a.CreatedAt).getTime();
      const dataB = new Date(b.CreatedAt).getTime();
      return dataB - dataA;
    })[0];
  }, [ciclosAtivosValidos]);

  // Calcula consultas restantes somando todos os ciclos ativos e válidos
  const consultasRestantes = React.useMemo(() => {
    if (ciclosAtivosValidos.length === 0) {
      return 0;
    }
    
    // Soma todas as consultas disponíveis dos ciclos válidos
    return ciclosAtivosValidos.reduce((total: number, ciclo: CicloPlanoType) => {
      return total + Math.max(0, ciclo.ConsultasDisponiveis || 0);
    }, 0);
  }, [ciclosAtivosValidos]);

  // Verifica se há créditos avulsos disponíveis (CreditoAvulso)
  const temConsultaAvulsa = React.useMemo(() => {
    if (!Array.isArray(creditoAvulso) || creditoAvulso.length === 0) return false;

    const agora = new Date();

    return creditoAvulso.some((c: CreditoAvulso) => {
      if (!c) return false;
      if (c.Status !== 'Ativa' || (c.Quantidade ?? 0) <= 0) return false;

      const validUntilStr = c.ValidUntil ?? '';
      const validUntil = new Date(validUntilStr);
      return !isNaN(validUntil.getTime()) && validUntil > agora;
    });
  }, [creditoAvulso]);

  // Calcula informações das consultas avulsas usando a mesma lógica de meus-planos (CreditoAvulso)
  const consultasAvulsasInfo = React.useMemo(() => {
    if (!creditoAvulso || !Array.isArray(creditoAvulso) || creditoAvulso.length === 0) {
      console.log('[PainelPlanoCard] consultasAvulsasInfo: sem creditoAvulso ou array vazio');
      return null;
    }

    const agora = new Date();
    
    // Filtra apenas créditos válidos (Status 'Ativa' ou 'Ativo', Quantidade > 0 e ValidUntil > agora)
    const creditosValidos = creditoAvulso.filter((c: CreditoAvulso) => {
      const statusValido = c.Status === 'Ativa' || c.Status === 'Ativo';
      if (!statusValido || c.Quantidade <= 0) {
        console.log('[PainelPlanoCard] Crédito inválido (status ou quantidade):', {
          id: c.Id,
          status: c.Status,
          quantidade: c.Quantidade
        });
        return false;
      }
      if (!c.ValidUntil) {
        console.log('[PainelPlanoCard] Crédito sem ValidUntil:', c.Id);
        return false;
      }
      const validUntil = new Date(c.ValidUntil);
      const isValid = !isNaN(validUntil.getTime()) && validUntil > agora;
      if (!isValid) {
        console.log('[PainelPlanoCard] Crédito expirado:', {
          id: c.Id,
          validUntil: c.ValidUntil,
          agora: agora.toISOString()
        });
      }
      return isValid;
    });

    console.log('[PainelPlanoCard] consultasAvulsasInfo:', {
      totalCreditos: creditoAvulso.length,
      creditosValidos: creditosValidos.length,
      creditos: creditoAvulso.map(c => ({
        id: c.Id,
        status: c.Status,
        quantidade: c.Quantidade,
        validUntil: c.ValidUntil
      }))
    });

    if (creditosValidos.length === 0) {
      return null;
    }

    // Soma todas as quantidades dos créditos válidos
    const quantidadeTotal = creditosValidos.reduce((acc: number, c: CreditoAvulso) => acc + c.Quantidade, 0);

    // Calcula dias restantes usando ValidUntil (pega o menor)
    const diasRestantes = creditosValidos.map((c: CreditoAvulso) => {
      if (c.ValidUntil) {
        const validUntil = new Date(c.ValidUntil);
        const diffMs = validUntil.getTime() - agora.getTime();
        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
      return 0;
    }).filter(d => d > 0);

    if (diasRestantes.length === 0) {
      return null;
    }

    const diasRestantesMinimo = Math.min(...diasRestantes);
    
    // Pega o ValidUntil mais próximo (que vence primeiro) para mostrar a data
    const validUntilMaisProximo = creditosValidos.reduce((maisProximo: string | null, c: CreditoAvulso) => {
      if (!c.ValidUntil) return maisProximo;
      const validUntil = new Date(c.ValidUntil);
      if (!maisProximo || validUntil < new Date(maisProximo)) {
        return c.ValidUntil;
      }
      return maisProximo;
    }, null);

    if (!validUntilMaisProximo) {
      return null;
    }

    const resultado = {
      quantidade: quantidadeTotal,
      validade: new Date(validUntilMaisProximo),
      diasRestantes: diasRestantesMinimo,
    };

    console.log('[PainelPlanoCard] consultasAvulsasInfo resultado:', resultado);
    return resultado;
  }, [creditoAvulso]);

  // Pode agendar se tiver consultas no ciclo OU consultas avulsas (CreditoAvulso)
  const podeAgendar = consultasRestantes > 0 || temConsultaAvulsa || (consultasAvulsasInfo?.quantidade ?? 0) > 0;

  // Calcula data de validade baseada em CreatedAt + 30 dias
  const dataValidadeConsultas = React.useMemo(() => {
    if (!cicloAtivo?.CreatedAt) return null;
    const dataCriacao = new Date(cicloAtivo.CreatedAt);
    const dataValidade = new Date(dataCriacao);
    dataValidade.setDate(dataValidade.getDate() + 30); // Cada ciclo tem 30 dias de validade
    return dataValidade;
  }, [cicloAtivo]);

  // Pega o id do ControleFatura com verificação de segurança
  const controleFaturaId = user?.Fatura && user.Fatura.length > 0 
    ? user.Fatura[0]?.Id 
    : undefined;

  // Usa o hook para buscar a fatura pelo id
  const { fatura } = useFaturaById(controleFaturaId);

  // Função para pegar a segunda palavra do nome do plano
  function nomePlanoCurto(nome: string | undefined) {
    if (!nome) return "";
    const partes = nome.split(" ");
    return partes.length > 1 ? partes[1] : nome;
  }

  // Se a fatura existe e o status for diferente de 'PAID', mostra o card Bloqueado
  if (fatura && fatura.Status !== 'PAID') {
    return (
      <motion.aside
        className="bg-[rgba(255,228,138,1)] w-full max-w-full md:max-w-[384px] p-4 md:p-4 rounded-lg flex flex-col gap-3 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        id="sessao"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1 sm:mb-2">
          <div className="flex items-center gap-2">
            <span className="font-fira-sans font-semibold text-[#232A5C] text-sm md:text-base">Plano:</span>
            <span className="text-[#A3A8F7] font-fira-sans font-medium text-sm md:text-base">
              {planoParaExibir ? nomePlanoCurto(planoParaExibir.PlanoAssinatura?.Nome) : 'Plano ativo'}
            </span>
          </div>
          <span className="bg-[#444D9D] text-white text-xs sm:text-sm font-fira-sans px-3 py-1 rounded-[80px] w-fit">
            Bloqueado
          </span>
        </div>
        <p className="text-xs sm:text-sm font-fira-sans text-dark leading-5">
          Percebemos que o pagamento do seu plano ainda não foi confirmado este mês.
          Que tal atualizá-lo para continuar aproveitando todos os recursos da nossa plataforma e cuidando do seu bem-estar com a gente?
        </p>
        <button
          className="inline-block px-4 py-2.5 md:py-2 bg-[#444D9D] text-white rounded-md hover:bg-[#6D75C0] transition-colors duration-200 text-sm font-fira-sans w-full text-center h-11 md:h-10"
          onClick={() => router && router.push('/painel/minha-conta/meus-planos')}
        >
          Ver detalhes
        </button>
      </motion.aside>
    );
  }

  if (isLoading) {
    return (
      <motion.aside
        className="bg-[#F5F7FF] w-full max-w-full md:max-w-[384px] rounded-lg p-4 flex flex-col gap-4 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span>Carregando plano...</span>
      </motion.aside>
    );
  }

  // Se não houver plano para exibir OU se o plano estiver ativo mas sem ciclos, ainda mostra o plano
  if (!planoParaExibir) {
    return (
      <motion.aside
        className="bg-[#F5F7FF] w-full max-w-full md:max-w-[384px] rounded-lg p-4 md:p-4 flex flex-col gap-3 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        id="sessao"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#232A5C] text-sm md:text-base">Plano:</span>
            <span className="text-[#A3A8F7] font-medium text-sm md:text-base">Sem plano</span>
          </div>
        </div>
        <p className="text-[#232A5C] text-sm leading-5">Você ainda não possui nenhum plano conosco. Aproveite para adquirir um agora.</p>
        <div className="flex flex-col gap-2.5 md:gap-2">
          <button
            className="w-full md:w-auto bg-[#A3A8F7] text-white font-semibold px-4 py-2.5 md:py-2 rounded-lg hover:bg-[#232A5C] cursor-pointer h-11 md:h-10 text-sm md:text-base transition-colors"
            onClick={() => router && router.push('/painel/planos')}
          >
            Comprar plano
          </button>
          <button
            className={`w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg font-semibold h-11 md:h-10 text-sm md:text-base transition-colors ${
              podeAgendar
                ? 'bg-[#E6E9FF] text-[#232A5C] hover:bg-[#A3A8F7] cursor-pointer border border-[#6D75C0]'
                : 'bg-[#E6E9FF] text-[#232A5C] cursor-not-allowed opacity-60'
            }`}
            disabled={!podeAgendar}
            onClick={() => {
              if (podeAgendar && router) {
                router.push('/painel/psicologos');
              }
            }}
          >
            Agendar consulta
          </button>
        </div>
      </motion.aside>
    );
  }

  // Se houver plano ativo (com ou sem ciclo válido) OU plano cancelado com ciclo válido
  if (planoParaExibir && (cicloAtivo || planoParaExibir.Status === 'Ativo' || planoParaExibir.Status === 'AguardandoPagamento')) {
    // Data de validade calculada a partir de CreatedAt + 30 dias
    const dataValidadeFormatada = dataValidadeConsultas 
      ? dataValidadeConsultas.toLocaleDateString("pt-BR", { 
          day: "2-digit", 
          month: "2-digit", 
          year: "numeric" 
        })
      : "-";

    // Vencimento do plano usando CicloFim (se houver ciclo) ou DataFim do plano
    let vencimentoFormatado = "-";
    if (cicloAtivo?.CicloFim) {
      const cicloFim = new Date(cicloAtivo.CicloFim);
      vencimentoFormatado = cicloFim.toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      });
    } else if (planoParaExibir.DataFim) {
      vencimentoFormatado = new Date(planoParaExibir.DataFim).toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "2-digit", 
        year: "numeric" 
      });
    }

    return (
      <motion.aside
        className="bg-[#E5E9FA] w-full max-w-full md:max-w-[384px] rounded-[8px] p-4 md:p-4 flex flex-col gap-3 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Mobile: Plano e Consultas restantes inline, Status abaixo | Desktop: Layout horizontal */}
        <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:gap-1">
            {/* Primeira linha: Plano + Consultas restantes (inline no mobile e desktop) */}
            <div className="flex items-center justify-between gap-2 md:justify-start">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#232A5C] text-sm md:text-base">Plano:</span>
                <span className="text-[#A3A8F7] font-medium text-sm md:text-base" style={{ textTransform: "none" }}>
                  {nomePlanoCurto(planoParaExibir?.PlanoAssinatura?.Nome || 'Plano')}
                </span>
              </div>
              {/* Badge de consultas restantes - inline com o plano */}
              <div className="flex items-center justify-center gap-1 md:gap-2 flex-shrink-0 h-7 md:h-8 rounded px-2 md:px-3 py-1 bg-[#CFD6F7]">
                <span className="font-medium text-[#444D9D] text-xs md:text-[14px] leading-5 md:leading-6 align-middle">
                  {consultasRestantes}
                </span>
                <span className="text-[#444D9D] text-[10px] md:text-[12px] leading-5 md:leading-6 font-normal align-middle whitespace-nowrap">
                  Consultas restantes
                </span>
              </div>
            </div>
            {/* Segunda linha: Status */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#232A5C] text-sm md:text-base">Status:</span>
              {planoParaExibir?.Status === "Cancelado" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Cancelado
                </span>
              )}
              {(planoParaExibir?.Status === "Ativo" || planoParaExibir?.Status === "AguardandoPagamento") && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {planoParaExibir.Status === "AguardandoPagamento" ? "Aguardando" : "Ativo"}
                </span>
              )}
            </div>
          </div>
        </div>
        {cicloAtivo && dataValidadeFormatada !== "-" ? (
          <p className="text-[#232A5C] text-sm leading-5">
            Consultas válidas para uso até {dataValidadeFormatada}
          </p>
        ) : (
          <p className="text-[#232A5C] text-sm leading-5">
            {planoParaExibir.Status === "AguardandoPagamento" 
              ? "Aguardando confirmação de pagamento para ativação do plano."
              : "Plano ativo. Aguardando início do próximo ciclo."}
          </p>
        )}
        {/* Mostra data de cancelamento se plano cancelado, senão mostra vencimento */}
        {planoParaExibir?.Status === "Cancelado" && planoParaExibir?.DataFim ? (
          <div className="flex flex-row items-center gap-2">
            <span className="font-semibold text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle">
              Data de cancelamento:
            </span>
            <span className="text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle font-normal">
              {new Date(planoParaExibir.DataFim).toLocaleDateString("pt-BR", { 
                day: "2-digit", 
                month: "2-digit", 
                year: "numeric" 
              })}
            </span>
          </div>
        ) : (
          <div className="flex flex-row items-center gap-2">
            <span className="font-semibold text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle">
              Vencimento do plano:
            </span>
            <span className="text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle font-normal">
              {vencimentoFormatado}
            </span>
          </div>
        )}
        {/* Botões - Mobile: full width, Desktop: fixed width */}
        <div className="flex flex-col gap-2.5 md:gap-2 mt-1 md:mt-0">
          <button
            className="w-full md:w-[352px] h-11 md:h-10 px-4 flex items-center justify-center gap-3 rounded-[6px] bg-[#8494E9] text-white font-semibold text-sm md:text-base hover:bg-[#232A5C] cursor-pointer opacity-100 transition-colors"
            onClick={() => router && router.push('/painel/minha-conta/meus-planos')}
          >
            Detalhes do plano
          </button>
          <button
            className={`w-full md:w-[352px] h-11 md:h-10 px-4 flex items-center justify-center gap-3 rounded-[6px] border border-[#6D75C0] text-[#232A5C] font-semibold text-sm md:text-base bg-white opacity-100 transition-colors ${
              podeAgendar
                ? 'hover:bg-[#E6E9FF] cursor-pointer'
                : 'cursor-not-allowed opacity-60'
            }`}
            disabled={!podeAgendar}
            onClick={() => {
              if (podeAgendar && router) {
                router.push('/painel/psicologos');
              }
            }}
          >
            Agendar consulta
          </button>
        </div>
      </motion.aside>
    );
  }

  // Se não houver ciclo ativo e não houver mais consultas válidas, mostra tela de "sem plano"
  if (!cicloAtivo && consultasRestantes === 0 && !temConsultaAvulsa && !consultasAvulsasInfo) {
    return (
      <motion.aside
        className="bg-[#F5F7FF] w-full max-w-full md:max-w-[384px] rounded-lg p-4 md:p-4 flex flex-col gap-3 md:gap-4 border border-[#E6E9FF] opacity-100 mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        id="sessao"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#232A5C] text-sm md:text-base">Plano:</span>
            <span className="text-[#A3A8F7] font-medium text-sm md:text-base">Sem plano</span>
          </div>
        </div>
        <p className="text-[#232A5C] text-sm leading-5">Você ainda não possui nenhum plano conosco. Aproveite para adquirir um agora.</p>
        <div className="flex flex-col gap-2.5 md:gap-2">
          <button
            className="w-full md:w-auto bg-[#A3A8F7] text-white font-semibold px-4 py-2.5 md:py-2 rounded-lg hover:bg-[#232A5C] cursor-pointer h-11 md:h-10 text-sm md:text-base transition-colors"
            onClick={() => router && router.push('/painel/planos')}
          >
            Comprar plano
          </button>
          <button
            className={`w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg font-semibold h-11 md:h-10 text-sm md:text-base transition-colors ${
              podeAgendar
                ? 'bg-[#E6E9FF] text-[#232A5C] hover:bg-[#A3A8F7] cursor-pointer border border-[#6D75C0]'
                : 'bg-[#E6E9FF] text-[#232A5C] cursor-not-allowed opacity-60'
            }`}
            disabled={!podeAgendar}
            onClick={() => {
              if (podeAgendar && router) {
                router.push('/painel/psicologos');
              }
            }}
          >
            Agendar consulta
          </button>
        </div>
      </motion.aside>
    );
  }

  // Se não houver ciclo ativo mas ainda há plano, mostra mensagem padrão
  return (
    <motion.aside
      className="bg-[#E5E9FA] w-full max-w-full md:max-w-[384px] rounded-lg p-4 md:p-4 flex flex-col gap-3 md:gap-4 border border-[#E6E9FF] opacity-100 mx-0 mb-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div className="flex flex-col gap-2 md:gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#232A5C] text-sm md:text-base">Plano:</span>
            <span className="text-[#A3A8F7] font-medium text-sm md:text-base" style={{ textTransform: "none" }}>
              {nomePlanoCurto(planoParaExibir?.PlanoAssinatura?.Nome || 'Plano')}
            </span>
          </div>
          {/* Tag de status abaixo do tipo do plano */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#232A5C] text-sm md:text-base">Status:</span>
            {planoParaExibir?.Status === "Cancelado" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Cancelado
              </span>
            )}
            {(planoParaExibir?.Status === "Ativo" || planoParaExibir?.Status === "AguardandoPagamento") && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {planoParaExibir.Status === "AguardandoPagamento" ? "Aguardando" : "Ativo"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 w-full md:w-[180px] h-8 rounded px-3 py-1 bg-[#CFD6F7] justify-center">
          <span className="text-[#232A5C] text-xs md:text-xs font-semibold whitespace-nowrap">
            {consultasRestantes} Consultas restantes
          </span>
        </div>
      </div>
      <p className="text-[#232A5C] text-sm leading-5">
        Nenhum ciclo ativo no momento.
      </p>
      {planoParaExibir?.Status === "Cancelado" && planoParaExibir?.DataFim ? (
        <div className="flex flex-row items-center gap-2">
          <span className="font-semibold text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle">
            Data de cancelamento:
          </span>
          <span className="text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle font-normal">
            {new Date(planoParaExibir.DataFim).toLocaleDateString("pt-BR", { 
              day: "2-digit", 
              month: "2-digit", 
              year: "numeric" 
            })}
          </span>
        </div>
      ) : cicloAtivo?.CicloFim ? (
        <div className="flex flex-row items-center gap-2">
          <span className="font-semibold text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle">
            Vencimento do plano:
          </span>
          <span className="text-sm md:text-[16px] leading-5 md:leading-6 text-[#212529] align-middle font-normal">
            {new Date(cicloAtivo.CicloFim).toLocaleDateString("pt-BR", { 
              day: "2-digit", 
              month: "2-digit", 
              year: "numeric" 
            })}
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 md:gap-2 mt-1 md:mt-0">
        <button
          className="w-full md:w-auto bg-[#A3A8F7] text-white font-semibold px-4 py-2.5 md:py-2 rounded-lg hover:bg-[#232A5C] cursor-pointer h-11 md:h-10 text-sm md:text-base transition-colors"
          onClick={() => router && router.push('/painel/minha-conta/meus-planos')}
        >
          Ver detalhe
        </button>
        <button
          className={`w-full md:w-auto px-4 py-2.5 md:py-2 rounded-lg font-semibold h-11 md:h-10 text-sm md:text-base transition-colors ${
            podeAgendar
              ? 'bg-[#E6E9FF] text-[#232A5C] hover:bg-[#A3A8F7] cursor-pointer border border-[#6D75C0]'
              : 'bg-[#E6E9FF] text-[#232A5C] cursor-not-allowed opacity-60'
          }`}
          disabled={!podeAgendar}
          onClick={() => {
            if (podeAgendar && router) {
              router.push('/painel/psicologos');
            }
          }}
        >
          Agendar consulta
        </button>
      </div>
    </motion.aside>
  );
}