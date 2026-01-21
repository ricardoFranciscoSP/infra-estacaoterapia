"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SidebarPsicologo from "./SidebarPsicologo";
import Image from "next/image";
import { useObterPagamentos } from "@/hooks/psicologos/financeiro.hook";
import { useObterConsultasRealizadas, useObterTaxaOcupacao, useObterConsultasPendentes, useObterProximasConsultas, useObterProximaConsultaPsicologo, useObterConsultasNoMes } from "@/hooks/psicologos/consultas.hook";
import { useUserBasic } from "@/hooks/user/userHook";
import PainelCardsPsicologo from "@/components/PainelCardsPsicologo";
import ModalCompletarPerfil from "@/components/ModalCompletarPerfil";
import AlertCompletarPerfil from "@/components/AlertCompletarPerfil";
import { useUserPsicologo } from '@/hooks/user/userPsicologoHook';
import ProximaConsultaPsicologo from "@/components/ProximasConsultasPsicologo";
import { ConsultaEmAndamento } from "@/components/ConsultaEmAndamento";
import ConsultaAtualPsicologo from "@/components/ConsultaAtualPsicologo";
import ConsultaModal from "@/components/ConsultaModal";
import ModalCancelarSessaoDesk from "@/components/ModalCancelarSessaoDesk";
import ModalCancelarSessaoMobile from "@/components/ModalCancelarSessaoMobile";
import { useConsultaEmAndamento } from "@/hooks/useConsultaEmAndamento";
import type { ProximasConsultas as ProximasConsultaType } from "@/types/psicologoTypes";
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { getContextualAvatar } from "@/utils/avatarUtils";
import { joinUserRoom, onProximaConsultaAtualizada, offProximaConsultaAtualizada, onConsultationStatusChanged, offConsultationStatusChanged } from '@/lib/socket';
import { toast } from '@/components/CustomToastProvider';
import { useProfilePercent } from '@/hooks/user/useProfilePercent';
import { queryClient } from '@/lib/queryClient';
import { useCancelamentoConsulta } from '@/hooks/useCancelamentoConsulta';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

// Função para garantir que apenas o nome completo do paciente seja exibido
// Remove qualquer dado sensível que possa vir acidentalmente da API
function getNomePacienteSeguro(paciente: string | undefined | null): string {
  if (!paciente) return "Não informado";
  
  // Remove possíveis dados sensíveis que possam estar concatenados
  // Remove emails, CPFs, telefones, etc.
  let nome = paciente.trim();
  
  // Remove padrões de email
  nome = nome.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '');
  
  // Remove padrões de CPF (XXX.XXX.XXX-XX ou XXXXXXXXXXX)
  nome = nome.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '');
  
  // Remove padrões de telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
  nome = nome.replace(/\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, '');
  
  // Remove múltiplos espaços
  nome = nome.replace(/\s+/g, ' ').trim();
  
  // Se após a limpeza não sobrar nada, retorna "Não informado"
  if (!nome) return "Não informado";
  
  return nome;
}

function getReviewRating(review: { Rating?: unknown }) {
  const ratingValue = Number(review?.Rating);
  return Number.isFinite(ratingValue) ? ratingValue : null;
}

export default function PainelPsicologoPage() {
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [menuFiltroOpen, setMenuFiltroOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { calculoPagamento, isLoading: loadingPagamentos} = useObterPagamentos();
  const { isLoading: loadingConsultas } = useObterConsultasRealizadas();
  const { taxaOcupacao, isLoading: loadingOcupacao } = useObterTaxaOcupacao();
  const { consultasPendentes } = useObterConsultasPendentes();
  const { proximasConsultas, refetch: refetchProximasConsultas } = useObterProximasConsultas();
  const { proximaConsulta: proximaConsultaNextReservation, consultaAtual: consultaAtualFromHook, refetch: refetchProximaConsulta } = useObterProximaConsultaPsicologo();
  const { totalConsultasNoMes } = useObterConsultasNoMes(mesSelecionado + 1, anoSelecionado);
  const userBasic = useUserBasic();
  const userPsicologo = useUserPsicologo();
  const profilePercent = useProfilePercent();
  const firstName = userBasic.user?.Nome?.split(" ")[0] || "";

  const ratingSummary = useMemo(() => {
    const reviewsReceived: Array<{ Rating?: unknown }> = Array.isArray(
      userPsicologo?.psicologo?.user?.[0]?.ReviewsReceived
    )
      ? userPsicologo?.psicologo?.user?.[0]?.ReviewsReceived
      : [];
    const avaliadas = reviewsReceived
      .map(getReviewRating)
      .filter((rating): rating is number => typeof rating === "number");

    const count = avaliadas.length;
    const average = count > 0 ? avaliadas.reduce((acc, rating) => acc + rating, 0) / count : 0;

    return { average, count };
  }, [userPsicologo]);

  // Verifica status do perfil profissional
  const professionalStatus = useMemo(() => {
    const status = userPsicologo?.psicologo?.user?.[0]?.ProfessionalProfiles?.[0]?.Status;
    // Logs removidos para reduzir poluição - usar DevTools se necessário
    return status || "Incompleto";
  }, [userPsicologo]);

  const isPerfilIncompleto = useMemo(() => {
    // Compara de forma case-insensitive e verifica se é diferente de "Preenchido"
    const statusNormalized = String(professionalStatus).trim().toLowerCase();
    const statusIsPreenchido = statusNormalized === "preenchido";
    
    // Se o status não estiver disponível ou for "Incompleto", verifica o percentual como fallback
    // Se o percentual for 100%, considera o perfil como preenchido
    const percentualIsCompleto = profilePercent >= 100;
    
    // O perfil está incompleto se:
    // 1. O status não é "Preenchido" E
    // 2. O percentual não é 100%
    const isIncompleto = !statusIsPreenchido && !percentualIsCompleto;
    
    // Log removido para reduzir poluição
    return isIncompleto;
  }, [professionalStatus, profilePercent]);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    setCurrentDateTime(now.toLocaleDateString("pt-BR", options));

    return () => clearTimeout(timer);
  }, []);

  // Helper para extrair data (YYYY-MM-DD) do campo Data (que pode vir como timestamp)
  const extrairDataString = (data: string | Date | undefined): string | null => {
    if (!data) return null;
    
    if (data instanceof Date) {
      return data.toISOString().split('T')[0];
    }
    
    if (typeof data === 'string') {
      // Se tem timestamp (ex: "2025-12-29 03:00:00" ou "2025-12-29T03:00:00"), extrai apenas a data
      if (data.includes('T')) {
        return data.split('T')[0];
      }
      if (data.includes(' ')) {
        return data.split(' ')[0];
      }
      // Se já é YYYY-MM-DD, retorna direto
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
      }
    }
    
    return null;
  };

  // Lógica para identificar consulta em andamento e próximas consultas
  const consultasFiltradasEOrdenadas = useMemo(() => {
    const construirDataHoraCompleta = (c: typeof proximasConsultas[0]): Date | null => {
      try {
        let dataStr: string | null = null;
        let horaStr: string | null = null;
        if (c.Date) {
          dataStr = extrairDataString(c.Date);
          horaStr = c.Time || null;
        } else if (c.Agenda?.Data && c.Agenda?.Horario) {
          dataStr = extrairDataString(c.Agenda.Data);
          horaStr = String(c.Agenda.Horario);
        }
        if (!dataStr || !horaStr) return null;
        const [hh, mm] = horaStr.split(":").map(Number);
        const dataHoraCompleta = dayjs.tz(`${dataStr} ${hh}:${mm}:00`, 'America/Sao_Paulo');
        if (!dataHoraCompleta.isValid()) return null;
        return dataHoraCompleta.toDate();
      } catch {
        return null;
      }
    };
    const nowBr = dayjs().tz('America/Sao_Paulo');
    const consultasComDataHora = proximasConsultas
      .map(c => {
        const dtConsulta = construirDataHoraCompleta(c);
        if (!dtConsulta) return null;
        const dtConsultaBr = dayjs(dtConsulta).tz('America/Sao_Paulo');
        const fimConsulta = dtConsultaBr.add(60, 'minute');
        if (nowBr.isAfter(fimConsulta)) return null;
        return { consulta: c, dataHora: dtConsulta };
      })
      .filter((item): item is { consulta: typeof proximasConsultas[0]; dataHora: Date } => item !== null);
    consultasComDataHora.sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
    return consultasComDataHora.map(item => item.consulta);
  }, [proximasConsultas]);

  // Calcula total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(consultasFiltradasEOrdenadas.length / itemsPerPage);
  }, [consultasFiltradasEOrdenadas.length, itemsPerPage]);

  // Reset página quando consultas mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [consultasFiltradasEOrdenadas.length]);

  // Consulta em andamento via backend - atualiza mais frequentemente para mostrar sempre
  const { consulta: consultaEmAndamento, fetchConsulta } = useConsultaEmAndamento('psicologo');

  useEffect(() => {
    fetchConsulta();
    // Atualiza a cada 5 segundos para garantir que consulta em andamento seja mostrada imediatamente
    const interval = setInterval(fetchConsulta, 5000);
    return () => clearInterval(interval);
  }, [fetchConsulta]);

  // Prioriza nextReservation se existir, senão usa a primeira da lista filtrada
  const proximaConsultaPsico = useMemo<ProximasConsultaType | null>(() => {
    // PRIORIDADE 1: Usa nextReservation do novo endpoint se existir
    if (proximaConsultaNextReservation) {
      return proximaConsultaNextReservation;
    }
    
    // PRIORIDADE 2: Usa a primeira consulta da lista filtrada
    if (consultasFiltradasEOrdenadas.length > 0) {
      return consultasFiltradasEOrdenadas[0];
    }
    
    return null;
  }, [proximaConsultaNextReservation, consultasFiltradasEOrdenadas]);

  // Estado em tempo real para próxima consulta
  const [proximaConsultaLive, setProximaConsultaLive] = useState<ProximasConsultaType | null>(proximaConsultaPsico);

  // Mantém em sincronia quando lista base mudar ou quando a próxima consulta mudar
  useEffect(() => {
    // Sempre atualiza para garantir que está mostrando a mais atual
    setProximaConsultaLive(proximaConsultaPsico);
  }, [proximaConsultaPsico]);

  // Escuta atualizações em tempo real via socket e força refetch
  useEffect(() => {
    const userId = userBasic.user?.Id;
    if (!userId) return;

    joinUserRoom(userId);

    const handler = (data: { consulta: ProximasConsultaType | null; motivo?: string }) => {
      // Quando recebe atualização via socket, força refetch para garantir dados atualizados
      refetchProximasConsultas();
      refetchProximaConsulta();
      fetchConsulta(); // Atualiza consulta em andamento
      
      // Invalida queries relacionadas para atualizar em tempo real
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-sessao'] });
      
      // Atualiza o estado local também
      if (data.consulta) {
        setProximaConsultaLive(data.consulta);
      }
      
      if (data?.motivo) {
        toast.success(`Atualização: ${data.motivo}`);
      } else {
        toast.success('Sua próxima consulta foi atualizada.');
      }
    };

    onProximaConsultaAtualizada<ProximasConsultaType | null>(handler);
    return () => {
      offProximaConsultaAtualizada();
    };
  }, [userBasic.user?.Id, refetchProximasConsultas, refetchProximaConsulta, fetchConsulta]);

  // Escuta mudanças de status de consulta em tempo real
  useEffect(() => {
    // Escuta mudanças de status para todas as consultas relevantes
    const consultaIds = new Set<string>();
    
    // Adiciona IDs das consultas atuais e próximas
    if (consultaAtualFromHook?.Id) {
      consultaIds.add(consultaAtualFromHook.Id);
    }
    if (consultaEmAndamento?.Id) {
      consultaIds.add(consultaEmAndamento.Id);
    }
    if (proximaConsultaLive?.Id) {
      consultaIds.add(proximaConsultaLive.Id);
    }
    if (proximaConsultaPsico?.Id) {
      consultaIds.add(proximaConsultaPsico.Id);
    }

    // Adiciona listeners para cada consulta
    const cleanupFunctions: (() => void)[] = [];

    consultaIds.forEach((consultaId) => {
      const handler = (data: { status: string; consultationId: string }) => {
        if (data.consultationId === consultaId) {
          console.log(`[PainelPsicologo] Status da consulta ${consultaId} mudou para ${data.status}`);
          
          // Força refetch de todas as queries relacionadas
          refetchProximasConsultas();
          refetchProximaConsulta();
          fetchConsulta();
          
          // Invalida queries para atualizar em tempo real
          queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
          queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
          queryClient.invalidateQueries({ queryKey: ['reserva-sessao', consultaId] });
          queryClient.invalidateQueries({ queryKey: ['consulta', consultaId] });
        }
      };

      onConsultationStatusChanged(handler, consultaId);
      cleanupFunctions.push(() => offConsultationStatusChanged(consultaId));
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [consultaAtualFromHook?.Id, consultaEmAndamento?.Id, proximaConsultaLive?.Id, proximaConsultaPsico?.Id, refetchProximasConsultas, refetchProximaConsulta, fetchConsulta]);

  // Monitora mudanças na consulta e atualiza automaticamente
  useEffect(() => {
    if (!consultaAtualFromHook && !consultaEmAndamento) return;

    // Verifica periodicamente se há atualizações na consulta
    const interval = setInterval(() => {
      // Log removido para reduzir poluição - refetch silencioso
      refetchProximasConsultas();
      refetchProximaConsulta();
      fetchConsulta();
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
    }, 30000); // Verifica a cada 30 segundos

    return () => clearInterval(interval);
  }, [consultaAtualFromHook, consultaEmAndamento, refetchProximasConsultas, refetchProximaConsulta, fetchConsulta]);

  // Verifica se deve mostrar consulta atual ou próxima consulta
  // A lógica de verificação dentro do período de 60 minutos é feita no componente ConsultaAtualPsicologo
  // que já usa o estado do Redis via socket. Aqui apenas verificamos se há consulta disponível.
  const deveMostrarConsultaAtual = useMemo(() => {
    if (!consultaAtualFromHook && !consultaEmAndamento) return false;
    return true;
  }, [consultaAtualFromHook, consultaEmAndamento]);

  // Removido: lógica de índice e timer de próxima consulta; agora usamos o componente reutilizado

  // Estado para modal de completar perfil
  const [showModal, setShowModal] = useState(false);

  // Estado para modal de detalhes da consulta
  const [showModalDetalhes, setShowModalDetalhes] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<ProximasConsultaType | null>(null);

  // Estado para modal de cancelamento
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [consultaParaCancelar, setConsultaParaCancelar] = useState<ProximasConsultaType | null>(null);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const { cancelarConsulta } = useCancelamentoConsulta();

  // Estado para largura da tela (evita acesso direto ao window no render)
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    // Só roda no client
    const checkWidth = () => setIsDesktop(window.innerWidth >= 640);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);
  
  // Função para abrir modal de detalhes
  const handleAbrirModalDetalhes = (consulta: ProximasConsultaType) => {
    setConsultaSelecionada(consulta);
    setShowModalDetalhes(true);
  };

  // Função para abrir modal de cancelamento
  const handleAbrirModalCancelar = (consultaId?: string | number) => {
    console.log('[PainelPsicologo] Abrindo modal de cancelamento para:', consultaId);
    
    // Se vier consultaId, busca a consulta correspondente
    if (consultaId) {
      const consulta = proximasConsultas.find(c => c.Id === consultaId);
      if (consulta) {
        setConsultaParaCancelar(consulta);
      } else if (consultaSelecionada && consultaSelecionada.Id === consultaId) {
        setConsultaParaCancelar(consultaSelecionada);
      }
    } else if (consultaSelecionada) {
      // Se não vier consultaId, usa a consulta selecionada
      setConsultaParaCancelar(consultaSelecionada);
    }
    
    setShowModalCancelar(true);
    setShowModalDetalhes(false); // Fecha o modal de detalhes
  };

  // Handler para cancelamento
  const handleCancelarConsulta = async (motivo: string, documento?: File | null) => {
    if (isLoadingCancel || !consultaParaCancelar) return;
    
    setIsLoadingCancel(true);
    const loadingToast = toast.loading("Processando cancelamento...");
    
    try {
      const consultaId = consultaParaCancelar.Id || "";
      const pacienteId = consultaParaCancelar.PacienteId || consultaParaCancelar.Paciente?.Id || "";
      const psicologoId = consultaParaCancelar.PsicologoId || consultaParaCancelar.Psicologo?.Id || userBasic.user?.Id || "";
      const horario = consultaParaCancelar.Time || consultaParaCancelar.Agenda?.Horario || "";
      const data = consultaParaCancelar.Date || consultaParaCancelar.Agenda?.Data || "";

      console.log("=== DEBUG CANCELAMENTO PAINEL PSICOLOGO ===");
      console.log("consultaId:", consultaId);
      console.log("pacienteId:", pacienteId);
      console.log("psicologoId:", psicologoId);
      console.log("motivo:", motivo);
      console.log("horario:", horario);
      console.log("data:", data);
      console.log("documento:", documento?.name);

      if (!consultaId || !pacienteId || !psicologoId) {
        throw new Error("Dados da consulta incompletos. Por favor, tente novamente.");
      }

      if (!horario) {
        throw new Error("Horário da consulta não disponível. Por favor, tente novamente.");
      }

      await cancelarConsulta({
        idconsulta: consultaId,
        idPaciente: pacienteId,
        idPsicologo: psicologoId,
        motivo: motivo,
        protocolo: `CANCEL-${new Date().getTime()}`,
        horario: horario,
        data: data,
        tipo: "Psicologo",
        documento: documento || undefined,
      });

      toast.dismiss(loadingToast);
      toast.success("Cancelamento enviado! O paciente será notificado por email.");
      
      setShowModalCancelar(false);
      setConsultaParaCancelar(null);
      
      // Recarrega a lista de consultas
      refetchProximasConsultas();
      
      // Recarrega a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("Erro ao cancelar consulta:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(error?.response?.data?.message || error?.message || "Erro ao cancelar consulta. Tente novamente.");
    } finally {
      setIsLoadingCancel(false);
    }
  };

  // Exibe modal após 30s do carregamento da página, apenas se perfil incompleto
  useEffect(() => {
    if (
      isPerfilIncompleto &&
      !loading &&
      !loadingPagamentos &&
      !loadingConsultas &&
      !loadingOcupacao
    ) {
      const timer = setTimeout(() => setShowModal(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [loading, loadingPagamentos, loadingConsultas, loadingOcupacao, isPerfilIncompleto]);

  if (loading || loadingPagamentos || loadingConsultas || loadingOcupacao) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="text-center mt-20"
      >
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen font-fira bg-[#F6F7FB]"
    >
      <div className="max-w-[1200px] mx-auto w-full flex">
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        <main className="py-4 sm:py-8 px-3 sm:px-4 md:px-6 flex-1 w-full overflow-x-hidden">
          {/* Modal Completar Perfil */}
          <ModalCompletarPerfil
            isOpen={isPerfilIncompleto && showModal}
            onClose={() => setShowModal(false)}
          />

          {/* Saudação e painel superior */}
          <AnimatePresence mode="wait">
            <motion.div
              key="painel-superior"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8 relative"
            >
              {/* Header com saudação e data/hora */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="mb-3 sm:mb-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                    Bem-vindo(a) {firstName}!
                  </h1>
                  <span className="text-sm sm:text-base text-gray-500">
                    {currentDateTime}
                  </span>
                </div>
              </div>

              {/* ALERTA DE PERFIL INCOMPLETO */}
              <AlertCompletarPerfil show={isPerfilIncompleto} />

              {/* Container flex para card de consulta e avisos lado a lado */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Card de Consulta - Alinhado à esquerda, abaixo do Bem-vindo */}
                <div className="w-full lg:max-w-[540px] lg:flex-shrink-0">
                  {/* PRIORIDADE 1: Consulta atual (em andamento) - só mostra se estiver dentro dos 60 minutos */}
                  {deveMostrarConsultaAtual && (consultaAtualFromHook || consultaEmAndamento) ? (
                    <>
                      {consultaAtualFromHook && (
                        <ConsultaAtualPsicologo consulta={consultaAtualFromHook} hidePerfil />
                      )}
                      {!consultaAtualFromHook && consultaEmAndamento && (
                        <ConsultaEmAndamento
                          consulta={consultaEmAndamento}
                          role="psicologo"
                          onEntrar={() => window.open(`/consulta/${consultaEmAndamento.Id}`, '_blank')}
                        />
                      )}
                    </>
                  ) : null}
                  
                  {/* PRIORIDADE 2: Próxima consulta - mostra se não houver consulta atual dentro do período OU se ConsultaAtualPsicologo retornou null */}
                  {proximaConsultaLive ? (
                    <>
                      <h3 className="fira-sans font-semibold text-xl sm:text-2xl leading-tight tracking-normal text-[#49525A] mb-4">
                        Próxima consulta
                      </h3>
                      <ProximaConsultaPsicologo consultas={proximaConsultaLive} role="psicologo" hidePerfil />
                    </>
                  ) : (
                    <>
                      <h3 className="fira-sans font-semibold text-xl sm:text-2xl leading-tight tracking-normal text-[#49525A] mb-4">
                        Próxima consulta
                      </h3>
                      <div className="bg-white rounded-lg px-5 py-6 flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 min-h-[180px]">
                        <svg 
                          className="w-16 h-16 text-gray-400 mb-4" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth={1.5} 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-9-9h.008v.008H12V9.75zm-3 0h.008v.008H9V9.75zm-3 0h.008v.008H6V9.75zm2.25 4.5h.008v.008h-.008V14.25zm3 0h.008v.008H12V14.25zm3 0h.008v.008h-.008V14.25z" />
                        </svg>
                        <p className="text-gray-600 text-base font-medium mb-2">
                          Nenhuma consulta agendada no momento
                        </p>
                        <p className="text-gray-500 text-sm">
                          Quando você tiver consultas agendadas, elas aparecerão aqui
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Card de Avisos - Lado direito, no espaço que sobrou */}
                <div className="w-full lg:w-[400px] lg:flex-shrink-0">
                  {/* Título invisível para alinhamento com "Próxima consulta" */}
                  <h3 className="hidden lg:block fira-sans font-semibold text-xl sm:text-2xl leading-tight tracking-normal text-transparent mb-4 pointer-events-none select-none">
                    Próxima consulta
                  </h3>
                  <div className="bg-white rounded-lg px-5 py-4 flex flex-col gap-3 shadow-sm border border-gray-100 h-[180px] min-h-[180px]">
                    <span className="font-fira font-semibold text-lg leading-6 text-[#26220D] flex items-center gap-2">
                      <svg 
                        className="w-5 h-5 text-red-500 shrink-0" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      Avisos
                    </span>
                    <div className="flex flex-col gap-2.5 text-[#49525A] text-sm sm:text-base">
                      <span className="flex items-start gap-2.5">
                        <svg 
                          className="w-4 h-4 text-green-500 shrink-0 mt-0.5" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth={2.5} 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Fique atento aos horários!</span>
                      </span>
                      <span className="flex items-start gap-2.5">
                        <svg 
                          className="w-4 h-4 text-green-500 shrink-0 mt-0.5" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth={2.5} 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Verifique seus pagamentos e pendências.</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Próxima consulta (original) removida em favor de ProximasConsultas reutilizado */}
            </motion.div>
          </AnimatePresence>

          {/* Painel do psicólogo */}
          <AnimatePresence mode="wait">
            <motion.div
              key="painel-cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col lg:flex-row lg:gap-6 mb-8 mt-12"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2 relative">
                  <span className="text-base font-semibold text-gray-700">Painel do psicólogo</span>
                  <div className="relative">
                    <button
                      className="flex items-center text-xs text-[#6D75C0] underline cursor-pointer hover:text-[#6B7DD8] font-bold transition"
                      style={{ cursor: "pointer" }}
                      onClick={() => setMenuFiltroOpen((open) => !open)}
                      type="button"
                    >
                      <Image src="/icons/filter.svg" alt="Filtrar" width={16} height={16} className="mr-1" />
                      Filtrar
                    </button>
                    {menuFiltroOpen && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-50 p-4 min-w-[220px]">
                        <div>
                          <label className="block mb-1 text-sm font-medium text-gray-700">Mês</label>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={mesSelecionado}
                            onChange={e => setMesSelecionado(Number(e.target.value))}
                          >
                            {meses.map((mes, idx) => (
                              <option key={mes} value={idx}>{mes}</option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-3">
                          <label className="block mb-1 text-sm font-medium text-gray-700">Ano</label>
                          <select
                            className="border rounded px-3 py-2 w-full"
                            value={anoSelecionado}
                            onChange={e => setAnoSelecionado(Number(e.target.value))}
                          >
                            {Array.from({ length: 5 }).map((_, i) => {
                              const ano = new Date().getFullYear() - 2 + i;
                              return (
                                <option key={ano} value={ano}>{ano}</option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            className="flex-1 px-4 py-2 bg-gray-200 text-[#6D75C0] rounded font-bold shadow hover:bg-[#6B7DD8] hover:text-white transition"
                            onClick={() => setMenuFiltroOpen(false)}
                            type="button"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  Mês: {meses[mesSelecionado]}/{anoSelecionado}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Cards - Desktop: 2 linhas, Mobile: grid 2 colunas */}
          <AnimatePresence mode="wait">
            <motion.div
              key="painel-cards-psicologo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="mb-8"
            >
              <PainelCardsPsicologo
                calculoPagamento={calculoPagamento}
                consultasPendentes={consultasPendentes}
                taxaOcupacao={taxaOcupacao}
                consultasNoMes={totalConsultasNoMes}
                ratingAverage={ratingSummary.average}
                ratingCount={ratingSummary.count}
                ratingLoading={userPsicologo?.isLoading}
              />
            </motion.div>
          </AnimatePresence>

          {/* Tabela de Próximas Consultas com Paginação */}
          <AnimatePresence mode="wait">
            <motion.div
              key="lista-proximas-consultas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-[#FCFBF6] shadow rounded-lg p-4 sm:p-6 mb-24 sm:mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold">Próximas consultas</h2>
                  <span className="text-xs text-gray-600 block mt-1">
                    Hoje: {new Date().toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <button className="flex items-center text-[#6D75C0]">
                  <Image src="/icons/filter.svg" alt="Filtrar" width={20} height={20} />
                </button>
              </div>
              
              {/* Se não houver consultas */}
              {consultasFiltradasEOrdenadas.length === 0 ? (
                <div className="text-center py-8">
                  <span className="block text-sm text-gray-500">
                    Você ainda não possui nenhuma consulta agendada
                  </span>
                </div>
              ) : (
                <>
                  {/* Tabela */}
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead className="bg-gray-50">
                        <tr className="border-b-2 border-[#E5E7EB]">
                          <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Paciente</th>
                          <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Data</th>
                          <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Horário</th>
                          <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {consultasFiltradasEOrdenadas
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((consulta, idx) => {
                              const horaConsulta = consulta.Agenda?.Horario || consulta.Time || "";
                              const dataConsulta = consulta.Agenda?.Data || consulta.Date;
                              const dataFormatada = dataConsulta 
                                ? new Date(dataConsulta).toLocaleDateString("pt-BR")
                                : "-";
                              
                              return (
                                <motion.tr
                                  key={consulta.Id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                                  className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors"
                                >
                                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-800 align-middle">
                                    {getNomePacienteSeguro(consulta.Paciente?.Nome) || "Paciente"}
                                  </td>
                                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 align-middle">
                                    {dataFormatada}
                                  </td>
                                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 align-middle">
                                    {horaConsulta || "-"}
                                  </td>
                                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center align-middle">
                                    <button
                                      onClick={() => handleAbrirModalDetalhes(consulta)}
                                      className="inline-flex items-center justify-center gap-1 text-xs text-[#6D75C0] font-bold cursor-pointer hover:text-[#6B7DD8] hover:underline transition"
                                    >
                                      <Image src="/icons/olho-detalhes.svg" alt="Ver detalhes" width={16} height={16} />
                                      <span className="hidden sm:inline">Ver detalhes</span>
                                      <span className="sm:hidden">Detalhes</span>
                                    </button>
                                  </td>
                                </motion.tr>
                              );
                            })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Paginação */}
                  {consultasFiltradasEOrdenadas.length > itemsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-4 border-t border-[#E5E7EB] gap-3">
                      <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, consultasFiltradasEOrdenadas.length)} de {consultasFiltradasEOrdenadas.length} consultas
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-xs sm:text-sm text-[#6D75C0] border border-[#6D75C0] rounded font-bold hover:bg-[#6B7DD8] hover:text-white hover:border-[#6B7DD8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        <span className="text-xs sm:text-sm text-gray-700">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-xs sm:text-sm text-[#6D75C0] border border-[#6D75C0] rounded font-bold hover:bg-[#6B7DD8] hover:text-white hover:border-[#6B7DD8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Modal de detalhes da consulta */}
          {consultaSelecionada && showModalDetalhes && (() => {
            const normalized = normalizeConsulta(consultaSelecionada as unknown as GenericObject);
            const avatarPaciente = getContextualAvatar(true, normalized?.psicologo, normalized?.paciente);
            const dataConsulta = consultaSelecionada.Date || consultaSelecionada.Agenda?.Data || "";
            const horaConsulta = consultaSelecionada.Time || consultaSelecionada.Agenda?.Horario || "";
            
            return (
              <ConsultaModal
                open={showModalDetalhes}
                onClose={() => {
                  setShowModalDetalhes(false);
                  setConsultaSelecionada(null);
                }}
                consulta={{
                  data: dataConsulta,
                  horario: horaConsulta,
                  paciente: normalized?.paciente ? {
                    nome: normalized.paciente.nome || consultaSelecionada.Paciente?.Nome || "Paciente",
                    avatarUrl: normalized.paciente.imageUrl || avatarPaciente,
                  } : undefined,
                  psicologo: normalized?.psicologo ? {
                    nome: normalized.psicologo.nome || "Psicólogo",
                    avatarUrl: normalized.psicologo.imageUrl || avatarPaciente,
                  } : {
                    nome: "Psicólogo",
                    avatarUrl: avatarPaciente,
                  },
                }}
                botaoEntrarDesabilitado={true}
                consultaId={consultaSelecionada.Id}
                onAbrirCancelar={handleAbrirModalCancelar}
              />
            );
          })()}
          
          {/* Modal de cancelamento - Desktop */}
          {consultaParaCancelar && isDesktop === true && (
            <ModalCancelarSessaoDesk
              open={showModalCancelar}
              onClose={() => {
                setShowModalCancelar(false);
                setConsultaParaCancelar(null);
              }}
              onConfirm={handleCancelarConsulta}
              consulta={{
                data: consultaParaCancelar.Date || consultaParaCancelar.Agenda?.Data || "",
                horario: consultaParaCancelar.Time || consultaParaCancelar.Agenda?.Horario || "",
                id: consultaParaCancelar.Id,
                Id: consultaParaCancelar.Id,
                pacienteId: consultaParaCancelar.PacienteId || consultaParaCancelar.Paciente?.Id,
                Paciente: consultaParaCancelar.Paciente,
                psicologoId: consultaParaCancelar.PsicologoId || consultaParaCancelar.Psicologo?.Id,
                Psicologo: consultaParaCancelar.Psicologo,
                paciente: consultaParaCancelar.Paciente,
                psicologo: {
                  nome: userBasic.user?.Nome || "Psicólogo",
                },
              }}
            />
          )}

          {/* Modal de cancelamento - Mobile */}
          {consultaParaCancelar && isDesktop === false && (
            <ModalCancelarSessaoMobile
              open={showModalCancelar}
              onClose={() => {
                setShowModalCancelar(false);
                setConsultaParaCancelar(null);
              }}
              onConfirm={handleCancelarConsulta}
              consulta={{
                data: consultaParaCancelar.Date || consultaParaCancelar.Agenda?.Data || "",
                horario: consultaParaCancelar.Time || consultaParaCancelar.Agenda?.Horario || "",
                id: consultaParaCancelar.Id,
                Id: consultaParaCancelar.Id,
                pacienteId: consultaParaCancelar.PacienteId || consultaParaCancelar.Paciente?.Id,
                Paciente: consultaParaCancelar.Paciente,
                psicologoId: consultaParaCancelar.PsicologoId || consultaParaCancelar.Psicologo?.Id,
                Psicologo: consultaParaCancelar.Psicologo,
                paciente: consultaParaCancelar.Paciente,
                psicologo: {
                  nome: userBasic.user?.Nome || "Psicólogo",
                },
              }}
            />
          )}
        </main>
      </div>
    </motion.div>
  );
}