"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import ConsultaModal from "./ConsultaModal";
import ModalCancelarSessao from "./ModalCancelarSessao";
import ModalCancelarSessaoDentroPrazo from "./ModalCancelarSessaoDentroPrazo";
import ModalReagendarAposCancelamento from "./ModalReagendarAposCancelamento";
import { isCancelamentoDentroPrazo } from "@/utils/cancelamentoUtils";
import { useSessaoConsulta, type ConsultaSessao } from "../hooks/useSessaoConsulta";
import { useContadorGlobal } from "@/hooks/useContadorGlobal";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import { useReservaSessaoData } from "@/hooks/useReservaSessaoData";
import { getContextualAvatar, isPsicologoPanel } from "@/utils/avatarUtils";
import { ConsultaApi } from "@/types/consultasTypes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { useQueryClient } from '@tanstack/react-query';
import { ConsultaCard } from "@/lib/consultas/ConsultaCard";
import { calcularTempoRestante60Minutos, isConsultaDentro60MinutosComScheduledAt } from "@/utils/consultaTempoUtils";
import {
  onConsultationStarted,
  onConsultationEnded,
  onConsultationStartingSoon,
  onConsultationEndingSoon,
  onConsultationCancelled,
  onConsultationCancelledByPatient,
  onConsultationCancelledByPsychologist,
  onConsultationStatusChanged,
  offConsultationStatusChanged,
  ensureSocketConnection,
  getSocket,
} from "../lib/socket";

type Role = "paciente" | "psicologo";
type ConsultationStatus = 
  | "startingSoon" 
  | "started" 
  | "endingSoon" 
  | "Concluido"
  | "Cancelado"
  | "cancelled_by_patient"
  | "cancelled_by_psychologist"
  | "cancelled_no_show"
  | "EmAnalise"
  | "Deferido"
  | "Indeferido";

export interface ConsultaAtualProps {
  consulta: ConsultaApi | null;
  role?: Role;
  hidePerfil?: boolean;
}

interface ButtonState {
  mostrarBotaoEntrar: boolean;
  mostrarBotaoCancelar: boolean;
  mostrarBotaoReagendar: boolean;
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

export default function ConsultaAtual({ consulta: consultaProp = null, role = "paciente", hidePerfil = false }: ConsultaAtualProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showModalCancelar, setShowModalCancelar] = useState<boolean>(false);
  const [showModalCancelarDentroPrazo, setShowModalCancelarDentroPrazo] = useState<boolean>(false);
  const [showModalReagendarAposCancelamento, setShowModalReagendarAposCancelamento] = useState<boolean>(false);
  const [socketStatus, setSocketStatus] = useState<ConsultationStatus | null>(null);
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
    return normalizeConsulta(consultaProp as unknown as GenericObject);
  }, [consultaProp]);

  // Usa hook centralizado para acessar ReservaSessao
  const { scheduledAt: scheduledAtFromReserva, reservaSessao: reservaSessaoData } = useReservaSessaoData({
    normalized,
    consultationId: normalized?.id ? String(normalized.id) : undefined
  });

  // Verifica se a consulta está dentro dos 60 minutos usando ScheduledAt
  const estaDentroDoPeriodo50Minutos = useMemo(() => {
    if (!normalized || !consultaProp) return false;
    
    return isConsultaDentro60MinutosComScheduledAt(
      scheduledAtFromReserva,
      normalized.date,
      normalized.time
    );
  }, [normalized, consultaProp, scheduledAtFromReserva]);

  // Se o backend retornou a consulta, ela já foi validada como "em andamento"
  // Mas só mostra se estiver dentro dos 60 minutos
  const mostrarCard: boolean = useMemo(() => {
    if (!normalized || !consultaProp) return false;
    
    // Verifica se tem data e hora (dados mínimos necessários)
    const dateOnly = extractDateOnly(normalized.date || '');
    if (!dateOnly || !normalized.time) return false;
    
    // Só mostra se estiver dentro dos 60 minutos
    return estaDentroDoPeriodo50Minutos;
  }, [normalized, consultaProp, estaDentroDoPeriodo50Minutos]);
  
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

  const basePrefix: string = role === "psicologo" ? "/painel-psicologo" : "/painel";
  
  // Detecta se está no painel do psicólogo
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isInPsicologoPanel = role === "psicologo" || isPsicologoPanel(pathname);
  
  const perfilHref: string | undefined = isInPsicologoPanel
    ? (normalized?.pacienteId ? `${basePrefix}/paciente/${normalized.pacienteId}` : undefined)
    : (normalized?.psicologoId ? `${basePrefix}/psicologo/${normalized.psicologoId}` : undefined);

  const shouldShowPerfil: boolean = !hidePerfil && Boolean(perfilHref);
  
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
          // Agenda um timeout para forçar refetch quando passar de 60 minutos
          const timeout = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
          }, tempoRestante);
          
          return () => clearTimeout(timeout);
        }
      }
    } catch (error) {
      console.error('[ConsultaAtual] Erro ao calcular timeout de 60 minutos:', error);
    }
  }, [normalized, queryClient]);

  useEffect(() => {
    if (!normalized?.id) return;
    const consultaId: string | undefined = normalized.id ? String(normalized.id) : undefined;
    ensureSocketConnection();
    if (!consultaId) return;
    
    // Função para mapear status do backend para status do frontend
    const mapStatusToFrontend = (status: string): ConsultationStatus | null => {
      const statusMap: Record<string, ConsultationStatus> = {
        "Andamento": "started",
        "Concluido": "Concluido",
        "Cancelado": "Cancelado",
        "cancelled_by_patient": "cancelled_by_patient",
        "cancelled_by_psychologist": "cancelled_by_psychologist",
      };
      return statusMap[status] || null;
    };

    // Listeners para eventos específicos da consulta
    onConsultationStartingSoon(() => setSocketStatus("startingSoon"), consultaId);
    onConsultationStarted(() => setSocketStatus("started"), consultaId);
    onConsultationEndingSoon(() => setSocketStatus("endingSoon"), consultaId);
    onConsultationEnded(() => {
      setSocketStatus("Concluido");
      // Quando consulta termina, força atualização imediata para mostrar próxima consulta
      queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
      queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
      queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] });
    }, consultaId);
    onConsultationCancelled(() => setSocketStatus("Cancelado"), consultaId);
    onConsultationCancelledByPatient(() => setSocketStatus("cancelled_by_patient"), consultaId);
    onConsultationCancelledByPsychologist(() => setSocketStatus("cancelled_by_psychologist"), consultaId);
    
    // Listener para mudanças de status gerais (ex: cancelamento automático)
    onConsultationStatusChanged((data) => {
      const mappedStatus = mapStatusToFrontend(data.status);
      if (mappedStatus) {
        setSocketStatus(mappedStatus);
        // Força refetch imediato para atualizar dados do backend (incluindo ReservaSessao.Status)
        queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
        queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
        queryClient.invalidateQueries({ queryKey: ['reserva-sessao', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consulta', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] });
        queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] });
        // Se consulta foi concluída, força refetch imediato para atualizar card
        if (mappedStatus === "Concluido") {
          queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] });
        }
      }
    }, consultaId);

    return () => {
      const socket = getSocket();
      if (!socket) return;
      socket.off(`consultation:${consultaId}`);
      offConsultationStatusChanged(consultaId);
    };
  }, [normalized?.id, queryClient]);

  // Calcula o contador baseado nos 60 minutos usando ScheduledAt
  const contador50Minutos = useMemo(() => {
    if (!normalized) return { tempoFormatado: '', estaDentroDoPeriodo: false };
    
    return calcularTempoRestante60Minutos(
      scheduledAtFromReserva,
      normalized.date,
      normalized.time
    );
  }, [normalized, scheduledAtFromReserva]);

  const calculateSessionState = (): SessionState => {
    const defaultState: SessionState = {
      fraseSessao: "",
      mostrarContador: false,
      contadorSessao: "",
      buttons: {
        mostrarBotaoEntrar: false,
        mostrarBotaoCancelar: false,
        mostrarBotaoReagendar: false,
        mostrarBotaoSuporte: false,
        botaoEntrarDesabilitado: true,
      },
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
                buttons: { ...defaultState.buttons, mostrarBotaoSuporte: true },
              };
            }
          } catch (error) {
            console.error('[calculateSessionState] Erro ao verificar 10 minutos:', error);
          }
        }
      }
    }

    if (socketStatus === "startingSoon") {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true },
      };
    }

    if (socketStatus === "started") {
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: contador50Minutos.estaDentroDoPeriodo,
        contadorSessao: contador50Minutos.tempoFormatado || contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (socketStatus === "endingSoon") {
      return {
        fraseSessao: "Sua sessão está encerrando em breve.",
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (["Concluido", "Cancelado", "cancelled_by_patient", "cancelled_by_psychologist"].includes(socketStatus || "")) {
      const frases: Record<string, string> = {
        Concluido: "Sua sessão foi encerrada.",
        Cancelado: "Sua sessão foi cancelada.",
        cancelled_by_patient: "Consulta cancelada por ausência do paciente.",
        cancelled_by_psychologist: "Psicólogo ausente. Consulta recreditada.",
      };

      return {
        fraseSessao: frases[socketStatus || ""],
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoSuporte: true },
      };
    }

    if (mostrarSessao && !sessaoAtiva && !sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true },
      };
    }

    if (mostrarSessao && sessaoAtiva && !sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: contador50Minutos.estaDentroDoPeriodo,
        contadorSessao: contador50Minutos.tempoFormatado || contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (mostrarSessao && sessaoEncerrada) {
      // Verifica se ambos entraram na sala (PatientJoinedAt e PsychologistJoinedAt preenchidos)
      if (!normalized) {
        return defaultState;
      }
      
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
        return {
          fraseSessao: "Sua sessão já começou há",
          mostrarContador: contador50Minutos.estaDentroDoPeriodo,
          contadorSessao: contador50Minutos.tempoFormatado || contador,
          buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
        };
      }
      
      // Se não entraram, mostra mensagem de inatividade
      return {
        fraseSessao: "Sua sessão foi encerrada por inatividade.",
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoSuporte: true },
      };
    }

    // Para consulta em andamento, sempre permite entrar (não está nas 24h antes)
    if (normalized?.date && normalized?.time) {
      // Consulta em andamento: sempre permite entrar, não pode cancelar
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: contador50Minutos.estaDentroDoPeriodo,
        contadorSessao: contador50Minutos.tempoFormatado || contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    // Estado padrão para consulta em andamento
    return {
      fraseSessao: "Sua sessão já começou há",
      mostrarContador: contador50Minutos.estaDentroDoPeriodo,
      contadorSessao: contador50Minutos.tempoFormatado || contador,
      buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
    };
  };

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

  const sessionState = calculateSessionState();
  const { fraseSessao, mostrarContador, contadorSessao, buttons } = sessionState;

  // Determina o status da consulta para exibição do badge
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
            console.error('[statusBadge] Erro ao verificar 10 minutos:', error);
          }
        }
      }
    }
    
    // Prioridade 3: Status do backend (normalized.raw?.Status)
    const statusBackend = normalized?.raw?.Status || normalized?.raw?.status || normalized?.status;
    if (statusBackend === "Realizada" || statusBackend === "Concluido" || statusBackend === "concluido") {
      return "Concluído";
    }
    if (statusBackend === "Cancelado" || statusBackend === "cancelado") {
      return "Cancelado";
    }
    
    // Prioridade 4: Verifica ReservaSessao.Status
    const reservaSessao = normalized?.raw?.ReservaSessao;
    if (reservaSessao && typeof reservaSessao === 'object' && 'Status' in reservaSessao) {
      const reservaSessaoStatus = reservaSessao.Status;
      if (typeof reservaSessaoStatus === 'string' && (reservaSessaoStatus === "Concluido" || reservaSessaoStatus === "concluido")) {
        return "Concluído";
      }
    }
    
    // Status padrão: Em Andamento
    return "Em Andamento";
  }, [socketStatus, normalized]);

  // Não mostra nada se não houver consulta ou se não deve mostrar o card
  // Mas ainda mostra se a consulta foi concluída (para mostrar status)
  const deveMostrar: boolean = useMemo(() => {
    if (!normalized || !mostrarCard) {
      // Se a consulta foi concluída, ainda mostra o card por um tempo
      if (statusBadge === "Concluído") {
        return true;
      }
      return false;
    }
    return true;
  }, [normalized, mostrarCard, statusBadge]);

  // Converte dados normalizados para ConsultaApi
  // No painel do psicólogo, mostra o paciente; no painel do paciente, mostra o psicólogo
  // IMPORTANTE: Este hook deve ser chamado antes de qualquer early return
  const consultaApi: ConsultaApi | null = useMemo(() => {
    if (!normalized) return null;
    
    // Determina qual pessoa mostrar (psicólogo ou paciente) baseado no contexto
    const pessoaParaMostrar = isInPsicologoPanel ? normalized.paciente : normalized.psicologo;
    const pessoaIdParaMostrar = isInPsicologoPanel ? normalized.pacienteId : normalized.psicologoId;
    
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
  }, [normalized, statusBadge, isInPsicologoPanel]);

  // Handler para entrar na consulta
  const handleEntrarNaConsulta = async () => {
    if (!buttons.botaoEntrarDesabilitado && normalized?.id) {
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

  // Função para abrir o modal de detalhes da consulta
  const handleAbrirModalConsulta = () => {
    if (normalized) {
      const avatarPsicologo = getContextualAvatar(isInPsicologoPanel, normalized.psicologo, normalized.paciente);
      const rawData = normalized.raw && typeof normalized.raw === 'object' && normalized.raw !== null
        ? normalized.raw as { Date?: string; Time?: string; Agenda?: { Data?: string; Horario?: string } }
        : null;
      const dataParaModal = normalized.date || rawData?.Date || rawData?.Agenda?.Data || "";
      const horarioParaModal = normalized.time || rawData?.Time || rawData?.Agenda?.Horario || "";

      const consultaData: ConsultaModalData = {
        data: dataParaModal,
        horario: horarioParaModal,
        psicologo: normalized.psicologo ? {
          nome: normalized.psicologo.nome || "",
          id: String(normalized.psicologoId || normalized.psicologo.id || ""),
          avatarUrl: normalized.psicologo.imageUrl || avatarPsicologo,
          Image: normalized.psicologo.imageUrl ? [{ Url: normalized.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
        paciente: normalized.paciente ? {
          nome: normalized.paciente.nome || "",
          id: String(normalized.pacienteId || normalized.paciente.id || ""),
          avatarUrl: normalized.paciente.imageUrl || avatarPsicologo,
          Image: normalized.paciente.imageUrl ? [{ Url: normalized.paciente.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
      };
      setConsultaSelecionada(consultaData);
    }
    setShowModal(true);
  };

  // Handler para ver detalhes (abre modal)
  const handleVerDetalhes = () => {
    handleAbrirModalConsulta();
  };

  const handleSuporte = (): void => {
    const mensagem = encodeURIComponent("Olá, preciso de suporte técnico na Estação Terapia. Tenho dúvidas ou estou com problemas na plataforma.");
    window.open(`https://wa.me/5511960892131?text=${mensagem}`, "_blank");
  };

  if (!normalized || !deveMostrar || !consultaApi) {
    return null;
  }

  // Se a consulta está cancelada, força esconder contador e botão entrar
  const isCancelada = statusBadge === "Cancelado";
  const supportOnly = buttons.mostrarBotaoSuporte || isCancelada;
  const finalButtons = supportOnly
    ? { mostrarBotaoEntrar: false, mostrarBotaoSuporte: true, botaoEntrarDesabilitado: true }
    : buttons;
  const finalMostrarContador = supportOnly ? false : mostrarContador;
  const contadorFinal = contador50MinutosAtualizado.estaDentroDoPeriodo
    ? contador50MinutosAtualizado.tempoFormatado
    : contadorSessao;

  return (
    <motion.section
      className="w-full flex flex-col items-start"
      {...ANIMATION_VARIANTS.container}
    >
      <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">Consulta Atual</h3>
      
      {/* Usa ConsultaCard da lib */}
      <ConsultaCard
        consulta={consultaApi}
        showEntrarButton={finalButtons.mostrarBotaoEntrar}
        botaoEntrarDesabilitado={finalButtons.botaoEntrarDesabilitado}
        isLoadingEntry={isCheckingTokens || isProcessingEntry}
        mostrarBotaoSuporte={finalButtons.mostrarBotaoSuporte}
        supportOnly={supportOnly}
        statusOverride={isCancelada ? "Cancelado" : undefined}
        contador={
          !supportOnly && finalMostrarContador && contador50MinutosAtualizado.estaDentroDoPeriodo && contadorFinal
            ? {
                frase: fraseSessao,
                tempo: contadorFinal,
                mostrar: true,
              }
            : undefined
        }
        actions={{
          onEntrar: !supportOnly && finalButtons.mostrarBotaoEntrar ? handleEntrarNaConsulta : undefined,
          onVerDetalhes: supportOnly ? undefined : handleVerDetalhes,
          onVerPerfil: shouldShowPerfil && perfilHref ? () => router.push(perfilHref) : undefined,
          onSuporte: finalButtons.mostrarBotaoSuporte ? handleSuporte : undefined,
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
            psicologo: {
              nome: consultaSelecionada.psicologo?.nome || "Psicólogo",
              avatarUrl: consultaSelecionada.psicologo?.avatarUrl,
            },
            paciente: consultaSelecionada.paciente ? {
              nome: consultaSelecionada.paciente.nome || "Paciente",
              avatarUrl: consultaSelecionada.paciente.avatarUrl,
            } : undefined,
          }}
          botaoEntrarDesabilitado={finalButtons.botaoEntrarDesabilitado}
          consultaId={normalized?.id ? String(normalized.id) : undefined}
          sessaoAtiva={sessaoConsulta.sessaoAtiva}
          statusCancelamento={socketStatus ? String(socketStatus) : null}
          status={typeof normalized?.raw?.Status === 'string' ? normalized.raw.Status : (typeof normalized?.raw?.status === 'string' ? normalized.raw.status : (typeof normalized?.status === 'string' ? normalized.status : null))}
          onAbrirCancelar={(consultaIdParam) => {
            console.log('[ConsultaAtual] onAbrirCancelar chamado', {
              consultaIdParam,
              normalized: !!normalized,
              role
            });
            
            setShowModal(false);
            setTimeout(() => {
              // Verifica se está dentro ou fora do prazo de 24h
              const dentroPrazo = isCancelamentoDentroPrazo(normalized?.date, normalized?.time);
              // Verifica se é paciente (padrão é paciente se não for psicólogo)
              const isPaciente = role !== "psicologo";
              
              console.log('[ConsultaAtual] Verificação de prazo', {
                date: normalized?.date,
                time: normalized?.time,
                dentroPrazo,
                role,
                isPaciente,
                vaiAbrirDentroPrazo: dentroPrazo && isPaciente
              });
              
              if (dentroPrazo && isPaciente) {
                // Dentro do prazo: usa modal simples sem motivo
                console.log('[ConsultaAtual] Abrindo modal de cancelamento dentro do prazo');
                setShowModalCancelarDentroPrazo(true);
              } else {
                // Fora do prazo: usa modal com motivo e upload
                console.log('[ConsultaAtual] Abrindo modal de cancelamento fora do prazo');
                setShowModalCancelar(true);
              }
            }, 200);
          }}
        />
      )}

      {/* Modal de cancelamento dentro do prazo (>24h) - apenas para pacientes */}
      {showModalCancelarDentroPrazo && normalized && (
        <ModalCancelarSessaoDentroPrazo
          open={showModalCancelarDentroPrazo}
          onClose={() => setShowModalCancelarDentroPrazo(false)}
          consulta={{
            id: normalized.id !== undefined ? String(normalized.id) : undefined,
            date: normalized.date,
            time: normalized.time,
            pacienteId: normalized.pacienteId !== undefined ? String(normalized.pacienteId) : undefined,
            psicologoId: normalized.psicologoId !== undefined ? String(normalized.psicologoId) : undefined,
            linkDock: undefined,
            status: "Deferido",
            tipo: "Paciente"
          }}
          onConfirm={async () => {
            setShowModalCancelarDentroPrazo(false);
            setSocketStatus("Cancelado");
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
              queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['ciclos-plano'] }),
              queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
              queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
              queryClient.invalidateQueries({ queryKey: ['userMe'] }),
              queryClient.refetchQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] }),
              queryClient.refetchQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.refetchQueries({ queryKey: ['ciclo-ativo'] }),
              queryClient.refetchQueries({ queryKey: ['userPlano'] }),
            ]);
            // Após cancelar, pergunta se quer reagendar
            setTimeout(() => {
              setShowModalReagendarAposCancelamento(true);
            }, 300);
          }}
        />
      )}

      {/* Modal de reagendamento após cancelamento dentro do prazo */}
      {showModalReagendarAposCancelamento && normalized && (
        <ModalReagendarAposCancelamento
          open={showModalReagendarAposCancelamento}
          onClose={() => setShowModalReagendarAposCancelamento(false)}
          consultaOriginal={normalized ? {
            Id: normalized.id ? String(normalized.id) : "",
            Date: normalized.date || "",
            Time: normalized.time || "",
            Status: normalized.status || "Reservado",
            PacienteId: normalized.pacienteId ? String(normalized.pacienteId) : "",
            PsicologoId: normalized.psicologoId ? String(normalized.psicologoId) : "",
            AgendaId: (normalized.raw?.AgendaId || normalized.raw?.agendaId) ? String(normalized.raw.AgendaId || normalized.raw.agendaId) : "",
            CreatedAt: normalized.raw?.CreatedAt ? String(normalized.raw.CreatedAt) : new Date().toISOString(),
            UpdatedAt: normalized.raw?.UpdatedAt ? String(normalized.raw.UpdatedAt) : new Date().toISOString(),
            Psicologo: normalized.psicologo ? {
              Id: normalized.psicologo.id ? String(normalized.psicologo.id) : "",
              Nome: normalized.psicologo.nome || "",
              Images: normalized.psicologo.imageUrl ? [{ Url: normalized.psicologo.imageUrl }] : undefined
            } : undefined
          } as ConsultaApi : null}
        />
      )}

      {/* Modal de cancelamento fora do prazo (<24h) - com motivo e upload */}
      {showModalCancelar && normalized && (
        <ModalCancelarSessao
          open={showModalCancelar}
          onClose={() => setShowModalCancelar(false)}
          consulta={{
            id: normalized.id !== undefined ? String(normalized.id) : undefined,
            date: normalized.date,
            time: normalized.time,
            pacienteId: normalized.pacienteId !== undefined ? String(normalized.pacienteId) : undefined,
            psicologoId: normalized.psicologoId !== undefined ? String(normalized.psicologoId) : undefined,
            linkDock: undefined,
            status: 'EmAnalise',
            tipo: undefined
          }}
          onConfirm={async () => {
            setShowModalCancelar(false);
            setSocketStatus("Cancelado");
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
              queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] }),
              queryClient.refetchQueries({ queryKey: ['reservas/consultas-agendadas'] }),
            ]);
          }}
        />
      )}
    </motion.section>
  );
}
