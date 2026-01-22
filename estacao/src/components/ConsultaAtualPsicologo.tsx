"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ConsultaModal from "./ConsultaModal";
import ModalCancelarSessao from "./ModalCancelarSessao";
import { useSessaoConsulta, type ConsultaSessao } from "../hooks/useSessaoConsulta";
import { useContadorGlobal } from "@/hooks/useContadorGlobal";
import { getContextualAvatar } from "@/utils/avatarUtils";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import { useReservaSessaoData } from "@/hooks/useReservaSessaoData";
import type { ProximasConsultas as ProximasConsultaType } from "@/types/psicologoTypes";
import { ConsultaApi } from "@/types/consultasTypes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { calcularTempoRestante60Minutos, isConsultaDentro60MinutosComScheduledAt } from "@/utils/consultaTempoUtils";
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
  onSessionStatusUpdated,
  offSessionStatusUpdated,
  ensureSocketConnection,
  getSocket,
} from "../lib/socket";
import { queryClient } from "@/lib/queryClient";
import { ConsultaCard } from "@/lib/consultas/ConsultaCard";

type ConsultationStatus = 
  | "startingSoon" 
  | "started" 
  | "endingSoon" 
  | "Concluido"
  | "Cancelado"
  | "cancelled_by_patient"
  | "cancelled_by_psychologist";

export interface ConsultaAtualPsicologoProps {
  consulta: ProximasConsultaType | null;
  hidePerfil?: boolean;
}

interface ButtonState {
  mostrarBotaoEntrar: boolean;
  mostrarBotaoSuporte: boolean;
  botaoEntrarDesabilitado: boolean;
}

interface SessionState {
  fraseSessao: string;
  mostrarContador: boolean;
  contadorSessao: string;
  buttons: ButtonState;
}

const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
  text: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  },
  card: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} as const;

export default function ConsultaAtualPsicologo({ consulta: consultaProp = null, hidePerfil = false }: ConsultaAtualPsicologoProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showModalCancelar, setShowModalCancelar] = useState<boolean>(false);
  const [socketStatus, setSocketStatus] = useState<ConsultationStatus | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'scheduled' | 'active' | 'finished' | null>(null);
  const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);

  // Estado para dados da consulta selecionada para o modal
  interface ConsultaModalData {
    data?: string;
    horario?: string;
    psicologo?: {
      nome?: string;
      id?: string;
      avatarUrl?: string;
      Image?: { Url?: string }[];
    };
    paciente?: {
      nome?: string;
      id?: string;
      avatarUrl?: string;
      Image?: { Url?: string }[];
    };
  }
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaModalData | null>(null);

  // Função para extrair apenas a data no formato yyyy-mm-dd
  function extractDateOnly(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const dateOnly = dateStr.split('T')[0].split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    return null;
  }

  // Normaliza a consulta
  const normalized = useMemo(() => {
    if (!consultaProp) return null;
    const normalized = normalizeConsulta(consultaProp as unknown as GenericObject);
    // Debug: Log do ID extraído
    console.log('[ConsultaAtualPsicologo] Dados normalizados:', {
      id: normalized.id,
      rawId: consultaProp?.Id,
      consultaProp: consultaProp
    });
    return normalized;
  }, [consultaProp]);

  // Usa hook centralizado para acessar ReservaSessao
  const { scheduledAt: scheduledAtFromReserva, reservaSessao: reservaSessaoData } = useReservaSessaoData({
    normalized,
    consultationId: normalized?.id ? String(normalized.id) : undefined
  });

  // Verifica se a consulta está dentro do período de 60 minutos usando ScheduledAt
  const estaDentroDoPeriodo: boolean = useMemo(() => {
    // Se o status da sessão no Redis é 'finished', nunca considera dentro do período
    if (sessionStatus === 'finished') {
      return false;
    }
    
    if (!normalized) return false;
    
    // Se o status da sessão no Redis é 'active', verifica se ainda está dentro dos 60 minutos
    if (sessionStatus === 'active') {
      return isConsultaDentro60MinutosComScheduledAt(
        scheduledAtFromReserva,
        normalized.date,
        normalized.time
      );
    }
    
    // Fallback para cálculo local usando ScheduledAt
    return isConsultaDentro60MinutosComScheduledAt(
      scheduledAtFromReserva,
      normalized.date,
      normalized.time
    );
  }, [normalized, sessionStatus, scheduledAtFromReserva]);

  // Usa o contador global compartilhado em vez de criar um novo intervalo
  useContadorGlobal();

  // Recalcula o contador quando timestamp muda (atualizado pelo contador global)
  const contador50MinutosAtualizado = useMemo(() => {
    if (!normalized) return { tempoFormatado: '', estaDentroDoPeriodo: false };
    
    return calcularTempoRestante60Minutos(
      scheduledAtFromReserva,
      normalized.date,
      normalized.time
    );
  }, [normalized, scheduledAtFromReserva]);

  // Se o backend retornou a consulta, ela já foi validada como "em andamento"
  // Mostra APENAS se estiver dentro do período de 60 minutos
  const mostrarCard: boolean = useMemo(() => {
    if (!normalized || !consultaProp) return false;
    
    const dateOnly = extractDateOnly(normalized.date || '');
    if (!dateOnly || !normalized.time) return false;
    
    // Só mostra se estiver dentro dos 60 minutos
    return estaDentroDoPeriodo;
  }, [normalized, consultaProp, estaDentroDoPeriodo]);
  
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
      ReservaSessao: reservaSessaoData?.ScheduledAt ? {
        ScheduledAt: reservaSessaoData.ScheduledAt
      } : undefined
    };
  }, [normalized, reservaSessaoData]);
  
  const sessaoConsulta = useSessaoConsulta(consultaSessaoData);
  const { contador, mostrarSessao, sessaoAtiva, sessaoEncerrada } = sessaoConsulta;

  const basePrefix = "/painel-psicologo";
  
  const perfilHref = normalized?.pacienteId ? `${basePrefix}/paciente/${normalized.pacienteId}` : undefined;
  const shouldShowPerfil = !hidePerfil && Boolean(perfilHref);
  
  // Força atualização quando consulta em andamento passar de 60 minutos
  useEffect(() => {
    if (!normalized) return;
    
    const reservaSessao = normalized.raw?.ReservaSessao;
    const reservaSessaoTyped = reservaSessao && typeof reservaSessao === 'object' && !Array.isArray(reservaSessao)
      ? reservaSessao as { ScheduledAt?: string }
      : null;
    const scheduledAt = reservaSessaoTyped?.ScheduledAt;
    
    if (!scheduledAt && !normalized.date || !normalized.time) return;
    
    try {
      let inicioConsulta: number | null = null;
      
      if (scheduledAt) {
        const [datePart, timePart] = scheduledAt.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second = 0] = timePart.split(':').map(Number);
          const inicioConsultaDate = dayjs.tz(
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
            'America/Sao_Paulo'
          );
          inicioConsulta = inicioConsultaDate.valueOf();
        }
      }
      
      if (!inicioConsulta) {
        const dateOnly = extractDateOnly(normalized.date);
        if (!dateOnly) return;
        const [hh, mm] = normalized.time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
      
      if (inicioConsulta) {
        const fimConsulta = inicioConsulta + (60 * 60 * 1000); // 60 minutos
        const agoraTimestamp = dayjs().tz("America/Sao_Paulo").valueOf();
        const tempoRestante = fimConsulta - agoraTimestamp;
        
        if (tempoRestante > 0) {
          const timeoutId = setTimeout(() => {
            // Força atualização quando passar de 60 minutos
            queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
          }, tempoRestante);
          
          return () => clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      console.error('[ConsultaAtualPsicologo] Erro ao calcular timeout de 60 minutos:', error);
    }
  }, [normalized]);

  // Socket listeners
  useEffect(() => {
    if (!normalized?.id) return;

    const idStr = normalized.id ? String(normalized.id) : undefined;
    if (!idStr) return;

    ensureSocketConnection();

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

    onConsultationStatusChanged((data: { status: string; consultationId: string }) => {
      const statusValue = String(data.status || "").toLowerCase();
      let mappedStatus: ConsultationStatus | undefined;
      if (statusValue.includes("cancel") || statusValue.includes("naocompareceu") || statusValue === "deferido") {
        mappedStatus = "Cancelado";
      } else if (statusValue.includes("conclu") || statusValue.includes("realiz")) {
        mappedStatus = "Concluido";
      } else if (statusValue === "andamento" || statusValue === "emandamento") {
        mappedStatus = "started";
      } else if (statusValue === "cancelled_by_patient") {
        mappedStatus = "cancelled_by_patient";
      } else if (statusValue === "cancelled_by_psychologist") {
        mappedStatus = "cancelled_by_psychologist";
      }
      if (mappedStatus) {
        setSocketStatus(mappedStatus);
        // Invalida queries para atualizar em tempo real
        queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
        queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
        queryClient.invalidateQueries({ queryKey: ['reserva-sessao', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consulta', data.consultationId] });
      }
    }, idStr);

    onConsultationInactivity(() => {
      setSocketStatus("Cancelado");
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-sessao', idStr] });
      queryClient.invalidateQueries({ queryKey: ['consulta', idStr] });
    }, idStr);

    // Listener para eventos de status de sessão (Redis-based)
    onSessionStatusUpdated((data) => {
      if (data.consultationId === idStr) {
        setSessionStatus(data.status);
        // Invalida queries para atualizar em tempo real
        queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
        queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      }
    }, idStr);

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off(`consultation:${idStr}`);
      }
      offConsultationStatusChanged(idStr);
      offConsultationInactivity(idStr);
      offSessionStatusUpdated(idStr);
    };
  }, [normalized?.id]);

  // Calcula estado da sessão
  const sessionState: SessionState = useMemo(() => {
    let fraseSessao = "";
    let mostrarContador = false;
    let contadorSessao = contador;
    const buttons: ButtonState = {
      mostrarBotaoEntrar: false,
      mostrarBotaoSuporte: false,
      botaoEntrarDesabilitado: true,
    };

    // Verifica se passaram 10 minutos sem paciente ou psicólogo entrar
    if (normalized) {
      const reservaSessao = normalized.raw?.ReservaSessao;
      if (reservaSessao && typeof reservaSessao === 'object' && reservaSessao !== null) {
        const reservaSessaoTyped = reservaSessao as { ScheduledAt?: string | Date | null; PatientJoinedAt?: string | Date | null; PsychologistJoinedAt?: string | Date | null };
        const scheduledAt = reservaSessaoTyped.ScheduledAt as string | null | undefined;
        const patientJoinedAt = reservaSessaoTyped.PatientJoinedAt as string | Date | null | undefined;
        const psychologistJoinedAt = reservaSessaoTyped.PsychologistJoinedAt as string | Date | null | undefined;
        
        // Verifica se algum não entrou
        const algumNaoEntrou = !patientJoinedAt || !psychologistJoinedAt;
        
        if (scheduledAt && algumNaoEntrou) {
          try {
            // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
            const scheduledTime = dayjs.tz(scheduledAt, 'America/Sao_Paulo');
            const agora = dayjs.tz('America/Sao_Paulo');
            const diffMinutes = agora.diff(scheduledTime, 'minute');
            
            // Se passaram 10 minutos ou mais desde o horário agendado
            if (diffMinutes >= 10) {
              return {
                fraseSessao: "Sua sessão foi cancelada.",
                mostrarContador: false,
                contadorSessao: "",
                buttons: { ...buttons, mostrarBotaoSuporte: true },
              };
            }
          } catch (error) {
            console.error('[ConsultaAtualPsicologo] Erro ao verificar 10 minutos:', error);
          }
        }
      }
    }

    if (socketStatus === "startingSoon") {
      fraseSessao = "Sua sessão inicia em";
      mostrarContador = true;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = true;
    } else if (socketStatus === "started") {
      fraseSessao = "Sua sessão já começou há";
      mostrarContador = contador50MinutosAtualizado.estaDentroDoPeriodo;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = false;
    } else if (socketStatus === "endingSoon") {
      fraseSessao = "Sua sessão está encerrando em breve.";
      mostrarContador = false;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = false;
    } else if (socketStatus === "Concluido") {
      fraseSessao = "Sua sessão foi encerrada.";
      mostrarContador = false;
      buttons.mostrarBotaoSuporte = true;
    } else if (socketStatus === "Cancelado") {
      fraseSessao = "Sua sessão foi cancelada.";
      mostrarContador = false;
      buttons.mostrarBotaoSuporte = true;
    } else if (socketStatus === "cancelled_by_patient") {
      fraseSessao = "Consulta cancelada por ausência do paciente.";
      mostrarContador = false;
      buttons.mostrarBotaoSuporte = true;
    } else if (socketStatus === "cancelled_by_psychologist") {
      fraseSessao = "Psicólogo ausente. Consulta recreditada.";
      mostrarContador = false;
      buttons.mostrarBotaoSuporte = true;
    } else if (mostrarSessao && !sessaoAtiva && !sessaoEncerrada) {
      fraseSessao = "Sua sessão inicia em";
      mostrarContador = true;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = true;
    } else if (mostrarSessao && sessaoAtiva && !sessaoEncerrada) {
      fraseSessao = "Sua sessão já começou há";
      mostrarContador = contador50MinutosAtualizado.estaDentroDoPeriodo;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = false;
    } else if (mostrarSessao && sessaoEncerrada) {
      // Verifica se ambos entraram na sala (PatientJoinedAt e PsychologistJoinedAt preenchidos)
      if (normalized) {
        const reservaSessao = normalized.raw?.ReservaSessao;
        const ambosEntraram = reservaSessao && 
          typeof reservaSessao === 'object' && 
          reservaSessao !== null &&
          'PatientJoinedAt' in reservaSessao &&
          'PsychologistJoinedAt' in reservaSessao &&
          reservaSessao.PatientJoinedAt !== null &&
          reservaSessao.PsychologistJoinedAt !== null;
        
        // Se ambos entraram, não mostra mensagem de inatividade
        if (ambosEntraram) {
          fraseSessao = "Sua sessão já começou há";
          mostrarContador = contador50MinutosAtualizado.estaDentroDoPeriodo;
          buttons.mostrarBotaoEntrar = true;
          buttons.botaoEntrarDesabilitado = false;
        } else {
          // Se não entraram, mostra mensagem de inatividade
          fraseSessao = "Sua sessão foi encerrada por inatividade.";
          mostrarContador = false;
          contadorSessao = "";
          buttons.mostrarBotaoSuporte = true;
        }
      } else {
        fraseSessao = "Sua sessão foi encerrada por inatividade.";
        mostrarContador = false;
        contadorSessao = "";
        buttons.mostrarBotaoSuporte = true;
      }
    }

    // Para consulta em andamento, sempre permite entrar (não está nas 24h antes)
    if (!fraseSessao && normalized?.date && normalized?.time) {
      // Consulta em andamento: sempre permite entrar, não pode cancelar
      fraseSessao = "Sua sessão já começou há";
      mostrarContador = contador50MinutosAtualizado.estaDentroDoPeriodo;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = false;
    }

    // Estado padrão para consulta em andamento
    if (!fraseSessao) {
      fraseSessao = "Sua sessão já começou há";
      mostrarContador = contador50MinutosAtualizado.estaDentroDoPeriodo;
      buttons.mostrarBotaoEntrar = true;
      buttons.botaoEntrarDesabilitado = false;
    }

    // Usa o contador dos 60 minutos se estiver dentro do período
    const contadorFinal = contador50MinutosAtualizado.estaDentroDoPeriodo 
      ? contador50MinutosAtualizado.tempoFormatado 
      : contadorSessao;

    return {
      fraseSessao,
      mostrarContador,
      contadorSessao: contadorFinal,
      buttons,
    };
  }, [socketStatus, mostrarSessao, sessaoAtiva, sessaoEncerrada, contador, normalized, contador50MinutosAtualizado]);


  const handleEntrarNaConsulta = async () => {
    if (!sessionState.buttons.botaoEntrarDesabilitado && normalized?.id) {
      try {
        setIsProcessingEntry(true);
        // Extrai o ID diretamente do consultaProp primeiro (raw), se não tiver usa normalized
        const rawId = consultaProp?.Id || normalized.id;
        const consultaId = String(rawId);
        
        // Valida se o ID da consulta está presente
        if (!consultaId || consultaId.trim() === '' || consultaId === 'undefined' || consultaId === 'null') {
          console.error('[handleEntrarNaConsulta] ID da consulta inválido:', {
            normalizedId: normalized.id,
            rawId: rawId,
            consultaProp: consultaProp
          });
          toast.error('ID da consulta inválido. Por favor, tente novamente.');
          return;
        }

        console.log(`[handleEntrarNaConsulta] Iniciando acesso à consulta: ${consultaId}`, {
          normalizedId: normalized.id,
          rawId: rawId,
          consultaId: consultaId
        });

        // Verifica e gera tokens se necessário
        const tokensResult = await checkAndGenerateTokens(consultaId);

        if (!tokensResult) {
          console.error('[handleEntrarNaConsulta] Falha ao verificar tokens');
          toast.error('Não foi possível verificar os tokens da consulta. Tente novamente.');
          return;
        }

        // Verifica se ambos os tokens existem
        if (!tokensResult.patientTokenExists || !tokensResult.psychologistTokenExists) {
          console.error('[handleEntrarNaConsulta] Tokens não estão disponíveis:', {
            patientTokenExists: tokensResult.patientTokenExists,
            psychologistTokenExists: tokensResult.psychologistTokenExists,
          });
          toast.error('Os tokens da consulta ainda não estão disponíveis. Aguarde alguns instantes e tente novamente.');
          return;
        }

        console.log('[handleEntrarNaConsulta] Tokens verificados com sucesso, navegando para sessão:', {
          consultaId,
          route: `${basePrefix}/sessao/${consultaId}`,
        });
        router.push(`${basePrefix}/sessao/${consultaId}`);
      } catch (error) {
        console.error('[handleEntrarNaConsulta] Erro ao acessar consulta:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao acessar consulta';
        toast.error(errorMessage);
      } finally {
        setIsProcessingEntry(false);
      }
    }
  };

  const handleSuporte = () => {
    const mensagem = encodeURIComponent(
      "Olá, preciso de suporte técnico na Estação Terapia. Tenho dúvidas ou estou com problemas na plataforma."
    );
    window.open(`https://wa.me/5511960892131?text=${mensagem}`, "_blank");
  };

  // Função para abrir o modal de detalhes da consulta
  const handleAbrirModalConsulta = () => {
    if (normalized) {
      // Para o painel do psicólogo, sempre mostra o paciente
      const avatarPaciente = getContextualAvatar(true, normalized.psicologo, normalized.paciente);
      const avatarPsicologo = normalized.psicologo?.imageUrl || getContextualAvatar(false, normalized.psicologo, normalized.paciente);
      
      const consultaData: ConsultaModalData = {
        data: normalized.date || "",
        horario: normalized.time || "",
        // No painel do psicólogo, o paciente é o que deve ser exibido
        paciente: normalized.paciente ? {
          nome: normalized.paciente.nome || "",
          id: String(normalized.pacienteId || normalized.paciente.id || ""),
          avatarUrl: normalized.paciente.imageUrl || avatarPaciente,
          Image: normalized.paciente.imageUrl ? [{ Url: normalized.paciente.imageUrl }] : (avatarPaciente ? [{ Url: avatarPaciente }] : undefined),
        } : undefined,
        // Psicólogo também é passado para o modal (pode ser usado internamente)
        psicologo: normalized.psicologo ? {
          nome: normalized.psicologo.nome || "",
          id: String(normalized.psicologoId || normalized.psicologo.id || ""),
          avatarUrl: avatarPsicologo,
          Image: normalized.psicologo.imageUrl ? [{ Url: normalized.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
      };
      setConsultaSelecionada(consultaData);
    }
    setShowModal(true);
  };

  // Obtém informações da tag de status
  // Verifica se passaram 10 minutos sem entrada para mudar o status
  const statusBadge: string = useMemo(() => {
    // Prioridade 1: Status do socket (eventos em tempo real)
    if (socketStatus === "Concluido") {
      return "Concluído";
    }
    if (socketStatus === "Cancelado" || socketStatus === "cancelled_by_patient" || socketStatus === "cancelled_by_psychologist") {
      return "Cancelado";
    }
    
    // Prioridade 2: Verifica se passaram 10 minutos sem entrada (ANTES do status do backend)
    if (normalized) {
      const reservaSessao = normalized.raw?.ReservaSessao;
      if (reservaSessao && typeof reservaSessao === 'object' && reservaSessao !== null) {
        const reservaSessaoTyped = reservaSessao as { ScheduledAt?: string | Date | null; PatientJoinedAt?: string | Date | null; PsychologistJoinedAt?: string | Date | null };
        const scheduledAt = reservaSessaoTyped.ScheduledAt as string | null | undefined;
        const patientJoinedAt = reservaSessaoTyped.PatientJoinedAt as string | Date | null | undefined;
        const psychologistJoinedAt = reservaSessaoTyped.PsychologistJoinedAt as string | Date | null | undefined;
        
        const algumNaoEntrou = !patientJoinedAt || !psychologistJoinedAt;
        
        if (scheduledAt && algumNaoEntrou) {
          try {
            const scheduledTime = dayjs.tz(scheduledAt, 'America/Sao_Paulo');
            const agora = dayjs.tz('America/Sao_Paulo');
            const diffMinutes = agora.diff(scheduledTime, 'minute');
            
            if (diffMinutes >= 10) {
              return "Cancelado";
            }
          } catch (error) {
            console.error('[ConsultaAtualPsicologo statusBadge] Erro ao verificar 10 minutos:', error);
          }
        }
      }
    }
    
    // Prioridade 3: Status do backend
    const statusBackend = normalized?.raw?.Status || normalized?.raw?.status || normalized?.status || 'Reservado';
    return typeof statusBackend === 'string' ? statusBackend : String(statusBackend);
  }, [socketStatus, normalized]);
  
  // Converte dados normalizados para ConsultaApi
  // No painel do psicólogo, sempre mostra o paciente
  const consultaApi: ConsultaApi | null = useMemo(() => {
    if (!normalized) return null;
    
    // No painel do psicólogo, sempre mostra o paciente
    const pessoaParaMostrar = normalized.paciente;
    const pessoaIdParaMostrar = normalized.pacienteId;
    
    return {
      Id: normalized.id ? String(normalized.id) : '',
      Date: normalized.date || '',
      Time: normalized.time || '',
      Status: normalized.status || statusBadge,
      PacienteId: normalized.pacienteId ? String(normalized.pacienteId) : '',
      PsicologoId: normalized.psicologoId ? String(normalized.psicologoId) : '',
      AgendaId: (normalized.raw?.AgendaId || normalized.raw?.agendaId) ? String(normalized.raw.AgendaId || normalized.raw.agendaId) : '',
      CreatedAt: normalized.raw?.CreatedAt ? String(normalized.raw.CreatedAt) : new Date().toISOString(),
      UpdatedAt: normalized.raw?.UpdatedAt ? String(normalized.raw.UpdatedAt) : new Date().toISOString(),
      // Sempre coloca no campo Psicologo a pessoa que deve ser exibida (para o ConsultaCard funcionar)
      // No caso do psicólogo, mostra o paciente
      Psicologo: pessoaParaMostrar ? {
        Id: pessoaParaMostrar.id ? String(pessoaParaMostrar.id) : (pessoaIdParaMostrar ? String(pessoaIdParaMostrar) : ''),
        Nome: pessoaParaMostrar.nome || '',
        Images: pessoaParaMostrar.imageUrl ? [{ Url: pessoaParaMostrar.imageUrl }] : [],
      } : undefined,
      Agenda: normalized.date || normalized.time ? {
        Data: normalized.date || '',
        Horario: normalized.time || '',
        DiaDaSemana: '',
        Status: normalized.status || '',
      } : undefined,
      ReservaSessao: (() => {
        const reservaSessaoRaw = normalized.raw?.ReservaSessao;
        if (reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw)) {
          const reservaSessao = reservaSessaoRaw as { Status?: string; status?: string; VideoCallLink?: string | null; videoCallLink?: string | null };
          return {
            Status: reservaSessao.Status || reservaSessao.status || '',
            VideoCallLink: reservaSessao.VideoCallLink ?? reservaSessao.videoCallLink ?? null,
          };
        }
        return undefined;
      })(),
    };
  }, [normalized, statusBadge]);

  // Não mostra nada se não houver consulta ou se não deve mostrar o card
  // Mas ainda mostra se a consulta foi concluída ou cancelada (para mostrar status)
  const deveMostrar: boolean = useMemo(() => {
    if (!normalized) return false;
    
    // Se deve mostrar o card normalmente, mostra
    if (mostrarCard) return true;
    
    // Se não deve mostrar normalmente, verifica se foi concluída ou cancelada
    // Verifica o status do socket primeiro
    if (socketStatus === "Concluido" || socketStatus === "Cancelado" || 
        socketStatus === "cancelled_by_patient" || socketStatus === "cancelled_by_psychologist") {
      return true;
    }
    
    // Verifica o status do backend
    const statusBackend = normalized?.raw?.Status || normalized?.raw?.status || normalized?.status;
    if (statusBackend) {
      const statusStr = typeof statusBackend === 'string' ? statusBackend.toLowerCase() : String(statusBackend).toLowerCase();
      if (statusStr.includes('conclu') || statusStr.includes('realizada') || 
          statusStr.includes('cancel') || statusStr.includes('cancelada')) {
        return true;
      }
    }
    
    return false;
  }, [normalized, mostrarCard, socketStatus]);

  // Handler para ver detalhes (abre modal)
  const handleVerDetalhes = () => {
    handleAbrirModalConsulta();
  };

  if (!deveMostrar || !normalized || !consultaApi) {
    return null;
  }

  const isCancelada = statusBadge === "Cancelado";
  const supportOnly = sessionState.buttons.mostrarBotaoSuporte || isCancelada;

  return (
    <motion.section
      className="w-full flex flex-col items-start"
      {...ANIMATION_VARIANTS.container}
    >
      <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">
        {estaDentroDoPeriodo ? "🔴 Sessão Ativa Agora" : "Próxima consulta"}
      </h3>
      
      {/* Usa ConsultaCard da lib - igual ao do paciente, mas com estilo do psicólogo */}
      <ConsultaCard
        consulta={consultaApi}
        showEntrarButton={sessionState.buttons.mostrarBotaoEntrar}
        botaoEntrarDesabilitado={sessionState.buttons.botaoEntrarDesabilitado}
        isLoadingEntry={isCheckingTokens || isProcessingEntry}
        mostrarBotaoSuporte={sessionState.buttons.mostrarBotaoSuporte}
        isPsicologoPanel={true}
        supportOnly={supportOnly}
        statusOverride={isCancelada ? "Cancelado" : undefined}
        contador={
          !supportOnly && sessionState.mostrarContador && contador50MinutosAtualizado.estaDentroDoPeriodo && sessionState.contadorSessao
            ? {
                frase: sessionState.fraseSessao,
                tempo: sessionState.contadorSessao,
                mostrar: true,
              }
            : undefined
        }
        onAbrirCancelar={
          supportOnly
            ? undefined
            : () => {
                setShowModalCancelar(true);
              }
        }
        actions={{
          onEntrar: supportOnly ? undefined : handleEntrarNaConsulta,
          onVerDetalhes: supportOnly ? undefined : handleVerDetalhes,
          onVerPerfil: shouldShowPerfil && perfilHref ? () => router.push(perfilHref) : undefined,
          onSuporte: sessionState.buttons.mostrarBotaoSuporte ? handleSuporte : undefined,
        }}
      />

      {/* Modal de detalhes da consulta */}
      {consultaSelecionada && consultaSelecionada.data && consultaSelecionada.horario && (
        <ConsultaModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setConsultaSelecionada(null);
          }}
          consulta={{
            data: consultaSelecionada.data || "",
            horario: consultaSelecionada.horario || "",
            // No painel do psicólogo, o psicólogo também deve ser passado (pode ser usado internamente)
            psicologo: {
              nome: consultaSelecionada.psicologo?.nome || "Psicólogo",
              avatarUrl: consultaSelecionada.psicologo?.avatarUrl,
            },
            // O paciente é o que deve ser exibido no modal quando está no painel do psicólogo
            paciente: consultaSelecionada.paciente ? {
              nome: consultaSelecionada.paciente.nome || "Paciente",
              avatarUrl: consultaSelecionada.paciente.avatarUrl || getContextualAvatar(true, normalized?.psicologo, normalized?.paciente),
            } : normalized?.paciente ? {
              nome: normalized.paciente.nome || "Paciente",
              avatarUrl: normalized.paciente.imageUrl || getContextualAvatar(true, normalized.psicologo, normalized.paciente),
            } : undefined,
          }}
          botaoEntrarDesabilitado={sessionState.buttons.botaoEntrarDesabilitado}
          consultaId={normalized?.id ? String(normalized.id) : undefined}
          sessaoAtiva={sessaoConsulta.sessaoAtiva}
          statusCancelamento={socketStatus ? String(socketStatus) : null}
          status={typeof normalized?.raw?.Status === 'string' ? normalized.raw.Status : (typeof normalized?.raw?.status === 'string' ? normalized.raw.status : (typeof normalized?.status === 'string' ? normalized.status : null))}
          onAbrirCancelar={() => {
            setShowModal(false);
            setTimeout(() => {
              setShowModalCancelar(true);
            }, 200);
          }}
        />
      )}

      {/* Modal de cancelamento para psicólogo */}
      {showModalCancelar && normalized && (
        <ModalCancelarSessao
          open={showModalCancelar}
          onClose={() => setShowModalCancelar(false)}
          onConfirm={(motivo: string) => {
            // Implementar lógica de cancelamento se necessário
            console.log('Cancelamento confirmado:', motivo);
            setShowModalCancelar(false);
          }}
          consulta={{
            id: normalized.id !== undefined ? String(normalized.id) : undefined,
            date: normalized.date,
            time: normalized.time,
            pacienteId: normalized.pacienteId !== undefined ? String(normalized.pacienteId) : undefined,
            psicologoId: normalized.psicologoId !== undefined ? String(normalized.psicologoId) : undefined,
          }}
        />
      )}
    </motion.section>
  );
}

