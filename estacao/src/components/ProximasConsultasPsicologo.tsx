"use client";
import React, { useState, useEffect, useMemo } from "react";
import ConsultaModalMobile from "./ConsultaModalMobile";
import ConsultaModalDesk from "./ConsultaModalDesk";
import ModalCancelarSessaoDesk from "./ModalCancelarSessaoDesk";
import ModalCancelarSessaoMobile from "./ModalCancelarSessaoMobile";
import ModalReagendar from "./ModalReagendar";
import { useRouter } from "next/navigation";
import { useSessaoConsulta, type ConsultaSessao } from "../hooks/useSessaoConsulta";
import { formatarDataHora } from "../utils/formatarDataHora"; 
import { getContextualAvatar } from "@/utils/avatarUtils";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import { motion } from "framer-motion";
import Image from "next/image";
import { ConsultaApi } from "@/types/consultasTypes";
import type { ProximasConsultas as ProximasConsultaType } from "@/types/psicologoTypes";
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import { extractScheduledAtFromNormalized, scheduledAtToTimestamp } from "@/utils/reservaSessaoUtils";
import { shouldEnableEntrarConsulta } from "@/utils/consultaTempoUtils";
import { useReservaSessaoData } from "@/hooks/useReservaSessaoData";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

 
import {
  onConsultationStarted,
  onConsultationEnded,
  onConsultationStartingSoon,
  onConsultationEndingSoon,
  onConsultationCancelled,
  onConsultationCancelledByPatient,
  onConsultationCancelledByPsychologist,
  onConsultationInactivity,
  offConsultationInactivity,
  onConsultationStatusChanged,
  offConsultationStatusChanged,
  ConsultationEventData,
  getSocket,
  joinConsultation,
} from "../lib/socket";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";

export interface ProximasConsultasProps {
  consultas: ConsultaApi | ProximasConsultaType | null;
  futuras?: ConsultaApi[];
  role?: "paciente" | "psicologo";
  // Oculta botões/links de "Ver perfil"
  hidePerfil?: boolean;
} 

export default function ProximaConsultaPsicologo({ consultas = null, role = "paciente", hidePerfil }: ProximasConsultasProps) {
  const router = useRouter();

  // Garante que consultas seja tratado como objeto
  const next = consultas && typeof consultas === 'object' ? consultas : undefined;
  const normalized = next ? normalizeConsulta(next as unknown as GenericObject) : undefined;

  console.log('DEBUG ProximaConsultaPsicologo consultas cards:', consultas);

  // Prefixo de rota conforme o perfil atual
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const effectiveRole: "paciente" | "psicologo" = role ?? (
    pathname.startsWith('/painel-psicologo') ? 'psicologo' : 'paciente'
  );
  const basePrefix = effectiveRole === "psicologo" ? "/painel-psicologo" : "/painel";

  // Deriva dados de cabeçalho conforme o papel

  // Avatar e nome do paciente (se papel for psicólogo)
  const headerNome = effectiveRole === "psicologo"
    ? obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado"
    : obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado";

  const headerAvatarUrl = getContextualAvatar(
    effectiveRole === "psicologo",
    normalized?.psicologo,
    normalized?.paciente
  );

  const perfilHref = effectiveRole === "psicologo"
    ? (normalized?.pacienteId ? `${basePrefix}/paciente/${normalized.pacienteId}` : undefined)
    : (normalized?.psicologoId ? `${basePrefix}/psicologo/${normalized.psicologoId}` : undefined);

  const shouldShowPerfil = !hidePerfil && Boolean(perfilHref);

  // Usa hook centralizado para acessar ReservaSessao (deve vir antes do useMemo que o usa)
  const { scheduledAt: scheduledAtFromReserva } = useReservaSessaoData({
    normalized,
    consultationId: normalized?.id ? String(normalized.id) : undefined
  });

  // Prepara os dados para useSessaoConsulta no formato esperado
  // IMPORTANTE: Inclui ReservaSessao com ScheduledAt como fonte da verdade
  const consultaSessaoData: ConsultaSessao = useMemo(() => {
    if (!normalized) return {};
    
    return {
      Date: normalized.date,
      Time: normalized.time,
      Agenda: (() => {
        const agendaRaw = normalized.raw?.Agenda;
        if (agendaRaw && typeof agendaRaw === 'object' && agendaRaw !== null && 'Data' in agendaRaw && 'Horario' in agendaRaw) {
          const agenda = agendaRaw as { Data?: string; Horario?: string };
          return {
            Data: typeof agenda.Data === 'string' ? agenda.Data : normalized.date,
            Horario: typeof agenda.Horario === 'string' ? agenda.Horario : normalized.time
          };
        }
        return {
          Data: normalized.date,
          Horario: normalized.time
        };
      })(),
      ReservaSessao: scheduledAtFromReserva ? {
        ScheduledAt: scheduledAtFromReserva
      } : undefined
    };
  }, [normalized, scheduledAtFromReserva]);

  // Ajuste: pega os dados da próxima consulta do objeto next
  // Adapta para o type ConsultaApi
  const sessaoConsulta = useSessaoConsulta(consultaSessaoData);

  // Valida se a consulta é futura ou está em andamento usando timezone de Brasília
  // Inclui consultas em andamento que estão dentro da janela de 1 hora
  const isConsultaFutura = useMemo(() => {
    if (!next || !normalized?.date || !normalized?.time) return false;
    
    try {
      // Extrai apenas a data no formato yyyy-mm-dd
      const dateOnly = normalized.date.split('T')[0].split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
      
      // Usa timezone de Brasília para comparação
      const agoraBr = dayjs().tz('America/Sao_Paulo');
      const dataAtualStr = agoraBr.format('YYYY-MM-DD');
      const horaAtualBr = agoraBr.format('HH:mm');
      const agoraTimestamp = agoraBr.valueOf();
      
      // 🎯 REGRA: Verifica se a consulta está em andamento usando ScheduledAt (60 minutos)
      const statusConsulta = normalized.raw?.Status || normalized.status;
      if (statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento') {
        let inicioConsulta: number | null = null;
        
        // Prioriza ScheduledAt da ReservaSessao usando função helper type-safe
        const scheduledAt = extractScheduledAtFromNormalized(normalized);
        if (scheduledAt) {
          inicioConsulta = scheduledAtToTimestamp(scheduledAt);
        }
        
        // Fallback: usa date/time se ScheduledAt não estiver disponível
        if (!inicioConsulta && normalized.time) {
          const [hh, mm] = normalized.time.split(':').map(Number);
          inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
        }
        
        if (inicioConsulta) {
          const fimConsulta = inicioConsulta + (60 * 60 * 1000); // 60 minutos
          
          // Mostra se estiver dentro da janela de 60 minutos
          if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
            return true;
          } else {
            // Passou de 60 minutos, não mostra
            return false;
          }
        }
      }
      
      // Para consultas não em andamento, aplica a lógica original
      // Compara primeiro a data
      if (dateOnly < dataAtualStr) {
        // Data passada, não é válida
        return false;
      } else if (dateOnly > dataAtualStr) {
        // Data futura, é válida
        return true;
      } else {
        // Se é o mesmo dia, compara o horário
        // Só mostra se o horário da consulta ainda não passou
        return normalized.time > horaAtualBr;
      }
    } catch {
      // Em caso de erro, confia no backend (se next existe, é válida)
      return true;
    }
  }, [next, normalized]);

  // Mostra o card se houver próxima consulta e ela for futura OU se não houver consulta atual ativa
  // Isso garante que sempre mostre a próxima consulta quando não houver consulta ativa
  const mostrarCard = next && (isConsultaFutura || true); // Sempre mostra se houver next, deixando a validação de tempo para o componente ConsultaAtualPsicologo

  // Hooks e estados
  const {
    contador,
    mostrarSessao,
    sessaoAtiva,
    sessaoEncerrada,
  } = sessaoConsulta;

  const [showModal, setShowModal] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [showModalCancelarMobile, setShowModalCancelarMobile] = useState(false);
  const [showModalReagendar, setShowModalReagendar] = useState(false);

  // Estados para status do socket
  const [socketStatus, setSocketStatus] = useState<ConsultationEventData["status"] | null>(null);
  
  // Hook para verificar/gerar tokens
  const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  
  // Obtém o ID do usuário logado para registrar presença
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";

  // Atualiza frases e botões conforme status do socket
  useEffect(() => {
    if (!normalized?.id) return;

    // Limpa listeners antigos ao desmontar
    return () => {
      // Não há método off no socket atual, mas se houver, adicione aqui
    };
  }, [normalized?.id]);

  useEffect(() => {
    if (!normalized?.id) return;

    const idStr = normalized?.id ? String(normalized.id) : undefined;
    if (!idStr) return;

    // Função para mapear status do backend para status do frontend
    const mapStatusToFrontend = (status: string): ConsultationEventData["status"] | null => {
      const statusValue = String(status || "").toLowerCase();
      if (statusValue.includes("cancel") || statusValue.includes("naocompareceu") || statusValue === "deferido") {
        return "Cancelado";
      }
      if (statusValue.includes("conclu") || statusValue.includes("realiz")) {
        return "Concluido";
      }
      if (statusValue === "andamento" || statusValue === "emandamento") {
        return "started";
      }
      if (statusValue === "cancelled_by_patient") return "cancelled_by_patient";
      if (statusValue === "cancelled_by_psychologist") return "cancelled_by_psychologist";
      return null;
    };

    onConsultationStartingSoon(() => {
      setSocketStatus("startingSoon");
    }, idStr);

    onConsultationStarted(() => {
      setSocketStatus("started");
    }, idStr);

    onConsultationEndingSoon(() => {
      setSocketStatus("endingSoon");
    }, idStr);

    onConsultationEnded(() => {
      setSocketStatus("Concluido");
    }, idStr);

    onConsultationCancelled(() => {
      setSocketStatus("Cancelado");
    }, idStr);

    onConsultationCancelledByPatient(() => {
      setSocketStatus("cancelled_by_patient");
    }, idStr);

    onConsultationCancelledByPsychologist(() => {
      setSocketStatus("cancelled_by_psychologist");
    }, idStr);

    onConsultationInactivity(() => {
      setSocketStatus("Cancelado");
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-sessao', idStr] });
      queryClient.invalidateQueries({ queryKey: ['consulta', idStr] });
    }, idStr);

    // Listener para mudanças de status gerais (ex: cancelamento automático)
    onConsultationStatusChanged((data) => {
      const mappedStatus = mapStatusToFrontend(data.status);
      if (mappedStatus) {
        setSocketStatus(mappedStatus);
        // Invalida queries para atualizar em tempo real
        queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
        queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
        queryClient.invalidateQueries({ queryKey: ['reserva-sessao', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consulta', data.consultationId] });
      }
    }, idStr);

    return () => {
      const socket = getSocket();
      if (!socket) return;
      socket.off(`consultation:${idStr}`);
      offConsultationStatusChanged(idStr);
      offConsultationInactivity(idStr);
    };
  }, [normalized?.id]);

  // Frase e estado do botão conforme o status do socket
  let fraseSessao = "";
  let mostrarContador = false;
  let contadorSessao = contador;
  let botaoEntrarDesabilitado = true;

  const statusBase =
    socketStatus ||
    (normalized?.raw as { Status?: string; status?: string; ReservaSessao?: { Status?: string; status?: string } })?.Status ||
    (normalized?.raw as { Status?: string; status?: string; ReservaSessao?: { Status?: string; status?: string } })?.status ||
    (normalized?.raw as { ReservaSessao?: { Status?: string; status?: string } })?.ReservaSessao?.Status ||
    (normalized?.raw as { ReservaSessao?: { Status?: string; status?: string } })?.ReservaSessao?.status ||
    normalized?.status ||
    null;

  // 🎯 Verifica se pode entrar na sessão baseado no ScheduledAt e status
  const podeEntrarNaSessao = useMemo(() => {
    return shouldEnableEntrarConsulta({
      scheduledAt: scheduledAtFromReserva ?? null,
      date: normalized?.date ?? null,
      time: normalized?.time ?? null,
      status: statusBase,
    });
  }, [normalized?.date, normalized?.time, scheduledAtFromReserva, statusBase]);

  if (socketStatus === "startingSoon") {
    fraseSessao = "Sua sessão inicia em";
    mostrarContador = true;
    botaoEntrarDesabilitado = true;
  } else if (socketStatus === "started") {
    fraseSessao = "Sua sessão já começou há";
    mostrarContador = true;
    botaoEntrarDesabilitado = false;
  } else if (socketStatus === "endingSoon") {
    fraseSessao = "Sua sessão está encerrando em breve.";
    mostrarContador = false;
    botaoEntrarDesabilitado = false;
  } else if (socketStatus === "Concluido") {
    fraseSessao = "Sua sessão foi encerrada.";
    mostrarContador = false;
    botaoEntrarDesabilitado = true;
  } else if (socketStatus === "Cancelado") {
    fraseSessao = "Sua sessão foi cancelada.";
    mostrarContador = false;
    botaoEntrarDesabilitado = true;
  } else if (socketStatus === "cancelled_by_patient") {
    fraseSessao = "Consulta cancelada por ausência do paciente.";
    mostrarContador = false;
    botaoEntrarDesabilitado = true;
  } else if (socketStatus === "cancelled_by_psychologist") {
    fraseSessao = "Psicólogo ausente. Consulta recreditada.";
    mostrarContador = false;
    botaoEntrarDesabilitado = true;
  } else if (mostrarSessao && !sessaoAtiva && !sessaoEncerrada) {
    fraseSessao = `Sua sessão inicia em`;
    mostrarContador = true;
    botaoEntrarDesabilitado = true;
  } else if (mostrarSessao && sessaoAtiva && !sessaoEncerrada) {
    fraseSessao = `Sua sessão já começou há`;
    mostrarContador = true;
    botaoEntrarDesabilitado = false;
  } else if (mostrarSessao && sessaoEncerrada) {
    fraseSessao = `Sua sessão foi encerrada por inatividade.`;
    mostrarContador = false;
    contadorSessao = "";
    botaoEntrarDesabilitado = true;
  } else {
        // Fora do intervalo dos 10 minutos antes e depois
        if (normalized?.date && normalized?.time) {
          // Calcular diferença em ms entre agora e data/hora da consulta
          const dataObj = new Date(normalized.date);
          const [hora, minuto] = String(normalized.time).split(":");
          dataObj.setHours(Number(hora), Number(minuto), 0, 0);
          const agora = new Date();
          const diffMs = dataObj.getTime() - agora.getTime();
          // Remover botão reagendar quando faltar 10 minutos ou menos
          if (diffMs > 48 * 60 * 60 * 1000) {
            // Mais de 48h: pode reagendar
          } else if (diffMs > 10 * 60 * 1000 && diffMs <= 24 * 60 * 60 * 1000) {
            // Entre 24h e 10min antes da consulta
            botaoEntrarDesabilitado = true;
          } else if (diffMs > 0 && diffMs <= 10 * 60 * 1000) {
            // Menos de 10 minutos para a consulta
            botaoEntrarDesabilitado = true;
          }
        }
      }

  const botaoEntrarFinal = !podeEntrarNaSessao;

  // Novo: verifica se não há consulta futura
  if (!next) {
    return (
      <motion.section
        className="w-full max-w-full md:max-w-[580px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.p
          className="text-gray-500 font-sans text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Você ainda não possui nenhuma consulta.
        </motion.p>
      </motion.section>
    );
  }
  
  async function handleEntrarNaSessao() {
    if (!normalized?.id || isProcessingEntry || isCheckingTokens) return;
    
    setIsProcessingEntry(true);
    
    try {
      const consultaId = String(normalized.id);
      
      // 🎯 REGISTRA PRESENÇA ANTES DE REDIRECIONAR
      // Cada usuário (paciente ou psicólogo) registra sua própria presença
      if (loggedUserId) {
        try {
          console.log('📹 [ProximasConsultasPsicologo] Registrando presença do psicólogo:', {
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Psychologist'
          });
          
          await joinConsultation({
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Psychologist'
          });
          
          console.log('✅ [ProximasConsultasPsicologo] Presença do psicólogo registrada com sucesso');
        } catch (presencaError) {
          console.error('⚠️ [ProximasConsultasPsicologo] Erro ao registrar presença (não bloqueante):', presencaError);
          // Não bloqueia o fluxo se houver erro ao registrar presença
        }
      } else {
        console.warn('⚠️ [ProximasConsultasPsicologo] loggedUserId não disponível, pulando registro de presença');
      }
      
      // Verifica/gera tokens antes de entrar
      const success = await checkAndGenerateTokens(consultaId);
      
      if (success) {
        // Redireciona para a sala
        const reservaSessao = normalized.raw?.ReservaSessao as { AgoraChannel?: string } | undefined;
        const channel = reservaSessao?.AgoraChannel || `sala_${consultaId}`;
        router.push(`${basePrefix}/room/${consultaId}/${channel}`);
      } else {
        console.error('[ProximasConsultasPsicologo] Falha ao gerar tokens');
      }
    } catch (error) {
      console.error('[ProximasConsultasPsicologo] Erro ao entrar na sessão:', error);
    } finally {
      setIsProcessingEntry(false);
    }
  }

  return (
    <motion.section
      className="w-full max-w-full md:max-w-[580px]"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Modais */}
      <ConsultaModalMobile
        open={showModal}
        onClose={() => setShowModal(false)}
        consulta={{
          data: normalized?.date ? String(normalized.date) : "",
          horario: normalized?.time ? String(normalized.time) : "",
          id: normalized?.id ? String(normalized.id) : undefined,
          pacienteId: normalized?.pacienteId ? String(normalized.pacienteId) : undefined,
          psicologoId: normalized?.psicologoId ? String(normalized.psicologoId) : undefined,
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
            avatarUrl: normalized?.paciente?.imageUrl,
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
            avatarUrl: normalized?.psicologo?.imageUrl,
          },
  }}
        botaoEntrarDesabilitado={botaoEntrarFinal}
      />
      <ModalCancelarSessaoMobile
        open={showModalCancelarMobile}
        onClose={() => setShowModalCancelarMobile(false)}
        onConfirm={() => {
          setShowModalCancelarMobile(false);
          // Adicione aqui a lógica para confirmar o cancelamento, se necessário
        }}
        consulta={next}
      />
      <ModalReagendar
        isOpen={showModalReagendar}
        onClose={() => setShowModalReagendar(false)}
        consulta={{
          data: normalized?.date ? String(normalized.date) : "",
          horario: normalized?.time ? String(normalized.time) : "",
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
          },
        }}
  consultaIdAtual={normalized?.id ? String(normalized.id) : ""}
      />
      <ConsultaModalDesk
        open={showModal}
        onClose={() => setShowModal(false)}
        onEntrar={handleEntrarNaSessao}
        consulta={{
          data: normalized?.date || "",
          horario: normalized?.time || "",
          id: normalized?.id ? String(normalized.id) : undefined,
          pacienteId: normalized?.pacienteId ? String(normalized.pacienteId) : undefined,
          psicologoId: normalized?.psicologoId ? String(normalized.psicologoId) : undefined,
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
            avatarUrl: normalized?.paciente?.imageUrl,
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
            avatarUrl: normalized?.psicologo?.imageUrl,
          },
  }}
        botaoEntrarDesabilitado={botaoEntrarFinal}
      />
      <ModalCancelarSessaoDesk
        open={showModalCancelar}
        onClose={() => setShowModalCancelar(false)}
        onConfirm={() => {
          setShowModalCancelar(false);
        }}
        consulta={next}
      />

      {!mostrarCard ? (
        <motion.p
          className="text-gray-500 text-center font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Você ainda não possui nenhuma consulta.
        </motion.p>
      ) : (
        <motion.div
          className="relative bg-white shadow rounded-xl w-full max-w-full sm:max-w-[540px] sm:w-[540px] sm:h-[180px] mb-6 min-h-[180px] sm:min-h-[180px] border-0 p-4 sm:p-6 sm:flex sm:flex-col sm:justify-between font-fira-sans"
          style={{ opacity: 1, borderRadius: 12 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Tag de status no canto superior direito */}
          {(() => {
            // Obtém o status da consulta
            const reservaSessaoRaw = normalized?.raw?.ReservaSessao;
            const reservaSessao = reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw)
              ? reservaSessaoRaw as { Status?: string; status?: string }
              : null;
            const statusReservaSessao = reservaSessao?.Status || reservaSessao?.status;
            const statusRaw = statusReservaSessao || normalized?.raw?.Status || normalized?.status || 'Reservado';
            const statusConsulta = typeof statusRaw === 'string' ? statusRaw : String(statusRaw);
            
            // Verifica se a consulta é futura (ainda não aconteceu)
            let isConsultaFutura = false;
            if (normalized?.date && normalized?.time) {
              try {
                const dateOnly = normalized.date.split('T')[0].split(' ')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                  const agoraBr = dayjs().tz('America/Sao_Paulo');
                  const agoraTimestamp = agoraBr.valueOf();
                  const [hh, mm] = normalized.time.split(':').map(Number);
                  const inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
                  
                  // Consulta é futura se ainda não começou
                  isConsultaFutura = inicioConsulta > agoraTimestamp;
                }
              } catch {
                // Em caso de erro, assume que não é futura
                isConsultaFutura = false;
              }
            }
            
            // 🎯 REGRA: Verifica se está em andamento usando ScheduledAt da ReservaSessao (60 minutos)
            // Se status for EmAndamento/Andamento e dentro de 60 minutos do ScheduledAt, mostra "Ao vivo"
            if ((statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento')) {
              let inicioConsulta: number | null = null;
              
              // Prioriza ScheduledAt da ReservaSessao
              if (reservaSessao && typeof reservaSessao === 'object' && 'ScheduledAt' in reservaSessao) {
                const reservaSessaoComScheduledAt = reservaSessao as { ScheduledAt?: string };
                if (reservaSessaoComScheduledAt.ScheduledAt) {
                  try {
                    // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
                    const scheduledAtStr = reservaSessaoComScheduledAt.ScheduledAt;
                    const [datePart, timePart] = scheduledAtStr.split(' ');
                    if (datePart && timePart) {
                      const [year, month, day] = datePart.split('-').map(Number);
                      const [hour, minute, second = 0] = timePart.split(':').map(Number);
                      const inicioConsultaDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`, 'America/Sao_Paulo');
                      inicioConsulta = inicioConsultaDate.valueOf();
                    }
                  } catch (error) {
                    console.error('[ProximasConsultasPsicologo] Erro ao parsear ScheduledAt:', error);
                  }
                }
              }
              
              // Fallback: usa date/time se ScheduledAt não estiver disponível
              if (!inicioConsulta && normalized?.date && normalized?.time) {
                const dateOnly = normalized.date.split('T')[0].split(' ')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                  const [hh, mm] = normalized.time.split(':').map(Number);
                  inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
                }
              }
              
              if (inicioConsulta) {
                const agoraBr = dayjs().tz('America/Sao_Paulo');
                const agoraTimestamp = agoraBr.valueOf();
                const fimConsulta = inicioConsulta + (60 * 60 * 1000); // 60 minutos
                
                if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
                  // 🎯 Mostra tag "Ao vivo" quando consulta está em andamento
                  // Mantém status "Agendada" conforme solicitado
                  return (
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6E9FF] text-[#6D75C0] shadow">
                        Agendada
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#2E7D32] shadow">
                        Ao vivo
                      </span>
                    </div>
                  );
                }
              }
            }
            
            // Se a consulta é futura, não mostra status de "não compareceu" ou outros status que só fazem sentido após a consulta
            // Para consultas futuras, mostra apenas "Reservado" ou "Agendada"
            if (isConsultaFutura) {
              const statusInvalidosParaFuturas = [
                'PacienteNaoCompareceu',
                'Paciente Não Compareceu',
                'PsicologoNaoCompareceu',
                'Psicólogo Não Compareceu',
                'Cancelled_no_show',
                'cancelled_no_show',
                'Ausente',
                'Realizada',
                'Concluido',
                'Concluído'
              ];
              
              const statusLower = statusConsulta.toLowerCase();
              const isStatusInvalido = statusInvalidosParaFuturas.some(invalido => 
                statusLower.includes(invalido.toLowerCase()) || 
                statusConsulta === invalido
              );
              
              if (isStatusInvalido) {
                // Para consultas futuras com status inválido, força "Reservado"
                const tagInfo = getStatusTagInfo('Reservado');
                return (
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
                    {tagInfo.texto}
                  </span>
                );
              }
            }
            
            // 🎯 REGRA: Verifica cancelamento por inatividade (10 minutos após início)
            // Busca informações de cancelamento da tabela CancelamentoSessao
            const cancelamentoSessao = normalized?.raw?.CancelamentoSessao;
            const cancelamento = Array.isArray(cancelamentoSessao) && cancelamentoSessao.length > 0 
              ? cancelamentoSessao[0] 
              : cancelamentoSessao;
            
            // Mapeia tipo de cancelamento para texto
            const tipoCancelamentoMap: Record<string, string> = {
              'PACIENTE': 'Cancelada pelo paciente',
              'Psicologo': 'Cancelada pelo psicólogo',
              'PSICOLOGO': 'Cancelada pelo psicólogo',
              'Sistema': 'Cancelada pelo sistema',
              'SISTEMA': 'Cancelada pelo sistema',
            };
            
            // Mapeia status de cancelamento para texto
            const statusCancelamentoMap: Record<string, string> = {
              'EmAnalise': 'Em análise',
              'Deferido': 'Cancelada',
              'Indeferido': 'Cancelamento indeferido',
              'Cancelado': 'Cancelada',
            };
            
            // Verifica se há cancelamento na tabela CancelamentoSessao
            if (cancelamento && typeof cancelamento === 'object' && 'Status' in cancelamento) {
              const cancelamentoObj = cancelamento as { Status?: string; Tipo?: string };
              const statusCancelamento = cancelamentoObj.Status;
              const tipoCancelamento = cancelamentoObj.Tipo;
              
              // Mostra tag de cancelada se o status for Deferido ou Cancelado
              if (statusCancelamento === 'Deferido' || statusCancelamento === 'Cancelado') {
                // 🎯 Determina o texto baseado no Tipo de cancelamento (Paciente, Psicologo ou Sistema/ambos)
                let textoCancelamento = 'Cancelada';
                
                if (tipoCancelamento === 'Paciente' || tipoCancelamento === 'PACIENTE') {
                  textoCancelamento = 'Paciente não compareceu';
                } else if (tipoCancelamento === 'Psicologo' || tipoCancelamento === 'PSICOLOGO') {
                  textoCancelamento = 'Psicólogo não compareceu';
                } else if (tipoCancelamento === 'Sistema' || tipoCancelamento === 'SISTEMA') {
                  // Sistema = ambos não compareceram
                  textoCancelamento = 'Consulta cancelada';
                } else if (tipoCancelamento && tipoCancelamentoMap[tipoCancelamento]) {
                  textoCancelamento = tipoCancelamentoMap[tipoCancelamento];
                } else {
                  textoCancelamento = statusCancelamentoMap[statusCancelamento] || 'Cancelada';
                }
                
                return (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE5E5] text-[#C53030] shadow z-10">
                    {textoCancelamento}
                  </span>
                );
              }
              
              // Mostra tag de em análise se o status for EmAnalise
              if (statusCancelamento === 'EmAnalise') {
                return (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E6] text-[#E65100] shadow z-10">
                    Cancelamento em análise
                  </span>
                );
              }
            }
            
            // Usa função centralizada para obter informações do status
            const tagInfo = getStatusTagInfo(statusConsulta);
            
            return (
              <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
                {tagInfo.texto}
              </span>
            );
          })()}
          
          {/* Cabeçalho removido - título está acima do card */}

          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex gap-4 items-center min-w-0">
              {/* Avatar - igual ao card do paciente */}
              <div className="relative shrink-0">
                <Image
                  src={headerAvatarUrl || "/assets/avatar-placeholder.svg"}
                  alt={effectiveRole === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border border-[#E6E9FF]"
                />
              </div>
              {/* Informações: nome, data/hora, link perfil - igual ao card do paciente */}
              <div className="flex flex-col flex-1 gap-1 min-w-0">
                <span className="text-[#232A5C] font-semibold text-base leading-5 truncate flex items-center gap-1.5">
                  <Image src="/icons/avatar.svg" alt="Usuário" width={16} height={16} className="shrink-0" />
                  {headerNome}
                </span>
                <span className="text-[#6B7280] text-sm fira-sans flex items-center gap-1.5">
                  <Image src="/icons/calendar.svg" alt="Calendário" width={16} height={16} className="shrink-0" />
                  {formatarDataHora(normalized?.date, normalized?.time)}
                </span>
                {shouldShowPerfil && (
                  <button
                    onClick={() => {
                      if (perfilHref) router.push(perfilHref);
                    }}
                    className="text-left text-[#6D75C0] hover:underline text-sm font-medium fira-sans cursor-pointer mt-1"
                  >
                    Ver perfil
                  </button>
                )}
              </div>
            </div>

            {fraseSessao && (
              <div className="flex items-center gap-1 text-[#6D75C0] font-medium text-xs bg-[#F3F6FB] rounded px-2 py-1 shadow-sm ml-auto mt-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="whitespace-nowrap">
                  {fraseSessao}
                  {mostrarContador && (
                    <span className="ml-1 text-[#6D75C0] font-bold">
                      {contadorSessao}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Botões: Ver detalhes e Entrar na sessão lado a lado à direita - igual ao card do paciente */}
          <div className="flex flex-row gap-3 w-full mt-4 sm:mt-auto pt-2 justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
            >
              Ver detalhes
            </button>
            <button
              disabled={!podeEntrarNaSessao || isProcessingEntry || isCheckingTokens}
              onClick={handleEntrarNaSessao}
              className={`min-h-[44px] h-11 rounded-[6px] px-4 text-sm font-medium transition whitespace-nowrap ${
                podeEntrarNaSessao && !isProcessingEntry && !isCheckingTokens
                  ? 'bg-[#232A5C] hover:bg-[#232A5C]/90 text-white cursor-pointer'
                  : 'bg-[#D0D0D0] text-[#808080] cursor-not-allowed'
              }`}
            >
              {isProcessingEntry || isCheckingTokens ? 'Aguarde...' : 'Entrar na sessão'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}