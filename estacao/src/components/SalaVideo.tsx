"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAgora } from "@/hooks/useAgora";
import ModalAvaliacoes from "./ModalAvaliacoes";
import ModalConfirmarSaida from "./ModalConfirmarSaida";
import ModalCancelarSessao from "./ModalCancelarSessao";
import ModalReagendarPsicologo from "./ModalReagendarPsicologo";
import ModalAgendarProximaSessaoPsicologo from "./ModalAgendarProximaSessaoPsicologo";
import ModalReagendarPsicologoSala from "./ModalReagendarPsicologoSala";
import ModalCancelarPsicologoSala from "./ModalCancelarPsicologoSala";
import BotoesFlutuantes from "./BotoesFlutuantes";
import ContadorSessao from "./ContadorSessao";
import { useContadorGlobal } from "@/hooks/useContadorGlobal";
import { HeaderSala } from "./HeaderSala";
import { useRouter } from "next/navigation";
import { useQueryClient } from '@tanstack/react-query'; 
import { 
  joinConsultation, 
  leaveConsultation, 
  onUserJoinedConsultation, 
  onPrivacyMessage,
  offUserJoinedConsultation,
  offPrivacyMessage,
  onHandRaisedInConsultation,
  offHandRaisedInConsultation,
  onConsultationInactivity,
  offConsultationInactivity,
  onConsultationStatusChanged,
  offConsultationStatusChanged,
  onInactivityWarning,
  offInactivityWarning,
  onTimeRemainingWarning,
  offTimeRemainingWarning,
  onRoomClosed,
  offRoomClosed,
  ensureSocketConnection,
  type InactivityWarningData,
  type TimeRemainingWarningData,
  type RoomClosedData,
  sendSessionDurationSync,
  onSessionDurationSync,
  offSessionDurationSync,
  type SyncSessionDurationData,
  onSessionStatusUpdated,
  offSessionStatusUpdated,
  type SessionStatusUpdatedData
} from "@/lib/socket";
import { useSocket } from "./SocketProvider";
import { toast } from "react-hot-toast";
import { useConsultaById } from "@/hooks/consulta";
import { useAuthStore } from "@/store/authStore";
import { useReservaSessao, useConsultaCompleta } from "@/hooks/reservaSessao";
import { loadDevicePreferences } from "@/utils/devicePreferences";
import { api } from "@/lib/axios";
import { reviewService } from "@/services/reviewService";
import { isAxiosError } from "@/types/axiosError.types";
import NotificationToast from "./NotificationToast";

type SalaProps = {
  appId: string;
  channel: string;
  token: string;
  uid: string;
  role: "PATIENT" | "PSYCHOLOGIST";
  consultationId: string;
  PsychologistId: string;
  consultaDate?: string | Date;
  consultaTime?: string;
  scheduledAt?: string;
};

export default function SalaVideo({ appId, channel, token, uid, role, consultationId, PsychologistId, consultaDate, consultaTime, scheduledAt }: SalaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // DEBUG: Log das props recebidas
  console.log('🔵 [SalaVideo] Props recebidas:', {
    consultationId,
    consultaDate,
    consultaTime,
    scheduledAt,
    PsychologistId
  });
  
  // Obtém o ID do usuário logado (psicólogo)
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";
  
  // Lifecycle para registrar entrada/saída via Socket
  const consultationIdString = consultationId || "";
  
  // Busca dados da reserva sessão para verificar se ambos estiveram na sala
  const { reservaSessao, refetch: refetchReservaSessao } = useReservaSessao(consultationId);
  
  // Busca todos os dados relacionados (ReservaSessao, Agenda, Consulta) de uma vez
  const { data: consultaCompleta } = useConsultaCompleta(consultationIdString);
  
  // Extrai dados da consulta completa como fallback
  const reservaSessaoCompleta = consultaCompleta?.ReservaSessao;
  const consultaCompletaData = consultaCompleta?.Consulta;
  const agendaCompleta = consultaCompleta?.Agenda;
  
  // Prioriza dados da consulta completa sobre os dados individuais
  const reservaSessaoFinal = reservaSessaoCompleta || reservaSessao;
  const consultaDateFinal = consultaDate || reservaSessaoFinal?.ConsultaDate || consultaCompletaData?.Date || agendaCompleta?.Data;
  const consultaTimeFinal = consultaTime || reservaSessaoFinal?.ConsultaTime || consultaCompletaData?.Time || agendaCompleta?.Horario;
  const scheduledAtFinal = scheduledAt || reservaSessaoFinal?.ScheduledAt;
  
  // DEBUG: Log dos dados disponíveis
  console.log('🔵 [SalaVideo] Dados disponíveis:', {
    hasReservaSessao: !!reservaSessao,
    hasConsultaCompleta: !!consultaCompleta,
    scheduledAtFinal,
    consultaDateFinal,
    consultaTimeFinal,
    reservaSessaoCompleta: !!reservaSessaoCompleta,
    consultaCompletaData: !!consultaCompletaData,
    agendaCompleta: !!agendaCompleta
  });

  // Função auxiliar para calcular duração antes de inicializar o estado
  const getInitialDuration = useCallback((): number => {
    try {
      const scheduledAtToUse = scheduledAtFinal;
      
      if (scheduledAtToUse) {
        const [datePart, timePart] = scheduledAtToUse.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second = 0] = timePart.split(':').map(Number);
          const inicioConsulta = new Date(year, month - 1, day, hour, minute, second);
          const agora = new Date();
          const diffMs = agora.getTime() - inicioConsulta.getTime();
          const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
          return diffSeconds;
        }
      }
      
      if (consultaDate && consultaTime) {
        let inicioConsulta: Date;
        if (typeof consultaDate === 'string') {
          const dateStr = consultaDate.includes('T') ? consultaDate.split('T')[0] : consultaDate.split(' ')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hour, minute] = consultaTime.split(':').map(Number);
          inicioConsulta = new Date(year, month - 1, day, hour, minute, 0);
        } else {
          inicioConsulta = new Date(consultaDate);
          const [hour, minute] = consultaTime.split(':').map(Number);
          inicioConsulta.setHours(hour, minute, 0, 0);
        }
        const agora = new Date();
        const diffMs = agora.getTime() - inicioConsulta.getTime();
        const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
        return diffSeconds;
      }
      
      return 0;
    } catch (error) {
      console.error('[SalaVideo] Erro ao calcular duração inicial:', error);
      return 0;
    }
  }, [scheduledAtFinal, consultaDate, consultaTime]);

  // Inicializa callDuration com o valor calculado
  // IMPORTANTE: Calcula a diferença entre ScheduledAt e agora, mesmo antes de entrar na sala
  // Se o usuário entrar atrasado (ex: às 13:10 quando programado para 13:00), já mostra 10 minutos
  const [callDuration, setCallDuration] = useState(() => {
    const initialDuration = getInitialDuration();
    const scheduledAtToUse = scheduledAtFinal;
    
    console.log('⏱️ [SalaVideo] ===== INICIALIZAÇÃO DO CONTADOR =====');
    console.log('  - ScheduledAt (horário programado):', scheduledAtToUse);
    console.log('  - Duração inicial calculada:', initialDuration, 'segundos');
    console.log('  - Duração inicial formatada:', Math.floor(initialDuration / 60), 'minutos e', initialDuration % 60, 'segundos');
    
    if (scheduledAtToUse && initialDuration > 0) {
      const [datePart, timePart] = scheduledAtToUse.split(' ');
      if (datePart && timePart) {
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        const inicioProgramado = new Date(year, month - 1, day, hour, minute, 0);
        const agora = new Date();
        
        console.log('  - Horário programado:', inicioProgramado.toLocaleString('pt-BR'));
        console.log('  - Horário atual:', agora.toLocaleString('pt-BR'));
        console.log('  - Diferença:', Math.floor(initialDuration / 60), 'minutos e', initialDuration % 60, 'segundos');
        
        if (initialDuration > 60) {
          console.log('  ⚠️ Usuário entrou ATRASADO! A consulta já estava em andamento.');
        }
      }
    }
    console.log('==========================================');
    
    return initialDuration;
  });

  // Calcula o tempo restante baseado no ScheduledAt (horário inicial da reserva) + 60 minutos
  // IMPORTANTE: ScheduledAt é sempre a fonte da verdade - calcula desde o horário programado
  // Exemplo: se programado para 13:00, o tempo restante é calculado desde 13:00 + 60min = 14:00
  // Mesmo que o usuário entre às 13:10, o tempo restante será 50 minutos (não 60)
  const calculateTimeRemaining = useCallback((): number => {
    // Prioriza ScheduledAt da prop, depois da ReservaSessao, depois consultaDate/Time
    const scheduledAtToUse = scheduledAtFinal;
    
    if (scheduledAtToUse) {
      try {
        // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
        const [datePart, timePart] = scheduledAtToUse.split(' ');
        if (!datePart || !timePart) {
          throw new Error('Formato inválido de ScheduledAt');
        }
        
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        
        // Cria a data/hora de início da consulta (ScheduledAt) - horário programado
        // IMPORTANTE: Este é o horário absoluto de início, independente de quando o usuário entra
        const inicioConsulta = new Date(year, month - 1, day, hour, minute, second);
        
        // Calcula o fim da consulta (início programado + 60 minutos)
        // Exemplo: se programado para 13:00, termina às 14:00
        const fimConsulta = new Date(inicioConsulta.getTime() + 60 * 60 * 1000);
        
        // Calcula o tempo restante em segundos desde AGORA até o fim programado
        // Se são 13:10 e termina às 14:00, restam 50 minutos (3000 segundos)
        const agora = new Date();
        const diffMs = fimConsulta.getTime() - agora.getTime();
        const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
        
        // Limita o máximo a 60 minutos (3600 segundos) para garantir que não ultrapasse
        return Math.min(diffSeconds, 3600);
      } catch (error) {
        console.error('Erro ao calcular tempo restante a partir de ScheduledAt:', error);
      }
    }
    
    // Fallback: usa consultaDate e consultaTime se ScheduledAt não estiver disponível
    if (consultaDate && consultaTime) {
      try {
        // Cria a data/hora de início da consulta
        let inicioConsulta: Date;
        
        if (typeof consultaDate === 'string') {
          // Se for string, tenta parsear
          const dateStr = consultaDate.includes('T') ? consultaDate.split('T')[0] : consultaDate;
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hour, minute] = consultaTime.split(':').map(Number);
          inicioConsulta = new Date(year, month - 1, day, hour, minute, 0);
        } else {
          // Se for Date, usa diretamente e ajusta o horário
          inicioConsulta = new Date(consultaDate);
          const [hour, minute] = consultaTime.split(':').map(Number);
          inicioConsulta.setHours(hour, minute, 0, 0);
        }

        // Calcula o fim da consulta (início + 60 minutos)
        const fimConsulta = new Date(inicioConsulta.getTime() + 60 * 60 * 1000);
        
        // Calcula o tempo restante em segundos
        const agora = new Date();
        const diffMs = fimConsulta.getTime() - agora.getTime();
        const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
        
        // Limita o máximo a 60 minutos (3600 segundos)
        return Math.min(diffSeconds, 3600);
      } catch (error) {
        console.error('Erro ao calcular tempo restante:', error);
      }
    }
    
    // Fallback final: retorna 60 minutos se não tiver dados
    return 3600;
  }, [scheduledAtFinal, consultaDate, consultaTime]);

  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();

  // Estados para levantar mão (remoto)
  const [remoteHandRaised, setRemoteHandRaised] = useState(false);
  const [remoteHandRole, setRemoteHandRole] = useState<string>("");

  const [showEvaluation, setShowEvaluation] = useState(false);
  const [, setHasExistingReview] = useState<boolean | null>(null);
  const [isAutoCancelled, setIsAutoCancelled] = useState(false);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [showModalReagendar, setShowModalReagendar] = useState(false);
  const [showModalAgendar, setShowModalAgendar] = useState(false);
  // Novos modais específicos para a sala
  const [showModalReagendarSala, setShowModalReagendarSala] = useState(false);
  const [showModalCancelarSala, setShowModalCancelarSala] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState<InactivityWarningData | null>(null);
  const [timeRemainingWarning, setTimeRemainingWarning] = useState<TimeRemainingWarningData | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessingExit, setIsProcessingExit] = useState(false);
  const router = useRouter();
  const isPsicologo = role === "PSYCHOLOGIST";
  const queryClient = useQueryClient();
  
  // Busca dados da consulta quando necessário (cancelar, agendar ou reagendar)
  // Garante que sempre tenha os dados quando necessário, especialmente para encontrar paciente
  // IMPORTANTE: Sempre busca quando for psicólogo e tiver consultationId, para garantir todos os dados
  const shouldFetchConsulta = (role === "PSYCHOLOGIST" && !!consultationId) || 
                              (showModalCancelar || showModalAgendar || showModalReagendar) && !!consultationId;
  const consultaIdToFetch = shouldFetchConsulta ? consultationId : undefined;
  const { consulta: consultaData, refetch: refetchConsulta } = useConsultaById(consultaIdToFetch);
  
  // Função auxiliar para extrair pacienteId de todas as fontes possíveis
  const getPacienteId = useCallback((): string => {
    return consultaCompletaData?.PacienteId ||
           (consultaCompletaData as Partial<{ Paciente: { Id: string } }>)?.Paciente?.Id ||
           consultaData?.pacienteId ||
           (consultaData as Partial<{ PacienteId: string; Paciente: { Id: string } }>)?.PacienteId ||
           (consultaData as Partial<{ Paciente: { Id: string } }>)?.Paciente?.Id ||
           reservaSessaoFinal?.Consulta?.PacienteId ||
           reservaSessaoFinal?.PatientId ||
           "";
  }, [consultaCompletaData, consultaData, reservaSessaoFinal]);
  
  // Função auxiliar para extrair psicologoId de todas as fontes possíveis
  const getPsicologoId = useCallback((): string => {
    return loggedUserId ||
           PsychologistId ||
           consultaCompletaData?.PsicologoId ||
           (consultaCompletaData as Partial<{ Psicologo: { Id: string } }>)?.Psicologo?.Id ||
           consultaData?.psicologoId ||
           (consultaData as Partial<{ PsicologoId: string; Psicologo: { Id: string } }>)?.PsicologoId ||
           (consultaData as Partial<{ Psicologo: { Id: string } }>)?.Psicologo?.Id ||
           reservaSessaoFinal?.PsychologistId ||
           "";
  }, [loggedUserId, PsychologistId, consultaCompletaData, consultaData, reservaSessaoFinal]);
  
  // Lifecycle para registrar entrada/saída via Socket (já declarado acima)
  
  // ✅ Função para verificar se o paciente já fez review para o psicólogo desta consulta
  // Verifica na tabela Review se existe um registro com UserId = loggedUserId e PsicologoId = PsychologistId da ReservaSessao
  // IMPORTANTE: Em caso de erro ou dados ausentes, sempre retorna false para garantir que o modal abra
  const verificarDepoimentoExistente = useCallback(async (): Promise<boolean> => {
    try {
      // ✅ Prioriza PsychologistId da ReservaSessao (vem das props ou do reservaSessaoFinal)
      const psychologistIdParaVerificar = PsychologistId || reservaSessaoFinal?.PsychologistId || getPsicologoId();
      
      if (!loggedUserId || !psychologistIdParaVerificar) {
        console.warn("⚠️ [SalaVideo] Dados insuficientes para verificar depoimento:", {
          loggedUserId: !!loggedUserId,
          PsychologistId: !!PsychologistId,
          psychologistIdParaVerificar: !!psychologistIdParaVerificar,
          reservaSessaoPsychologistId: !!reservaSessaoFinal?.PsychologistId
        });
        setHasExistingReview(null);
        return false;
      }

      console.log("🔍 [SalaVideo] Verificando review na tabela Review:", {
        userId: loggedUserId,
        psychologistId: psychologistIdParaVerificar,
        source: PsychologistId ? 'props' : (reservaSessaoFinal?.PsychologistId ? 'reservaSessao' : 'fallback')
      });

      // ✅ Verifica na tabela Review se existe registro com UserId = loggedUserId e PsicologoId = psychologistIdParaVerificar
      const response = await reviewService.hasPatientReviewedPsychologist(loggedUserId, psychologistIdParaVerificar);
      const hasReviewed = Boolean(response.data?.hasReviewed ?? response.data?.data?.hasReviewed ?? false);

      setHasExistingReview(hasReviewed);

      console.log("🔍 [SalaVideo] Resultado da verificação de review:", {
        loggedUserId,
        psychologistId: psychologistIdParaVerificar,
        hasReviewed,
        willShowModal: !hasReviewed
      });

      return hasReviewed;
    } catch (error) {
      console.error("❌ [SalaVideo] Erro ao verificar depoimento existente:", error);
      setHasExistingReview(false);
      console.warn("⚠️ [SalaVideo] Erro na verificação - permitindo avaliação por segurança");
      return false;
    }
  }, [loggedUserId, PsychologistId, reservaSessaoFinal, getPsicologoId]);

  // Função para verificar se ambos (paciente e psicólogo) estiveram na sala
  // Verifica diretamente se PatientJoinedAt e PsychologistJoinedAt não são null
  const verificarAmbosEstiveramNaSala = useCallback(async (): Promise<boolean> => {
    try {
      // Primeiro tenta usar os dados já carregados
      if (reservaSessao) {
        const ambosEstiveram = 
          reservaSessao.PatientJoinedAt !== null && 
          reservaSessao.PatientJoinedAt !== undefined &&
          reservaSessao.PsychologistJoinedAt !== null && 
          reservaSessao.PsychologistJoinedAt !== undefined;
        if (ambosEstiveram) {
          console.log("✅ [SalaVideo] Ambos estiveram na sala (dados em cache)", {
            PatientJoinedAt: reservaSessao.PatientJoinedAt,
            PsychologistJoinedAt: reservaSessao.PsychologistJoinedAt
          });
          return true;
        }
      }
      
      // Se não tiver os dados ou ambos não estiveram, busca novamente do backend
      await refetchReservaSessao();
      
      // Aguarda um pouco para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Busca diretamente do backend para garantir dados atualizados
      const response = await api.get(`/reserva-sessao/${consultationId}`);
      const reservaAtualizada = response.data?.data;
      
      if (reservaAtualizada) {
        const ambosEstiveram = 
          reservaAtualizada.PatientJoinedAt !== null && 
          reservaAtualizada.PatientJoinedAt !== undefined &&
          reservaAtualizada.PsychologistJoinedAt !== null && 
          reservaAtualizada.PsychologistJoinedAt !== undefined;
        console.log("🔍 [SalaVideo] Verificação de presença:", {
          PatientJoinedAt: reservaAtualizada.PatientJoinedAt,
          PsychologistJoinedAt: reservaAtualizada.PsychologistJoinedAt,
          ambosEstiveram
        });
        return ambosEstiveram;
      }
      
      return false;
    } catch (error) {
      console.error("❌ [SalaVideo] Erro ao verificar presença na sala:", error);
      // Em caso de erro, assume que não estiveram (mais seguro)
      return false;
    }
  }, [reservaSessao, refetchReservaSessao, consultationId]);

  // Função auxiliar para finalizar consulta (idempotente)
  // Retorna { requiresReview: boolean, psychologistId?: string } se ambos estiveram na sala
  const finalizarConsultaSeNecessario = useCallback(async (): Promise<{ requiresReview: boolean; psychologistId?: string } | null> => {
    if (!consultationIdString) return null;

    try {
      const ambosEstiveram = await verificarAmbosEstiveramNaSala();
      console.log("🔍 [SalaVideo] Verificando se ambos estiveram na sala para finalizar:", ambosEstiveram);
      
      if (ambosEstiveram) {
        // Ambos estiveram na sala - finaliza a consulta com verificação de review
        // O serviço já tem idempotência, então pode ser chamado múltiplas vezes sem problema
        console.log("✅ [SalaVideo] Ambos estiveram na sala - finalizando consulta com verificação de review");
        try {
          const { consultaService } = await import('@/services/consultaService');
          const response = await consultaService().finalizarConsultaComReview(consultationIdString);
          console.log("✅ [SalaVideo] Consulta finalizada com sucesso", {
            requiresReview: response.data.requiresReview,
            psychologistId: response.data.psychologistId
          });
          
          // Invalida queries para atualizar o painel com o status correto
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
            queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
            queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
          ]);
          await queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] });
          
          // Retorna informações sobre review
          return {
            requiresReview: response.data.requiresReview,
            psychologistId: response.data.psychologistId
          };
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao finalizar consulta:", error);
          // Não bloqueia o fluxo se houver erro na finalização
          return null;
        }
      } else {
        console.log("⚠️ [SalaVideo] Ambos não estiveram na sala - não será finalizada a consulta");
        return null;
      }
    } catch (error) {
      console.error("❌ [SalaVideo] Erro ao verificar presença na sala:", error);
      // Continua o fluxo mesmo se houver erro na verificação
      return null;
    }
  }, [consultationIdString, verificarAmbosEstiveramNaSala, queryClient]);
  
  // Log para debug do PsychologistId
  useEffect(() => {
    if (role === "PSYCHOLOGIST") {
      console.log('🔵 [SalaVideo] ===== DEBUG PSICOLOGIST ID =====');
      console.log('  - loggedUserId (do useAuthStore):', loggedUserId);
      console.log('  - PsychologistId prop recebido:', PsychologistId);
      console.log('  - consultaData?.psicologoId:', consultaData?.psicologoId);
      console.log('  - ID que será usado no modal:', loggedUserId || PsychologistId);
    }
  }, [loggedUserId, PsychologistId, consultaData, role]);

  // Ref para controlar encerramento automático (evitar múltiplas execuções)
  const autoEndTriggered = useRef(false);

  // Ref para controlar sincronização de duração (evitar envios repetidos)
  const lastSyncedDuration = useRef(0);
  const receivedRemoteDuration = useRef<number | null>(null);
  const receivedRemoteTimeRemaining = useRef<number | null>(null);
  const syncInitialized = useRef(false);

  const videoContainerId = "agora-video-container";
  
  // Estado consolidado para presença remota
  const [remotePresent, setRemotePresent] = useState(false);
  
  // Carrega preferências de dispositivos salvas
  const [devicePreferences, setDevicePreferences] = useState<Awaited<ReturnType<typeof loadDevicePreferences>>>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadDevicePreferences().then(setDevicePreferences).catch(console.error);
    }
  }, []);
 
  const {
    leaveRoom,
    localAudioTrack,
    localVideoTrack,
    joined,
    error,
    isConnecting,
    remoteVideoTracks
  } = useAgora({
    appId,
    channelName: channel,
    token,
    uid: uid,
    videoContainerId,
    devicePreferences: devicePreferences ? {
      cameraDeviceId: devicePreferences.cameraDeviceId,
      microphoneDeviceId: devicePreferences.microphoneDeviceId,
      audioOutputDeviceId: devicePreferences.audioOutputDeviceId,
    } : undefined,
    onUserPublished: (user, mediaType) => {
      console.log(`📡 [SalaVideo] Remoto publicou ${mediaType}, UID: ${user.uid}`);
      // Marca presença remota imediatamente quando qualquer mídia é publicada
      setRemotePresent(true);
    },
    onUserUnpublished: (user) => {
      console.log(`📴 [SalaVideo] Remoto despublicou, UID: ${user.uid}`);
      // Verifica se ainda há outros remotos
      if (Object.keys(remoteVideoTracks || {}).length === 0) {
        setRemotePresent(false);
      }
    }
  });
  
  // 🔍 LOG: Verificar tracks locais
  useEffect(() => {
    console.log('🔍 [SalaVideo] Estado dos tracks locais:', {
      hasLocalAudioTrack: !!localAudioTrack,
      hasLocalVideoTrack: !!localVideoTrack,
      joined,
      error,
      isConnecting
    });
  }, [localAudioTrack, localVideoTrack, joined, error, isConnecting]);

  // Verifica review assim que o paciente entra na sala (usa UserId e PsychologistId tipados)
  useEffect(() => {
    if (role !== "PATIENT" || !joined) return;
    void verificarDepoimentoExistente();
  }, [role, joined, verificarDepoimentoExistente]);
  
  useEffect(() => {
    if (!joined || !consultationIdString || !socket) return;

    // Garante conexão antes de fazer join
    const setupConsultationJoin = async () => {
      try {
        // Garante que o socket está conectado
        if (!isConnected) {
          console.log("🔌 [SalaVideo] Socket não conectado, aguardando conexão...");
          await ensureSocketConnection();
        }

        // Aguarda um pouco para garantir que a conexão está estável
        if (!socket.connected) {
          console.warn("⚠️ [SalaVideo] Socket ainda não conectado após ensureSocketConnection");
          return;
        }

        // Converte role para formato do backend
        const backendRole = role === "PATIENT" ? "Patient" : "Psychologist";
        
        // Notifica o backend via Socket que entrou na consulta
        await joinConsultation({
          consultationId: consultationIdString,
          userId: uid,
          role: backendRole
        });

        console.log("✅ [SalaVideo] Notificado backend - Usuário entrou na consulta", {
          consultationId: consultationIdString,
          userId: uid,
          role: backendRole
        });
      } catch (error) {
        console.error("❌ [SalaVideo] Erro ao fazer join na consulta:", error);
      }
    };

    setupConsultationJoin();

    return () => {
      if (joined && socket && socket.connected && consultationIdString) {
        // Notifica o backend via Socket que saiu da consulta
        try {
          leaveConsultation(consultationIdString, uid);
          console.log("🚪 [SalaVideo] Notificado backend - Usuário saiu da consulta", {
            consultationId: consultationIdString,
            userId: uid
          });
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao fazer leave da consulta:", error);
        }
      }
    };
  }, [joined, isConnected, consultationIdString, uid, role, socket]);

  // Garante que o socket esteja conectado quando necessário e monitora durante a consulta
  // Também garante que o socket entre na sala da consulta e escute os eventos corretos
  useEffect(() => {
    if (!joined || !consultationIdString || !socket) return;

    // Handlers para eventos da consulta
    const eventName = `consultation:${consultationIdString}`;
    const roomName = `consulta_${consultationIdString}`;
    let listenersSetup = false; // Flag para evitar listeners duplicados
    
    // Listener para eventos gerais da consulta (incluindo room-closed, inactivity-warning, etc)
    const consultationHandler = (data: { event?: string; consultationId?: string; [key: string]: unknown }) => {
      console.log("📥 [SalaVideo] Evento recebido da consulta:", data);
      
      // Trata eventos específicos
      if (data.event === "room-closed") {
        console.log("🚪 [SalaVideo] Sala fechada:", data);
        handleRoomClosed();
      } else if (data.event === "inactivity-warning") {
        console.log("⚠️ [SalaVideo] Aviso de inatividade:", data);
        // Pode adicionar lógica para avisar sobre inatividade
      }
    };

    // Listener para evento direto de fechamento de sala (enviado para o usuário específico)
    const roomClosedHandler = (data: { event?: string; consultationId?: string; reason?: string; message?: string }) => {
      console.log("🚪 [SalaVideo] Evento room-closed recebido diretamente:", data);
      if (data.consultationId === consultationIdString) {
        handleRoomClosed();
      }
    };

    // Listener para fechamento forçado quando outro participante sair
    const forceCloseRoomHandler = (data: { consultationId?: string; reason?: string; timestamp?: string }) => {
      console.log("🚪 [SalaVideo] Evento consultation:force-close-room recebido:", data);
      if (data.consultationId === consultationIdString) {
        console.log("✅ [SalaVideo] Outro participante saiu - fechando sala e redirecionando");
        handleForceCloseRoom();
      }
    };

    // Função para lidar com fechamento da sala
    const handleRoomClosed = async () => {
      console.log("🚪 [SalaVideo] Processando fechamento da sala");
      // Limpa a chamada e sai da sala via hook do Agora
      await leaveRoom();
      // Redireciona para o painel
      setTimeout(() => {
        if (role === "PSYCHOLOGIST") {
          router.push('/painel-psicologo');
        } else {
          router.push('/painel');
        }
      }, 1000);
    };

    // Função para lidar com fechamento forçado quando outro participante sair
    const handleForceCloseRoom = async () => {
      console.log("🚪 [SalaVideo] Processando fechamento forçado da sala (outro participante saiu)");
      
      // Notifica o backend que está saindo também
      if (isConnected && consultationIdString) {
        try {
          leaveConsultation(consultationIdString, String(uid));
          console.log("🚪 [SalaVideo] Notificado backend sobre saída após fechamento forçado");
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao notificar backend sobre saída:", error);
        }
      }
      
      // Limpa a chamada e sai da sala via hook do Agora
      await leaveRoom();
      
      // Redireciona para o painel correto baseado no role
      setTimeout(() => {
        if (role === "PSYCHOLOGIST") {
          router.push('/painel-psicologo');
        } else {
          router.push('/painel');
        }
      }, 500);
    };
    
    // Listener para sincronização de duração via Redis
    const durationHandler = (data: { consultationId?: string; currentDuration?: number; role?: string; userId?: string }) => {
      if (data.consultationId === consultationIdString) {
        console.log("⏱️ [SalaVideo] Sincronização de duração recebida (Redis):", data);
        // A sincronização já é tratada pelo listener existente, mas logamos aqui também
      }
    };

    // Função para garantir conexão e entrar na sala da consulta
    const ensureConnectionAndJoinRoom = () => {
      if (!socket) {
        console.warn("⚠️ [SalaVideo] Socket não disponível");
        return;
      }

      if (!isConnected) {
        console.log("🔌 [SalaVideo] Socket desconectado - tentando reconectar...");
        try {
          ensureSocketConnection();
          listenersSetup = false; // Reset flag quando desconecta
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao conectar socket:", error);
        }
        return; // Aguarda reconexão antes de configurar listeners
      }

      // Garante que o socket entre na sala da consulta para escutar eventos
      if (isConnected && socket && !listenersSetup) {
        console.log("🏠 [SalaVideo] Entrando na sala da consulta:", roomName);
        socket.emit("join-room", roomName);
        
        // Configura listeners apenas uma vez
        console.log("👂 [SalaVideo] Configurando listeners para eventos da consulta:", eventName);
        socket.on(eventName, consultationHandler);
        socket.on("session:duration-synced", durationHandler);
        socket.on("room-closed", roomClosedHandler); // Listener direto para fechamento
        socket.on("consultation:force-close-room", forceCloseRoomHandler); // Listener para fechamento forçado quando outro sair
        listenersSetup = true;
      } else if (isConnected && socket && listenersSetup) {
        // Apenas garante que está na sala, sem adicionar listeners novamente
        socket.emit("join-room", roomName);
      }
    };

    // Verifica imediatamente
    ensureConnectionAndJoinRoom();

    // Monitora a conexão a cada 10 segundos durante a consulta
    const monitorInterval = setInterval(async () => {
      if (!socket) return;
      
      if (!isConnected || !socket.connected) {
        console.warn("⚠️ [SalaVideo] Socket desconectado detectado - reconectando...");
        try {
          await ensureSocketConnection();
          // Aguarda um pouco para garantir que conectou
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (socket.connected) {
            ensureConnectionAndJoinRoom();
          }
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao reconectar socket:", error);
        }
      } else if (socket.connected) {
        // Mantém conexão ativa e garante que está na sala (sem adicionar listeners novamente)
        console.debug("✅ [SalaVideo] Socket conectado - mantendo conexão ativa e na sala");
        if (listenersSetup) {
          // Apenas garante que está na sala
          socket.emit("join-room", roomName);
        } else {
          // Se não configurou listeners ainda, configura agora
          ensureConnectionAndJoinRoom();
        }
      }
    }, 10000); // Verifica a cada 10 segundos

    return () => {
      clearInterval(monitorInterval);
      // Remove listeners ao desmontar
      if (socket) {
        console.log("🧹 [SalaVideo] Removendo listeners da consulta");
        socket.off(eventName, consultationHandler);
        socket.off("session:duration-synced", durationHandler);
        socket.off("room-closed", roomClosedHandler);
        socket.off("consultation:force-close-room", forceCloseRoomHandler);
        listenersSetup = false;
      }
    };
  }, [joined, consultationIdString, socket, isConnected, router, isPsicologo, leaveRoom, role, uid]);
  
  // Força busca de consulta se não tiver dados e for psicólogo (para garantir pacienteId)
  // Também busca quando qualquer modal for aberto para garantir que tenha todos os dados
  useEffect(() => {
    if (role === "PSYCHOLOGIST" && consultationId && joined) {
      if (!consultaData || showModalCancelar || showModalAgendar || showModalReagendar) {
        console.log("🔄 [SalaVideo] Buscando dados da consulta...", { 
          hasData: !!consultaData, 
          showModalCancelar, 
          showModalAgendar, 
          showModalReagendar 
        });
        refetchConsulta();
      }
    }
  }, [role, consultaData, consultationId, joined, refetchConsulta, showModalCancelar, showModalAgendar, showModalReagendar]);

  // Listener para quando outro usuário entrar na consulta
  useEffect(() => {
    if (!consultationIdString || !socket) return;

    const handleUserJoined = (data: { userId: string; role: string; joinedAt: Date }) => {
      console.log("👤 [SalaVideo] Usuário entrou na consulta:", data);
      
      // Se for paciente e o psicólogo conectou
      if (data.role === "Psychologist" && role === "PATIENT") {
        console.log("👨‍⚕️ [SalaVideo] Psicólogo conectou na consulta!");
        setRemotePresent(true);
        // Atualiza a reservaSessao para sincronizar as tags
        refetchReservaSessao();
      }
      
      // Se for psicólogo e o paciente conectou
      if (data.role === "Patient" && role === "PSYCHOLOGIST") {
        console.log("🧑 [SalaVideo] Paciente conectou na consulta!");
        setRemotePresent(true);
        // Atualiza a reservaSessao para sincronizar as tags
        refetchReservaSessao();
      }
    };

    const handlePrivacyMessage = (data: { message: string }) => {
      console.log("� [SalaVideo] Mensagem de privacidade:", data.message);
      // Você pode mostrar isso em um toast ou modal se desejar
    };

    // Listener para atualizações de status da sessão (sincroniza PatientJoinedAt/PsychologistJoinedAt)
    const handleSessionStatusUpdated = (data: SessionStatusUpdatedData) => {
      if (data.consultationId === consultationIdString) {
        console.log("🔄 [SalaVideo] Status da sessão atualizado, refazendo fetch da reservaSessao:", data);
        // Refaz o fetch para sincronizar as tags
        refetchReservaSessao();
      }
    };

    onUserJoinedConsultation(handleUserJoined, consultationIdString);
    onPrivacyMessage(handlePrivacyMessage);
    onSessionStatusUpdated(handleSessionStatusUpdated, consultationIdString);

    return () => {
      offUserJoinedConsultation();
      offPrivacyMessage();
      offSessionStatusUpdated(consultationIdString);
    };
  }, [consultationId, consultationIdString, socket, role, refetchReservaSessao]);

  // Listener para levantar/abaixar mão de outros participantes
  useEffect(() => {
    if (!socket || !isConnected || !consultationIdString) {
      console.log("✋ [SalaVideo] Listener de mão levantada não configurado:", {
        hasSocket: !!socket,
        isConnected,
        consultationId: consultationIdString
      });
      return;
    }

    console.log("✋ [SalaVideo] Configurando listener de mão levantada", {
      consultationId: consultationIdString,
      currentUserId: String(uid),
      role
    });

    const handleHandRaised = (data: { userId: string; role: string; isRaised: boolean }) => {
      console.log("✋ [SalaVideo] Evento recebido - Mão alterada:", {
        receivedData: data,
        currentUserId: String(uid),
        currentRole: role,
        currentUidType: typeof uid
      });
      
      // Converte roles para formato consistente para comparação
      const currentRoleNormalized = role === "PATIENT" ? "Patient" : "Psychologist";
      const receivedRoleNormalized = data.role;
      
      // Se o role é diferente, é definitivamente o outro participante
      // Isso é mais confiável do que comparar userId que pode ter problemas de tipo
      const isOtherParticipant = receivedRoleNormalized !== currentRoleNormalized;
      
      if (isOtherParticipant) {
        console.log("✋ [SalaVideo] Atualizando estado remoto da mão:", {
          isRaised: data.isRaised,
          role: data.role,
          receivedRole: receivedRoleNormalized,
          currentRole: currentRoleNormalized
        });
        
        // Atualiza o estado remoto
        setRemoteHandRaised(data.isRaised);
        setRemoteHandRole(data.role);
        
        if (data.isRaised) {
          console.log(`✋ [SalaVideo] ${data.role} levantou a mão!`);
          // Mostra notificação visual
          toast.success(
            `${data.role === "Patient" ? "Paciente" : "Psicólogo"} levantou a mão!`,
            {
              duration: 3000,
              position: "top-center",
              icon: "✋",
            }
          );
        } else {
          console.log(`👋 [SalaVideo] ${data.role} abaixou a mão!`);
        }
      } else {
        console.log("✋ [SalaVideo] Ignorando evento próprio da mão levantada", {
          receivedRole: receivedRoleNormalized,
          currentRole: currentRoleNormalized
        });
      }
    };

    onHandRaisedInConsultation(handleHandRaised);
    console.log("✅ [SalaVideo] Listener de mão levantada configurado com sucesso");

    return () => {
      console.log("🧹 [SalaVideo] Removendo listener de mão levantada");
      offHandRaisedInConsultation();
    };
  }, [socket, isConnected, uid, consultationId, consultationIdString, role]);

  // Listener para aviso de inatividade (30s antes dos 10min)
  useEffect(() => {
    if (!consultationIdString || !socket) return;

    const handleInactivityWarning = (data: InactivityWarningData) => {
      console.log("⚠️ [SalaVideo] Aviso de inatividade recebido:", data);
      setInactivityWarning(data);
      setCountdown(data.countdown || 30);
    };

    onInactivityWarning(handleInactivityWarning, consultationIdString);

    return () => {
      offInactivityWarning(consultationIdString);
    };
  }, [consultationIdString, socket]);

  // Listener para avisos de tempo restante (15, 10, 5, 3 minutos) via socket
  useEffect(() => {
    if (!consultationIdString || !socket) return;

    const handleTimeRemainingWarning = (data: TimeRemainingWarningData) => {
      console.log("⏰ [SalaVideo] Aviso de tempo restante recebido:", data);
      setTimeRemainingWarning(data);
    };

    onTimeRemainingWarning(handleTimeRemainingWarning, consultationIdString);

    return () => {
      offTimeRemainingWarning(consultationIdString);
    };
  }, [consultationIdString, socket]);

  // Contador regressivo para o aviso de inatividade
  useEffect(() => {
    if (!inactivityWarning || countdown === null) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [inactivityWarning, countdown]);

  // Listener para inatividade e cancelamento automático
  useEffect(() => {
    if (!consultationIdString || !socket) return;

    const handleInactivity = (data: { consultationId: string; message: string; missingRole: string; status: string }) => {
      console.log("⚠️ [SalaVideo] Inatividade detectada:", data);
      
      // Limpa o aviso se ainda estiver visível
      setInactivityWarning(null);
      setCountdown(null);
      
      // Mostra mensagem de erro
      toast.error(data.message || "A consulta foi cancelada automaticamente por inatividade.");
      
      // Fecha a sala após um breve delay para o usuário ver a mensagem
      setTimeout(() => {
        router.push(role === "PATIENT" ? "/painel" : "/painel-psicologo");
      }, 3000);
    };

    const handleStatusChanged = (data: { status: string; consultationId: string; reason?: string; autoCancelled?: boolean }) => {
      if (data.status === "cancelled" || (data.status === "Cancelado" && (data.reason === "inactivity" || data.autoCancelled))) {
        console.log("❌ [SalaVideo] Consulta cancelada por inatividade");
        setIsAutoCancelled(true); // Marca como cancelamento automático
        
        // Limpa o aviso se ainda estiver visível
        setInactivityWarning(null);
        setCountdown(null);
        
        toast.error("A consulta foi cancelada automaticamente.");
        
        // Fecha a sala
        setTimeout(() => {
          router.push(role === "PATIENT" ? "/painel" : "/painel-psicologo");
        }, 2000);
      }
    };

    const handleRoomClosed = (data: RoomClosedData) => {
      console.log("🚪 [SalaVideo] Sala fechada:", data);
      setIsAutoCancelled(true);
      
      // Limpa avisos
      setInactivityWarning(null);
      setCountdown(null);
      
      toast.error(data.message || "A sala foi fechada.");
      
      // Fecha a sala e redireciona
      leaveRoom();
      setTimeout(() => {
        router.push(role === "PATIENT" ? "/painel" : "/painel-psicologo");
      }, 2000);
    };

    onConsultationInactivity(handleInactivity, consultationIdString);
    onConsultationStatusChanged(handleStatusChanged, consultationIdString);
    onRoomClosed(handleRoomClosed, consultationIdString);

    return () => {
      offConsultationInactivity(consultationIdString);
      offConsultationStatusChanged(consultationIdString);
      offRoomClosed(consultationIdString);
    };
  }, [consultationIdString, socket, role, router, leaveRoom]);

  // Calcula duração baseado no horário da Agenda (em horário de Brasília)
  // O contador deve iniciar desde o horário da consulta na Agenda, independentemente de quando os usuários entram
  // IMPORTANTE: ScheduledAt é sempre a fonte da verdade - o contador começa às 13:00 mesmo se o usuário entrar às 13:10
  // Isso é importante porque se alguém entrar com 10 min de atraso, restam apenas 40 min da consulta
  // Usa a mesma lógica do calculateTimeRemaining para garantir consistência
  const calculateCallDuration = useCallback((): number => {
    try {
      // Prioriza: ScheduledAt (que já vem do banco em horário de Brasília) > consultaDate/Time
      // IMPORTANTE: Usa consultaData como fallback se reservaSessao não estiver disponível
      const scheduledAtToUse = scheduledAt || reservaSessao?.ScheduledAt;
      // Usa type casting para acessar propriedades que podem estar em diferentes formatos
      const consultaDataTyped = consultaData as Partial<{ Date?: string; date?: string; Time?: string; time?: string; Agenda?: { Data?: string; Horario?: string }; agenda?: { Data?: string; Horario?: string } }>;
      const consultaDateToUse = consultaDate || reservaSessao?.ConsultaDate || consultaDataTyped?.Date || consultaDataTyped?.date || consultaDataTyped?.Agenda?.Data || consultaDataTyped?.agenda?.Data;
      const consultaTimeToUse = consultaTime || reservaSessao?.ConsultaTime || consultaDataTyped?.Time || consultaDataTyped?.time || consultaDataTyped?.Agenda?.Horario || consultaDataTyped?.agenda?.Horario;
      
      console.log('⏱️ [calculateCallDuration] DEBUG - Verificando dados:', {
        scheduledAt,
        reservaSessaoScheduledAt: reservaSessao?.ScheduledAt,
        scheduledAtToUse,
        consultaDate,
        consultaTime,
        consultaDateToUse,
        consultaTimeToUse,
        consultaDataDate: consultaDataTyped?.Date || consultaDataTyped?.date,
        consultaDataTime: consultaDataTyped?.Time || consultaDataTyped?.time
      });
      
      if (scheduledAtToUse) {
        // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss' (já em horário de Brasília no banco)
        const [datePart, timePart] = scheduledAtToUse.split(' ');
        if (datePart && timePart) {
          // Usa a mesma abordagem do calculateTimeRemaining
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second = 0] = timePart.split(':').map(Number);
          
          // Cria a data/hora de início da consulta (interpreta como horário local do navegador)
          // IMPORTANTE: O ScheduledAt vem do banco como horário de Brasília, então assumimos que
          // o navegador do usuário está configurado corretamente ou que o servidor está em Brasília
          const inicioConsulta = new Date(year, month - 1, day, hour, minute, second);
          
          // Calcula o tempo decorrido desde o início programado em segundos
          // IMPORTANTE: Se o usuário entrar atrasado, calcula a diferença exata
          // Exemplo: programado 13:00, usuário entra 13:10 → retorna 600 segundos (10 minutos)
          // Isso mostra o tempo REAL já percorrido desde o início programado
          const agora = new Date();
          const diffMs = agora.getTime() - inicioConsulta.getTime();
          const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
          
          // DEBUG: Log sempre para verificar cálculo
          console.log('⏱️ [calculateCallDuration] Cálculo com ScheduledAt:', {
            scheduledAt: scheduledAtToUse,
            inicioConsulta: inicioConsulta.toLocaleString('pt-BR'),
            agora: agora.toLocaleString('pt-BR'),
            diffMs,
            diffSeconds,
            diffMinutes: Math.floor(diffSeconds / 60),
            diffSecondsFormatted: `${Math.floor(diffSeconds / 60)}:${String(diffSeconds % 60).padStart(2, '0')}`
          });
          
          return diffSeconds;
        }
      }
      
      // Fallback: usa consultaDate e consultaTime (mesma lógica do calculateTimeRemaining)
      // IMPORTANTE: Usa consultaData como fallback se props não estiverem disponíveis
      if (consultaDateToUse && consultaTimeToUse) {
        console.log('⏱️ [calculateCallDuration] Usando fallback consultaDate/Time');
        let inicioConsulta: Date;
        
        if (typeof consultaDateToUse === 'string') {
          const dateStr = consultaDateToUse.includes('T') ? consultaDateToUse.split('T')[0] : consultaDateToUse.split(' ')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hour, minute] = consultaTimeToUse.split(':').map(Number);
          inicioConsulta = new Date(year, month - 1, day, hour, minute, 0);
        } else {
          inicioConsulta = new Date(consultaDateToUse);
          const [hour, minute] = consultaTimeToUse.split(':').map(Number);
          inicioConsulta.setHours(hour, minute, 0, 0);
        }
        
        // Calcula o tempo decorrido desde o início em segundos
        const agora = new Date();
        const diffMs = agora.getTime() - inicioConsulta.getTime();
        const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
        
        console.log('⏱️ [calculateCallDuration] Cálculo com consultaDate/Time:', {
          consultaDate: consultaDateToUse,
          consultaTime: consultaTimeToUse,
          inicioConsulta: inicioConsulta.toLocaleString('pt-BR'),
          agora: agora.toLocaleString('pt-BR'),
          diffMs,
          diffSeconds,
          diffMinutes: Math.floor(diffSeconds / 60)
        });
        
        return diffSeconds;
      }
      
      // Fallback final: retorna 0 se não tiver dados
      console.warn('⏱️ [calculateCallDuration] NENHUM dado de horário disponível - retornando 0');
      return 0;
    } catch (error) {
      console.error('[SalaVideo] Erro ao calcular duração:', error);
      return 0;
    }
  }, [scheduledAt, reservaSessao?.ScheduledAt, reservaSessao?.ConsultaDate, reservaSessao?.ConsultaTime, consultaDate, consultaTime, consultaData]);

  // Usa o contador global compartilhado em vez de criar múltiplos setInterval
  // Isso reduz drasticamente o uso de CPU ao usar um único timer compartilhado
  const { timestamp } = useContadorGlobal();
  
  // Refs para as funções de cálculo para evitar recriação
  const calculateCallDurationRef = useRef(calculateCallDuration);
  const calculateTimeRemainingRef = useRef(calculateTimeRemaining);
  
  // Atualiza refs quando as funções mudarem
  useEffect(() => {
    calculateCallDurationRef.current = calculateCallDuration;
    calculateTimeRemainingRef.current = calculateTimeRemaining;
  }, [calculateCallDuration, calculateTimeRemaining]);

  // Atualiza duração imediatamente quando dados de scheduledAt/consultaDate/consultaTime mudarem
  // Isso garante que o timer mostre a duração correta mesmo antes de entrar na sala
  useEffect(() => {
    if (scheduledAtFinal || (consultaDate && consultaTime)) {
      const currentDuration = calculateCallDuration();
      console.log('⏱️ [SalaVideo] Dados de horário mudaram - atualizando duração:', currentDuration, 'segundos');
      setCallDuration(currentDuration);
    }
  }, [scheduledAtFinal, consultaDate, consultaTime, calculateCallDuration]);

  // Inicializa duração quando entrar na sala, baseado no horário da Agenda/ScheduledAt
  // IMPORTANTE: Calcula a diferença exata entre ScheduledAt e agora
  // Se o usuário entrar atrasado, já mostra o tempo percorrido desde o início programado
  useEffect(() => {
    if (joined) {
      const scheduledAtToUse = scheduledAtFinal;
      const initialDuration = calculateCallDuration();
      const initialTimeRemaining = calculateTimeRemaining();
      
      console.log('⏱️ [SalaVideo] ===== USUÁRIO ENTROU NA SALA =====');
      console.log('  - Joined:', joined);
      console.log('  - ScheduledAt (horário programado):', scheduledAtToUse);
      console.log('  - Duração calculada (tempo já percorrido):', initialDuration, 'segundos');
      console.log('  - Duração formatada:', Math.floor(initialDuration / 60) + 'min ' + (initialDuration % 60) + 's');
      console.log('  - Tempo restante:', initialTimeRemaining, 'segundos');
      console.log('  - Tempo restante formatado:', Math.floor(initialTimeRemaining / 60) + 'min ' + (initialTimeRemaining % 60) + 's');
      
      if (scheduledAtToUse && initialDuration > 0) {
        const [datePart, timePart] = scheduledAtToUse.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute] = timePart.split(':').map(Number);
          const inicioProgramado = new Date(year, month - 1, day, hour, minute, 0);
          const agora = new Date();
          const minutosAtraso = Math.floor(initialDuration / 60);
          
          console.log('  - Horário programado:', inicioProgramado.toLocaleString('pt-BR'));
          console.log('  - Horário atual:', agora.toLocaleString('pt-BR'));
          
          if (minutosAtraso > 0) {
            console.log('  ⚠️ USUÁRIO ENTROU ATRASADO!');
            console.log('  ⚠️ A consulta já estava em andamento há', minutosAtraso, 'minuto(s)');
            console.log('  ✅ O contador mostrará o tempo REAL já percorrido desde o início programado');
          } else {
            console.log('  ✅ Usuário entrou no horário programado');
          }
        }
      }
      console.log('===========================================');
      
      setCallDuration(initialDuration);
      setTimeRemaining(initialTimeRemaining);
    } else {
      console.log('⏱️ [SalaVideo] Aguardando joined=true para iniciar timer...');
    }
  }, [joined, scheduledAtFinal, reservaSessao?.ScheduledAt, scheduledAt, consultaDate, consultaTime, calculateCallDuration, calculateTimeRemaining]);

  // Busca duração inicial do Redis quando entrar na sala
  // IMPORTANTE: ScheduledAt é sempre a fonte da verdade - recalcula se necessário
  useEffect(() => {
    if (!consultationIdString || !joined) return;

    const fetchDurationFromRedis = async () => {
      try {
        const { reservaSessaoService } = await import('@/services/reservaSessaoService');
        const response = await reservaSessaoService().getSessionDuration(consultationIdString);
        const durationData = response.data?.data;

        // Calcula duração baseada no ScheduledAt (fonte da verdade)
        const durationFromScheduledAt = calculateCallDuration();
        const timeRemainingFromScheduledAt = calculateTimeRemaining();

        if (durationData && durationData.duration !== undefined) {
          console.log("📥 [SalaVideo] Duração recuperada do Redis:", {
            duration: durationData.duration,
            timeRemaining: durationData.timeRemaining,
            durationFromScheduledAt,
            timeRemainingFromScheduledAt
          });

          // SEMPRE prioriza o cálculo baseado no ScheduledAt
          // O Redis pode ter valores desatualizados, então usamos ScheduledAt como fonte da verdade
          console.log("✅ [SalaVideo] Usando cálculo baseado no ScheduledAt (fonte da verdade)");
          setCallDuration(durationFromScheduledAt);
          setTimeRemaining(timeRemainingFromScheduledAt);
          
          // Atualiza as referências para sincronização
          receivedRemoteDuration.current = durationFromScheduledAt;
          receivedRemoteTimeRemaining.current = timeRemainingFromScheduledAt;
        } else {
          console.log("ℹ️ [SalaVideo] Nenhuma duração encontrada no Redis - usando cálculo baseado no ScheduledAt");
          setCallDuration(durationFromScheduledAt);
          setTimeRemaining(timeRemainingFromScheduledAt);
        }
      } catch (error: unknown) {
        // Se for 404, apenas loga como aviso (endpoint pode não estar disponível)
        if (isAxiosError(error) && error.response?.status === 404) {
          console.warn("⚠️ [SalaVideo] Endpoint de session-duration não encontrado (404) - usando cálculo baseado no ScheduledAt");
        } else {
          console.error("❌ [SalaVideo] Erro ao buscar duração do Redis - usando cálculo baseado no ScheduledAt:", error);
        }
        // Sempre usa cálculo baseado no ScheduledAt em caso de erro
        const durationFromScheduledAt = calculateCallDuration();
        const timeRemainingFromScheduledAt = calculateTimeRemaining();
        setCallDuration(durationFromScheduledAt);
        setTimeRemaining(timeRemainingFromScheduledAt);
      }
    };

    fetchDurationFromRedis();
  }, [consultationIdString, joined, calculateCallDuration, calculateTimeRemaining]);

  // Listener para sincronização de duração e tempo restante via socket
  useEffect(() => {
    if (!consultationIdString || !socket || !isConnected || !joined) return;

    const handleDurationSync = (data: SyncSessionDurationData) => {
      // Ignora sincronização do próprio usuário
      const currentRoleNormalized = role === "PATIENT" ? "Patient" : "Psychologist";
      if (data.role === currentRoleNormalized) return;

      // IMPORTANTE: ScheduledAt é sempre a fonte da verdade
      // Recalcula baseado no ScheduledAt ao invés de usar o valor recebido
      const durationFromScheduledAt = calculateCallDuration();
      const timeRemainingFromScheduledAt = calculateTimeRemaining();

      console.log("📥 [SalaVideo] Recebido sincronização de duração/tempo:", {
        durationReceived: data.currentDuration,
        durationFromScheduledAt,
        fromRole: data.role
      });

      // SEMPRE usa o cálculo baseado no ScheduledAt (fonte da verdade)
      console.log("✅ [SalaVideo] Usando cálculo baseado no ScheduledAt (fonte da verdade) ao invés do valor recebido");
      setCallDuration(durationFromScheduledAt);
      setTimeRemaining(timeRemainingFromScheduledAt);
      receivedRemoteDuration.current = durationFromScheduledAt;
      receivedRemoteTimeRemaining.current = timeRemainingFromScheduledAt;
    };

    onSessionDurationSync(handleDurationSync, consultationIdString);

    return () => {
      offSessionDurationSync(consultationIdString);
    };
  }, [consultationIdString, socket, isConnected, joined, role, calculateCallDuration, calculateTimeRemaining]);

  // Envia sincronização de duração quando entrar na sala ou quando a duração mudar significativamente
  // A sincronização é salva no Redis pelo backend
  useEffect(() => {
    if (!consultationIdString || !socket || !isConnected || !joined) return;

      // Envia sincronização inicial quando entrar na sala
      // IMPORTANTE: Sempre calcula baseado no ScheduledAt (fonte da verdade)
      if (!syncInitialized.current) {
        // Aguarda um pouco para garantir que os dados foram carregados
        const syncTimeout = setTimeout(() => {
          // SEMPRE calcula baseado no ScheduledAt, não usa valores do Redis
          const initialDuration = calculateCallDuration();
          const initialTimeRemaining = calculateTimeRemaining();
          
          sendSessionDurationSync({
            consultationId: consultationIdString,
            userId: String(uid),
            role: role === "PATIENT" ? "Patient" : "Psychologist",
            currentDuration: initialDuration,
            timestamp: Date.now()
          });

          syncInitialized.current = true;
          lastSyncedDuration.current = initialDuration;
          console.log("📤 [SalaVideo] Sincronização inicial enviada (baseada no ScheduledAt):", {
            duration: initialDuration,
            timeRemaining: initialTimeRemaining,
            scheduledAt: scheduledAt || reservaSessao?.ScheduledAt
          });
        }, 1000); // Aguarda 1 segundo para garantir que os dados foram carregados

        return () => clearTimeout(syncTimeout);
      }

    // Envia sincronização a cada 5 segundos
    // IMPORTANTE: Sempre recalcula baseado no ScheduledAt (fonte da verdade)
    const syncInterval = setInterval(() => {
      // SEMPRE recalcula baseado no ScheduledAt ao invés de usar valores em cache
      const currentDuration = calculateCallDuration();
      
      // Só envia se a duração mudou significativamente (mais de 2 segundos)
      if (Math.abs(currentDuration - lastSyncedDuration.current) > 2) {
        sendSessionDurationSync({
          consultationId: consultationIdString,
          userId: String(uid),
          role: role === "PATIENT" ? "Patient" : "Psychologist",
          currentDuration: currentDuration,
          timestamp: Date.now()
        });
        lastSyncedDuration.current = currentDuration;
        console.log("📤 [SalaVideo] Sincronização enviada (baseada no ScheduledAt):", currentDuration, "segundos");
      }
    }, 5000); // Envia a cada 5 segundos

    return () => {
      clearInterval(syncInterval);
    };
  }, [consultationIdString, socket, isConnected, joined, uid, role, scheduledAt, reservaSessao?.ScheduledAt, calculateCallDuration, calculateTimeRemaining]);

  // Contador de duração (progressivo) - OTIMIZADO: usa useContadorGlobal em vez de setInterval
  // IMPORTANTE: ScheduledAt é sempre a fonte da verdade - o contador começa desde o horário programado
  // O contador conta desde o horário de início da consulta (ScheduledAt) baseado no timestamp global
  // Exemplo: se programado para 13:00, o contador já mostra o tempo decorrido desde 13:00
  // OTIMIZAÇÃO: Usa um único timer global compartilhado em vez de múltiplos setInterval
  useEffect(() => {
    // Verifica se tem dados de horário (ScheduledAt é prioridade)
    const scheduledAtToUse = scheduledAt || reservaSessao?.ScheduledAt;
    const hasTimeData = scheduledAtToUse || (consultaDate && consultaTime);
    
    if (hasTimeData) {
      // SEMPRE calcula baseado no ScheduledAt (fonte da verdade)
      // Usa o timestamp global para recalcular apenas quando necessário
      const currentDuration = calculateCallDurationRef.current();
      const currentTimeRemaining = calculateTimeRemainingRef.current();
      
      setCallDuration(currentDuration);
      setTimeRemaining(currentTimeRemaining);
    }
    // Atualiza quando o timestamp global muda (a cada segundo) ou quando dados de horário mudam
  }, [timestamp, scheduledAt, reservaSessao?.ScheduledAt, consultaDate, consultaTime]);

  // Resetar estado quando entrar na sala
  useEffect(() => {
    if (joined) {
      autoEndTriggered.current = false;
    }
  }, [joined]);

  // Contador regressivo (tempo restante baseado na data/hora de início + 60 minutos) - OTIMIZADO
  // Sincronizado via socket quando o outro participante entrar
  // OTIMIZAÇÃO: Usa useContadorGlobal em vez de setInterval separado
  useEffect(() => {
    // Se recebeu tempo restante remoto, usa ele; senão recalcula baseado em ScheduledAt
    if (receivedRemoteTimeRemaining.current !== null) {
      setTimeRemaining(receivedRemoteTimeRemaining.current);
      receivedRemoteTimeRemaining.current = null; // Limpa após usar
      return;
    }
    
    // Recalcula o tempo restante baseado em ScheduledAt quando o timestamp global atualiza
    // Usa ScheduledAt da prop, ReservaSessao ou consultaDate/Time
    const scheduledAtToUse = scheduledAt || reservaSessao?.ScheduledAt;
    const hasTimeData = scheduledAtToUse || (consultaDate && consultaTime);
    
    if (hasTimeData) {
      const newTimeRemaining = calculateTimeRemainingRef.current();
      // Só atualiza se o tempo restante for válido (> 0)
      if (newTimeRemaining >= 0) {
        setTimeRemaining(newTimeRemaining);
      }
    }
  }, [timestamp, scheduledAt, reservaSessao?.ScheduledAt, consultaDate, consultaTime]);

  // Encerramento automático quando o tempo chegar a 0
  useEffect(() => {
    if (!joined || timeRemaining > 0 || autoEndTriggered.current) return;

    // Marca que o encerramento foi acionado para evitar múltiplas execuções
    autoEndTriggered.current = true;

    console.log("⏰ [SalaVideo] Tempo esgotado! Encerrando consulta automaticamente...", {
      role,
      consultationId
    });

    // Função assíncrona para lidar com o encerramento
    const handleAutoEnd = async () => {
      // Quando a consulta completa 60 minutos, assume que houve consulta
      // Passo 1: PRIMEIRO finaliza a sessão (marca como concluído conforme regra)
      console.log("⏰ [SalaVideo] [AUTO-END] Consulta completou 60 minutos - finalizando sessão...");
      console.log("  - Passo 1: Verificando se ambos estiveram na sala...");
      
      const ambosEstiveram = await verificarAmbosEstiveramNaSala();
      console.log("  - Resultado verificação ambos estiveram:", ambosEstiveram);
      
      // Quando a consulta completa 60 minutos, assume que houve consulta
      // Passo 2: SEMPRE finaliza a consulta (atualiza status para Realizada e marca Agenda/ReservaSessao como Concluido)
      // Isso também limpa os tokens do Agora e processa o repasse
      console.log("  - Passo 2: Finalizando consulta (atualizando status em todas as tabelas) e verificando review...");
      console.log("  - NOTA: Como completou 60 minutos, assume que houve consulta");
      
      let finalizacaoResult: { requiresReview: boolean; psychologistId?: string } | null = null;
      
      try {
        // Tenta finalizar normalmente primeiro
        finalizacaoResult = await finalizarConsultaSeNecessario();
        console.log("✅ [SalaVideo] [AUTO-END] Consulta finalizada - status atualizados (Realizada/Concluido) e tokens limpos");
      } catch (error) {
        // Se a finalização falhar (ex: ambos não estiveram), força a finalização
        // pois completou 60 minutos, então assume que houve consulta
        console.log("⚠️ [SalaVideo] [AUTO-END] Finalização normal falhou, mas como completou 60 minutos, força finalização");
        console.log("  - Erro da finalização normal:", error);
        console.log("  - Tentando finalizar com forceFinalize=true via API...");
        
        try {
          const { consultaService } = await import('@/services/consultaService');
          // Força finalização quando completa 60 minutos (assume que houve consulta)
          const response = await consultaService().finalizarConsultaComReview(consultationIdString, true);
          finalizacaoResult = {
            requiresReview: response.data.requiresReview,
            psychologistId: response.data.psychologistId
          };
          console.log("✅ [SalaVideo] [AUTO-END] Consulta finalizada via API (forceFinalize=true) - status atualizados e tokens limpos");
          
          // Invalida queries
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
            queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
            queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
          ]);
        } catch (apiError) {
          console.error("❌ [SalaVideo] [AUTO-END] Erro ao finalizar via API:", apiError);
          // Mesmo se falhar, notifica backend para limpar tokens
          console.log("  - Notificando backend para limpar tokens mesmo assim");
        }
      }

      // Passo 3: Notifica o backend que está saindo (isso fecha a sala e limpa tokens se ainda não foi feito)
      if (isConnected && consultationIdString) {
        leaveConsultation(consultationIdString, String(uid));
        console.log("🚪 [SalaVideo] [AUTO-END] Notificado backend - sala será fechada e tokens limpos");
      }

      // Passo 4: Desconecta da sala Agora.io
      leaveRoom();

      // Comportamento diferenciado por role
      if (role === "PATIENT") {
        // Para paciente: usa resultado da finalização para verificar se precisa de review
        console.log("🔍 [SalaVideo] [AUTO-END] [PACIENTE] Verificando se precisa abrir modal de avaliação...");
        console.log("  - Resultado finalização:", finalizacaoResult);
        
        if (finalizacaoResult?.requiresReview && ambosEstiveram) {
          // Precisa de review e ambos estiveram - abre modal de avaliação
          console.log("✅ [SalaVideo] [AUTO-END] [PACIENTE] CONDIÇÕES ATENDIDAS - Abrindo modal de avaliação");
          console.log("  - Ambos estiveram na sala: ✅");
          console.log("  - Precisa de review: ✅");
          setShowEvaluation(true);
          return; // Não redireciona, deixa o modal abrir
        } else {
          // Não precisa de review (já existe) ou psicólogo não esteve - apenas redireciona
          console.log("ℹ️ [SalaVideo] [AUTO-END] [PACIENTE] Review já existe ou psicólogo não esteve - redirecionando");
          console.log("  - Ambos estiveram na sala:", ambosEstiveram);
          console.log("  - Precisa de review:", finalizacaoResult?.requiresReview || false);
          setTimeout(() => {
            router.push("/painel");
          }, 500);
        }
      } else if (role === "PSYCHOLOGIST") {
        // Para psicólogo: redireciona para o painel
        console.log("👨‍⚕️ [SalaVideo] [AUTO-END] [PSICÓLOGO] Redirecionando psicólogo para o painel");
        setTimeout(() => {
          router.push("/painel-psicologo");
        }, 500);
      }
    };

    handleAutoEnd();
  }, [timeRemaining, joined, role, consultationId, consultationIdString, isConnected, uid, leaveRoom, router, verificarAmbosEstiveramNaSala, verificarDepoimentoExistente, finalizarConsultaSeNecessario, queryClient]);

  // Intercepta tentativa de fechar navegador/tab (apenas para paciente) - dispara ação de finalizar sessão e abrir modal
  useEffect(() => {
    if (role !== "PATIENT" || !joined || isAutoCancelled || showEvaluation) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Previne fechamento para permitir verificação assíncrona
      e.preventDefault();
      e.returnValue = '';
      
      // Faz verificação assíncrona e finaliza consulta se necessário
      (async () => {
        try {
          if (consultationIdString) {
            console.log("🔍 [SalaVideo] [BEFOREUNLOAD] [PACIENTE] Janela sendo fechada - iniciando processo de finalização...");
            console.log("  - Passo 1: Verificando se ambos estiveram na sala...");
            
            const ambosEstiveram = await verificarAmbosEstiveramNaSala();
            console.log("  - Resultado verificação ambos estiveram:", ambosEstiveram);
            
            if (ambosEstiveram) {
              // Passo 2: PRIMEIRO finaliza a sessão (marca como concluído conforme regra) e verifica review
              console.log("  - Passo 2: Finalizando consulta (atualizando status em todas as tabelas) e verificando review...");
              const finalizacaoResult = await finalizarConsultaSeNecessario();
              console.log("✅ [SalaVideo] [BEFOREUNLOAD] Consulta finalizada antes de fechar janela");
              console.log("  - Resultado finalização:", finalizacaoResult);
              
              if (finalizacaoResult?.requiresReview) {
                // Precisa de review - salva flag para mostrar modal se a página não for fechada
                const psychologistIdParaReview = finalizacaoResult.psychologistId || PsychologistId || '';
                console.log("✅ [SalaVideo] [BEFOREUNLOAD] [PACIENTE] CONDIÇÕES ATENDIDAS - Salvando flag para abrir modal");
                console.log("  - Consulta finalizada: ✅");
                console.log("  - Ambos estiveram na sala: ✅");
                console.log("  - Precisa de review: ✅");
                
                // Salva flag para mostrar modal se a página não for fechada (usuário cancelar o fechamento)
                sessionStorage.setItem('shouldShowEvaluation', 'true');
                sessionStorage.setItem('evaluationConsultationId', consultationIdString);
                sessionStorage.setItem('evaluationPsychologistId', psychologistIdParaReview);
                
                // Tenta mostrar modal imediatamente (pode não funcionar se a página for fechada)
                setShowEvaluation(true);
              } else {
                console.log("ℹ️ [SalaVideo] [BEFOREUNLOAD] [PACIENTE] Review já existe - modal não será aberto");
              }
            } else {
              console.log("❌ [SalaVideo] [BEFOREUNLOAD] [PACIENTE] Psicólogo não esteve na sala - modal não será aberto");
            }
          }
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao processar beforeunload:", error);
        }
      })();
      
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [role, joined, isAutoCancelled, showEvaluation, consultationIdString, PsychologistId, finalizarConsultaSeNecessario, verificarAmbosEstiveramNaSala, verificarDepoimentoExistente]);
  
  // Intercepta navegação de voltar (popstate) para paciente e prepara avaliação quando aplicável
  useEffect(() => {
    if (role !== "PATIENT" || !joined || isAutoCancelled || showEvaluation) return;

    const handlePopState = async () => {
      try {
        if (!consultationIdString) return;
        const ambosEstiveram = await verificarAmbosEstiveramNaSala();
        if (!ambosEstiveram) return;
        const jaExisteDepoimento = await verificarDepoimentoExistente();
        if (!jaExisteDepoimento) {
          await finalizarConsultaSeNecessario();
          setShowEvaluation(true);
        }
      } catch (error) {
        console.error("❌ [SalaVideo] Erro ao processar popstate:", error);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [role, joined, isAutoCancelled, showEvaluation, consultationIdString, finalizarConsultaSeNecessario, verificarAmbosEstiveramNaSala, verificarDepoimentoExistente]);
  
  // Verifica se deve mostrar modal ao carregar (se voltou após beforeunload)
  // Também verifica se deve abrir modal quando entrar na sala (se ambos estiveram e não há review)
  useEffect(() => {
    if (role !== "PATIENT" || !joined || showEvaluation) return;
    
    // Verifica flag do sessionStorage (se voltou após beforeunload)
    const shouldShow = sessionStorage.getItem('shouldShowEvaluation');
    const savedConsultationId = sessionStorage.getItem('evaluationConsultationId');
    
    if (shouldShow === 'true' && savedConsultationId === consultationIdString) {
      console.log("✅ [SalaVideo] [LOAD] [PACIENTE] Flag de avaliação encontrada - verificando condições para abrir modal");
      
      // Verifica novamente se ambos estiveram e se não há review (pode ter mudado)
      (async () => {
        try {
          const ambosEstiveram = await verificarAmbosEstiveramNaSala();
          if (ambosEstiveram) {
            const jaExisteDepoimento = await verificarDepoimentoExistente();
            if (!jaExisteDepoimento) {
              console.log("✅ [SalaVideo] [LOAD] [PACIENTE] Condições atendidas - abrindo modal de avaliação");
              sessionStorage.removeItem('shouldShowEvaluation');
              sessionStorage.removeItem('evaluationConsultationId');
              sessionStorage.removeItem('evaluationPsychologistId');
              setShowEvaluation(true);
            } else {
              console.log("ℹ️ [SalaVideo] [LOAD] [PACIENTE] Já existe depoimento - modal não será aberto");
            }
          } else {
            console.log("❌ [SalaVideo] [LOAD] [PACIENTE] Ambos não estiveram na sala - modal não será aberto");
          }
        } catch (error) {
          console.error("❌ [SalaVideo] Erro ao verificar condições para modal:", error);
        }
      })();
      return;
    }
    
    // Verifica se deve abrir modal quando entrar na sala (se ambos estiveram e não há review)
    // Aguarda um pouco para garantir que os dados foram carregados
    const checkTimer = setTimeout(async () => {
      try {
        console.log("🔍 [SalaVideo] [LOAD] [PACIENTE] Verificando se deve abrir modal de avaliação ao entrar na sala...");
        
        const ambosEstiveram = await verificarAmbosEstiveramNaSala();
        console.log("  - Resultado verificação ambos estiveram:", ambosEstiveram);
        
        if (ambosEstiveram) {
          // IMPORTANTE: Se houver erro na verificação, assume que não existe (permite avaliação)
          const jaExisteDepoimento = await verificarDepoimentoExistente();
          console.log("  - Resultado verificação depoimento:", jaExisteDepoimento);
          
          if (!jaExisteDepoimento) {
            // NÃO existe depoimento - SEMPRE abre modal de avaliação
            console.log("✅ [SalaVideo] [LOAD] [PACIENTE] CONDIÇÕES ATENDIDAS - Abrindo modal de avaliação");
            console.log("  - Ambos estiveram na sala: ✅");
            console.log("  - Não existe depoimento: ✅");
            setShowEvaluation(true);
          } else {
            console.log("ℹ️ [SalaVideo] [LOAD] [PACIENTE] Já existe depoimento - modal não será aberto");
          }
        } else {
          console.log("ℹ️ [SalaVideo] [LOAD] [PACIENTE] Aguardando psicólogo entrar ou ambos não estiveram - modal não será aberto ainda");
        }
      } catch (error) {
        console.error("❌ [SalaVideo] [LOAD] [PACIENTE] Erro ao verificar condições para modal:", error);
        // Em caso de erro, não abre modal (será verificado novamente ao sair)
      }
    }, 2000); // Aguarda 2 segundos para garantir que os dados foram carregados
    
    return () => clearTimeout(checkTimer);
  }, [role, joined, showEvaluation, consultationIdString, verificarAmbosEstiveramNaSala, verificarDepoimentoExistente]);


  // Toggle câmera
  const toggleCamera = async () => {
    console.log("📹 [SalaVideo] toggleCamera chamado:", {
      hasLocalVideoTrack: !!localVideoTrack,
      camOn,
      joined,
      error
    });
    
    if (localVideoTrack) {
      try {
        const newState = !camOn;
        await localVideoTrack.setEnabled(newState);
        setCamOn(newState);
        console.log(`✅ [SalaVideo] Câmera ${newState ? 'habilitada' : 'desabilitada'}`);
        
        // Se habilitou, garante que está reproduzindo
        if (newState && localVideoRef.current) {
          try {
            localVideoTrack.play(localVideoRef.current, { fit: 'cover', mirror: true });
            console.log('✅ [SalaVideo] Vídeo local reproduzindo após habilitar');
          } catch (playError) {
            console.error('❌ [SalaVideo] Erro ao reproduzir vídeo após habilitar:', playError);
          }
        }
      } catch (err) {
        console.error("❌ [SalaVideo] Erro ao alternar câmera:", err);
        toast.error("Erro ao ativar/desativar câmera");
      }
    } else {
      // Só mostra erro se realmente não há track E já tentou conectar
      if (joined || isConnecting) {
        console.warn('⚠️ [SalaVideo] localVideoTrack não disponível para toggle', {
          localVideoTrack: !!localVideoTrack,
          joined,
          error,
          isConnecting
        });
        // Não mostra toast se ainda está conectando - aguarda a inicialização
        if (!isConnecting) {
          toast.error("Câmera não inicializada. Verifique as permissões.");
        }
      }
    }
  };

  // Toggle microfone
  const toggleMic = () => {
    console.log("🎤 [SalaVideo] toggleMic chamado:", {
      hasLocalAudioTrack: !!localAudioTrack,
      micOn,
      joined,
      error
    });
    
    if (localAudioTrack) {
      const newState = !micOn;
      try {
        localAudioTrack.setEnabled(newState);
        setMicOn(newState);
        console.log(`✅ [SalaVideo] Microfone ${newState ? 'habilitado' : 'desabilitado'}`);
      } catch (error) {
        console.error('❌ [SalaVideo] Erro ao alternar microfone:', error);
        toast.error("Erro ao ativar/desativar microfone");
      }
    } else {
      // Só mostra erro se realmente não há track E já tentou conectar
      if (joined || isConnecting) {
        console.warn('⚠️ [SalaVideo] localAudioTrack não disponível para toggle', {
          localAudioTrack: !!localAudioTrack,
          joined,
          error,
          isConnecting
        });
        // Não mostra toast se ainda está conectando - aguarda a inicialização
        if (!isConnecting) {
          toast.error("Microfone não inicializado. Verifique as permissões.");
        }
      }
    }
  };

  // Função para fechar a sala quando ambos estão logados - segue regras pré-estabelecidas
  // Esta função é chamada ao clicar em "Sair" e segue todas as regras:
  // 1. Verifica se ambos estiveram na sala
  // 2. Finaliza a consulta se ambos estiveram
  // 3. Abre modal de avaliações para paciente se necessário
  const fecharSalaAmbosLogados = useCallback(async () => {
    console.log("🔒 [SalaVideo] ===== FECHANDO SALA (AMBOS LOGADOS) =====");
    console.log("  - Dados disponíveis para validações:");
    console.log("    - loggedUser:", loggedUser ? { Id: loggedUser.Id, Nome: loggedUser.Nome, Role: loggedUser.Role } : null);
    console.log("    - loggedUserId:", loggedUserId);
    console.log("    - consultationId:", consultationIdString);
    console.log("    - reservaSessao:", reservaSessao ? {
      Id: reservaSessao.Id,
      PatientJoinedAt: reservaSessao.PatientJoinedAt,
      PsychologistJoinedAt: reservaSessao.PsychologistJoinedAt,
      Status: reservaSessao.Status
    } : null);
    console.log("    - consultaCompleta:", consultaCompleta ? {
      Consulta: consultaCompleta.Consulta ? { Id: consultaCompleta.Consulta.Id, Status: consultaCompleta.Consulta.Status } : null,
      ReservaSessao: consultaCompleta.ReservaSessao ? { Id: consultaCompleta.ReservaSessao.Id } : null,
      Agenda: consultaCompleta.Agenda ? { Id: consultaCompleta.Agenda.Id, Status: consultaCompleta.Agenda.Status } : null
    } : null);
    console.log("    - consultaData:", consultaData ? { id: consultaData.id, status: consultaData.status } : null);
    console.log("    - PsychologistId:", PsychologistId);
    
    try {
      // Verifica se ambos estiveram na sala
      const ambosEstiveram = await verificarAmbosEstiveramNaSala();
      console.log("  - Ambos estiveram na sala:", ambosEstiveram);
      
      if (ambosEstiveram) {
        // Finaliza a consulta e verifica review
        const finalizacaoResult = await finalizarConsultaSeNecessario();
        console.log("✅ [SalaVideo] Consulta finalizada");
        console.log("  - Resultado finalização:", finalizacaoResult);
        
        // Se for paciente, verifica se precisa abrir modal de avaliações
        if (role === "PATIENT" && finalizacaoResult?.requiresReview) {
          console.log("✅ [SalaVideo] Abrindo modal de avaliações para paciente");
          setShowEvaluation(true);
          return true; // Indica que o modal foi aberto
        }
      }
      
      return false; // Indica que não foi necessário abrir modal
    } catch (error) {
      console.error("❌ [SalaVideo] Erro ao fechar sala:", error);
      return false;
    }
  }, [loggedUser, loggedUserId, consultationIdString, reservaSessao, consultaCompleta, consultaData, PsychologistId, role, verificarAmbosEstiveramNaSala, finalizarConsultaSeNecessario, setShowEvaluation]);

  const handleLeave = async () => {
    console.log("🚪 [SalaVideo] ===== handleLeave CHAMADO =====");
    console.log("  - Role:", role);
    console.log("  - ConsultationId:", consultationIdString);
    console.log("  - Uid:", uid);
    console.log("  - IsConnected:", isConnected);
    console.log("  - IsAutoCancelled:", isAutoCancelled);
    console.log("  - ShowEvaluation:", showEvaluation);
    console.log("  - Dados disponíveis:");
    console.log("    - reservaSessao:", !!reservaSessao);
    console.log("    - consultaCompleta:", !!consultaCompleta);
    console.log("    - consultaData:", !!consultaData);
    console.log("    - loggedUserId:", loggedUserId);
    console.log("    - PsychologistId:", PsychologistId);
    
    if (role === "PSYCHOLOGIST") {
      console.log("👨‍⚕️ [SalaVideo] PSICÓLOGO clicou em sair");
      // Chama função para fechar sala seguindo regras pré-estabelecidas
      console.log("🔒 [SalaVideo] Chamando função fecharSalaAmbosLogados...");
      await fecharSalaAmbosLogados();
      
      // Notifica o backend que está saindo antes de sair da sala (finaliza a consulta)
      if (isConnected && consultationIdString) {
        leaveConsultation(consultationIdString, String(uid));
        console.log("🚪 [SalaVideo] Notificado backend - Psicólogo está saindo da consulta", {
          consultationId: consultationIdString,
          userId: uid
        });
      }
      // Mostra modal de confirmação para psicólogo
      console.log("📋 [SalaVideo] Abrindo modal de confirmação de saída para psicólogo");
      setShowConfirmExit(true);
      return;
    } else if (role === "PATIENT") {
      console.log("🧑 [SalaVideo] PACIENTE clicou em sair");
      // Se foi cancelamento automático, não abre modal de avaliações
      if (isAutoCancelled) {
        console.log("⚠️ [SalaVideo] Consulta cancelada automaticamente - não abre modal de avaliações");
        if (isConnected && consultationIdString) {
          leaveConsultation(consultationIdString, String(uid));
        }
        leaveRoom();
        setTimeout(() => {
          router.push("/painel");
        }, 500);
        return;
      }
      
      // NOVO FLUXO: Verifica diretamente se ambos estiveram e se precisa abrir modal de depoimento
      console.log("🔍 [SalaVideo] [PACIENTE] Verificando condições para modal de depoimento...");
      const ambosEstiveram = await verificarAmbosEstiveramNaSala();
      console.log("  - Resultado verificação ambos estiveram:", ambosEstiveram);
      
      if (ambosEstiveram) {
        // Ambos estiveram na sala - verifica se já existe depoimento
        console.log("  - Passo 1: Finalizando consulta...");
        await finalizarConsultaSeNecessario();
        console.log("✅ [SalaVideo] [PACIENTE] Consulta finalizada");
        
        console.log("  - Passo 2: Verificando se já existe depoimento...");
        const jaExisteDepoimento = await verificarDepoimentoExistente();
        console.log("  - Resultado verificação depoimento:", jaExisteDepoimento);
        
        if (!jaExisteDepoimento) {
          // NÃO existe depoimento - abre modal de avaliação DIRETAMENTE (sem confirmação)
          console.log("✅ [SalaVideo] [PACIENTE] Abrindo modal de depoimento diretamente");
          console.log("  - Ambos estiveram na sala: ✅");
          console.log("  - Não existe depoimento: ✅");
          console.log("  - Modal será aberto com required: true");
          
          setShowConfirmExit(false);
          setShowEvaluation(true);
          // NÃO chama leaveRoom nem leaveConsultation aqui - o modal vai fazer isso depois
          return;
        } else {
          // Já existe depoimento - apenas fecha a sala
          console.log("ℹ️ [SalaVideo] [PACIENTE] Já existe depoimento - fechando sala");
          if (isConnected && consultationIdString) {
            leaveConsultation(consultationIdString, String(uid));
          }
          leaveRoom();
          setTimeout(() => {
            router.push("/painel");
          }, 500);
          return;
        }
      } else {
        // Psicólogo não esteve na sala - apenas fecha a sala
        console.log("❌ [SalaVideo] [PACIENTE] Psicólogo não esteve na sala - fechando sala");
        if (isConnected && consultationIdString) {
          leaveConsultation(consultationIdString, String(uid));
        }
        leaveRoom();
        setTimeout(() => {
          router.push("/painel");
        }, 500);
        return;
      }
    } else {
      // Fallback para outros roles
      console.log("⚠️ [SalaVideo] Role desconhecido:", role);
      if (isConnected && consultationIdString) {
        leaveConsultation(consultationIdString, String(uid));
      }
      leaveRoom();
    }
  };

  // Handler para quando avaliação for enviada com sucesso
  const handleEvaluationSuccess = useCallback(async () => {
    console.log("✅ [SalaVideo] Avaliação enviada com sucesso - encerrando sala");
    
    const consultaIdParaFinalizar = consultationIdString
      || reservaSessao?.ConsultaId
      || consultaCompleta?.Consulta?.Id
      || consultaData?.id
      || undefined;

    if (consultaIdParaFinalizar) {
      try {
        const { consultaService } = await import('@/services/consultaService');
        await consultaService().finalizarConsulta(consultaIdParaFinalizar, true);
        console.log("✅ [SalaVideo] Consulta finalizada via ReservaSessao/Consulta após avaliação", consultaIdParaFinalizar);
      } catch (error) {
        console.error("❌ [SalaVideo] Erro ao finalizar consulta após avaliação:", error);
      }
    }

    // Notifica o backend que está saindo (após enviar avaliação)
    const consultationIdParaLeave = consultationIdString || consultaIdParaFinalizar;
    if (isConnected && consultationIdParaLeave) {
      leaveConsultation(consultationIdParaLeave, String(uid));
      console.log("🚪 [SalaVideo] Notificado backend após avaliação - Usuário está saindo da consulta", consultationIdParaLeave);
    }
    
    // Invalida todas as queries relacionadas à consulta
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
      queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
      queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
      queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
    ]);
    
    // Força refetch imediato da consulta atual
    await queryClient.refetchQueries({ queryKey: ['consultaAtualEmAndamento'] });
    
    // Encerra a sala
    leaveRoom();
    setTimeout(() => {
      router.push("/painel");
    }, 600);
  }, [leaveRoom, router, queryClient, isConnected, consultationIdString, reservaSessao?.ConsultaId, consultaCompleta?.Consulta?.Id, consultaData?.id, uid]);

  // Handler para quando modal de avaliação for cancelado
  // IMPORTANTE: Não deve ser chamado quando required=true, mas mantido para compatibilidade
  const handleEvaluationCancel = useCallback(() => {
    console.log("⚠️ [SalaVideo] Modal de avaliação cancelado - fechando sala e redirecionando");
    // Não permite cancelar se for obrigatório - apenas loga
    console.warn("⚠️ [SalaVideo] Tentativa de cancelar avaliação obrigatória - ignorando");
    // Não fecha a sala nem redireciona - mantém o modal aberto
  }, []);

  // Handler para reagendamento (problema do psicólogo)
  const handleReagendarSala = useCallback(async (data: {
    motivo: string;
    documento?: File | null;
    observacao?: string;
  }) => {
    // Validações obrigatórias
    if (!consultationIdString) {
      toast.error("ID da consulta não encontrado");
      return;
    }
    
    if (!data.motivo || data.motivo.trim() === '') {
      toast.error("O motivo do reagendamento é obrigatório");
      return;
    }

    try {
      setIsProcessingExit(true);
      
      // Extrai todos os IDs necessários para facilitar a busca na API
      const reservaSessaoId = reservaSessaoFinal?.Id || consultaCompleta?.ReservaSessao?.Id || '';
      const agendaId = agendaCompleta?.Id || consultaCompletaData?.AgendaId || reservaSessaoFinal?.AgendaId || '';
      
      // Valida se pelo menos um dos IDs está disponível para a API buscar
      if (!reservaSessaoId && !agendaId && !consultationIdString) {
        toast.error("Não foi possível identificar a sessão. Por favor, recarregue a página.");
        setIsProcessingExit(false);
        return;
      }
      
      // Cria FormData para enviar arquivo se houver
      const formData = new FormData();
      formData.append('motivo', data.motivo);
      formData.append('observacao', data.observacao || '');
      formData.append('tipo', 'ReagendamentoPsicologoForaPrazo');
      formData.append('consultaId', consultationIdString);
      if (reservaSessaoId) {
        formData.append('reservaSessaoId', reservaSessaoId);
      }
      if (agendaId) {
        formData.append('agendaId', agendaId);
      }
      if (data.documento) {
        formData.append('documento', data.documento);
      }

      // Chama API para reagendar
      const response = await api.post(`/reservas/${consultationIdString}/reagendar-psicologo-sala`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Notifica backend que está saindo
      if (isConnected && consultationIdString) {
        leaveConsultation(consultationIdString, String(uid));
      }

      // Encerra a sala e invalida tokens
      leaveRoom();

      // Invalida queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
        queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['ciclos-plano'] }),
        queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
        queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
        queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
      ]);

      const message = response.data?.message || "Sessão reagendada com sucesso! A sessão foi devolvida ao saldo do paciente.";
      toast.success(message);
      
      // Redireciona após um breve delay
      setTimeout(() => {
        router.push("/painel-psicologo");
      }, 1000);
    } catch (error: unknown) {
      console.error('Erro ao reagendar sessão:', error);
      let errorMessage = "Erro ao reagendar sessão";
      
      if (isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.response?.data?.error || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setIsProcessingExit(false);
    }
  }, [consultationIdString, reservaSessaoFinal, consultaCompleta, agendaCompleta, consultaCompletaData, isConnected, uid, leaveRoom, router, queryClient]);

  // Handler para cancelamento (problema do paciente)
  const handleCancelarSala = useCallback(async (data: {
    motivo: string;
    documento?: File | null;
    observacao?: string;
  }) => {
    // Validações obrigatórias
    if (!consultationIdString) {
      toast.error("ID da consulta não encontrado");
      return;
    }
    
    if (!data.motivo || data.motivo.trim() === '') {
      toast.error("O motivo do cancelamento é obrigatório");
      return;
    }

    try {
      setIsProcessingExit(true);
      
      // Extrai todos os IDs necessários para facilitar a busca na API
      const reservaSessaoId = reservaSessaoFinal?.Id || consultaCompleta?.ReservaSessao?.Id || '';
      const agendaId = agendaCompleta?.Id || consultaCompletaData?.AgendaId || reservaSessaoFinal?.AgendaId || '';
      
      // Valida se pelo menos um dos IDs está disponível para a API buscar
      if (!reservaSessaoId && !agendaId && !consultationIdString) {
        toast.error("Não foi possível identificar a sessão. Por favor, recarregue a página.");
        setIsProcessingExit(false);
        return;
      }
      
      // Cria FormData para enviar arquivo se houver
      const formData = new FormData();
      formData.append('motivo', data.motivo);
      formData.append('observacao', data.observacao || '');
      formData.append('tipo', 'CancelamentoNaoCumprimentoContratualPaciente');
      formData.append('consultaId', consultationIdString);
      if (reservaSessaoId) {
        formData.append('reservaSessaoId', reservaSessaoId);
      }
      if (agendaId) {
        formData.append('agendaId', agendaId);
      }
      if (data.documento) {
        formData.append('documento', data.documento);
      }

      // Chama API para cancelar
      const response = await api.post(`/reservas/${consultationIdString}/cancelar-psicologo-sala`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Verifica se a resposta contém erro mesmo com status 200
      if (response.data?.error) {
        throw new Error(response.data.error || response.data.message || "Erro ao cancelar sessão");
      }

      // Notifica backend que está saindo
      if (isConnected && consultationIdString) {
        leaveConsultation(consultationIdString, String(uid));
      }

      // Encerra a sala e invalida tokens
      leaveRoom();

      // Invalida queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
        queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
      ]);

      const message = response.data?.message || "Sessão cancelada com sucesso! O repasse financeiro será executado normalmente.";
      toast.success(message);
      
      // Redireciona após um breve delay
      setTimeout(() => {
        router.push("/painel-psicologo");
      }, 1000);
    } catch (error: unknown) {
      console.error('Erro ao cancelar sessão:', error);
      let errorMessage = "Erro ao cancelar sessão";
      
      if (isAxiosError(error)) {
        // Prioriza message, depois error, depois a mensagem padrão
        errorMessage = error.response?.data?.message || error.response?.data?.error || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setIsProcessingExit(false);
    }
  }, [consultationIdString, reservaSessaoFinal, consultaCompleta, agendaCompleta, consultaCompletaData, isConnected, uid, leaveRoom, router, queryClient]);

  const handleConfirmExit = async () => {
    if (isProcessingExit) {
      console.log("⚠️ [SalaVideo] Processamento de saída já em andamento - ignorando");
      return;
    }

    setIsProcessingExit(true);
    console.log("🚪 [SalaVideo] ===== USUÁRIO CONFIRMOU SAÍDA =====");
    console.log("  - Role:", role);
    console.log("  - ConsultationId:", consultationIdString);
    console.log("  - Dados do usuário logado:", {
      Id: loggedUserId,
      Nome: loggedUser?.Nome,
      Role: loggedUser?.Role
    });
    console.log("  - Dados da consulta:", {
      consultaId: consultaCompletaData?.Id || consultaData?.id,
      status: consultaCompletaData?.Status || consultaData?.status,
      reservaSessaoId: reservaSessaoFinal?.Id,
      agendaId: agendaCompleta?.Id
    });
    
    try {
      if (role === "PSYCHOLOGIST") {
        // Verifica se ambos estiveram na sala antes de finalizar
        const ambosEstiveram = await verificarAmbosEstiveramNaSala();
        console.log("🔍 [SalaVideo] [PSICÓLOGO] Verificando se ambos estiveram na sala:", ambosEstiveram);
        
        if (ambosEstiveram) {
          // Ambos estiveram na sala - finaliza consulta usando o novo endpoint (ignora requiresReview para psicólogo)
          try {
            const { consultaService } = await import('@/services/consultaService');
            const response = await consultaService().finalizarConsultaComReview(consultationIdString || '');
            console.log("✅ [SalaVideo] [PSICÓLOGO] Consulta finalizada - status atualizados (Realizada/Concluido)");
            console.log("  - Resultado finalização:", response.data);
            
            // Invalida queries para atualizar o painel
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] }),
              queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
            ]);
          } catch (error) {
            console.error("❌ [SalaVideo] [PSICÓLOGO] Erro ao finalizar consulta:", error);
          }
        } else {
          console.log("⚠️ [SalaVideo] [PSICÓLOGO] Ambos não estiveram na sala - consulta não será finalizada");
        }
        
        // Notifica o backend que está saindo (isso vai emitir consultation:force-close-room para o paciente)
        if (isConnected && consultationIdString) {
          leaveConsultation(consultationIdString, String(uid));
          console.log("🚪 [SalaVideo] Psicólogo confirmou saída - notificando backend", {
            consultationId: consultationIdString,
            userId: uid
          });
        }
        
        leaveRoom();
        setShowConfirmExit(false);
        // Redireciona para o painel do psicólogo
        setTimeout(() => {
          router.push("/painel-psicologo");
        }, 500);
      } else if (role === "PATIENT") {
        // Para paciente: PRIMEIRO finaliza a sessão, DEPOIS verifica se precisa abrir modal de avaliação
        console.log("🔍 [SalaVideo] [PACIENTE] Iniciando processo de saída...");
        console.log("  - Passo 1: Verificando se ambos estiveram na sala...");
        
        const ambosEstiveram = await verificarAmbosEstiveramNaSala();
        console.log("  - Resultado verificação ambos estiveram:", ambosEstiveram);
        
        if (ambosEstiveram) {
          // Passo 2: PRIMEIRO finaliza a sessão (marca como concluído conforme regra) e verifica review
          console.log("  - Passo 2: Finalizando consulta (atualizando status em todas as tabelas) e verificando review...");
          const finalizacaoResult = await finalizarConsultaSeNecessario();
          console.log("✅ [SalaVideo] [PACIENTE] Consulta finalizada - status atualizados (Realizada/Concluido)");
          console.log("  - Resultado finalização:", finalizacaoResult);
          
          if (finalizacaoResult?.requiresReview) {
            // ✅ Precisa de review - abre modal de avaliação
            // Usa o psychologistId retornado pelo backend (que vem da ReservaSessao.PsychologistId)
            const psychologistIdParaReview = finalizacaoResult.psychologistId || PsychologistId || reservaSessaoFinal?.PsychologistId || "";
            console.log("✅ [SalaVideo] [PACIENTE] CONDIÇÕES ATENDIDAS - Abrindo modal de avaliação");
            console.log("  - Consulta finalizada: ✅");
            console.log("  - Ambos estiveram na sala: ✅");
            console.log("  - Precisa de review: ✅ (não existe review na tabela Review para UserId=" + loggedUserId + " e PsicologoId=" + psychologistIdParaReview + ")");
            console.log("  - Modal será aberto com dados:");
            console.log("    - psicologoId:", psychologistIdParaReview, "(da ReservaSessao)");
            console.log("    - consultationId:", consultationIdString);
            console.log("    - required: true");
            
            setShowConfirmExit(false);
            setShowEvaluation(true);
            // NÃO chama leaveRoom nem leaveConsultation aqui - o modal vai fazer isso depois
            return;
          } else {
            // Não precisa de review (já existe) - apenas fecha a sala (consulta já foi finalizada)
            console.log("ℹ️ [SalaVideo] [PACIENTE] Review já existe para este psicólogo - fechando sala");
            console.log("  - Consulta finalizada: ✅");
            console.log("  - Ambos estiveram na sala: ✅");
            console.log("  - Review já existe: ✅");
            console.log("  - Modal NÃO será aberto (já avaliou)");
            
            // Notifica o backend que está saindo (isso vai emitir consultation:force-close-room para o psicólogo)
            if (isConnected && consultationIdString) {
              leaveConsultation(consultationIdString, String(uid));
            }
            
            leaveRoom();
            setShowConfirmExit(false);
            setTimeout(() => {
              router.push("/painel");
            }, 500);
            return;
          }
        } else {
          // Psicólogo não esteve na sala - não abre modal de avaliação
          console.log("❌ [SalaVideo] [PACIENTE] Psicólogo não esteve na sala - não abre modal de avaliação");
          console.log("  - Ambos estiveram na sala: ❌");
          console.log("  - Modal NÃO será aberto (psicólogo não compareceu)");
          
          // Notifica o backend que está saindo (isso vai emitir consultation:force-close-room para o psicólogo)
          if (isConnected && consultationIdString) {
            leaveConsultation(consultationIdString, String(uid));
          }
          
          leaveRoom();
          setShowConfirmExit(false);
          // Redireciona para o painel sem mostrar modal de avaliação
          setTimeout(() => {
            router.push("/painel");
          }, 500);
          return;
        }
      }
    } catch (error) {
      console.error("❌ [SalaVideo] Erro ao processar saída:", error);
      setIsProcessingExit(false);
    }
  };

  // Definir labels baseado no role
  const isPatient = role === "PATIENT";
  const pipVideoLabel = isPatient ? "Você (Paciente)" : "Você (Psicólogo)";
  
  // Verificar se há usuários remotos conectados
  const hasRemoteUsers = remoteVideoTracks && Object.keys(remoteVideoTracks).length > 0;
  
  // Extrair primeira track de vídeo remoto para os modais
  const firstRemoteVideoTrack = useMemo(() => {
    if (!remoteVideoTracks || Object.keys(remoteVideoTracks).length === 0) {
      return null;
    }
    return Object.values(remoteVideoTracks)[0] || null;
  }, [remoteVideoTracks]);
  
  // Log para debug
  useEffect(() => {
    console.log(`🔍 [SalaVideo ${role}] Estado:`, {
      joined,
      hasRemoteUsers,
      remotePresent,
      remoteVideoTracksCount: Object.keys(remoteVideoTracks || {}).length
    });
  }, [joined, hasRemoteUsers, remotePresent, remoteVideoTracks, role]);
  
  // Verifica quem entrou baseado na ReservaSessao E também via RTC/socket (fallback para sincronização)
  // Usa reservaSessao como fonte principal, mas também considera remotePresent/hasRemoteUsers como indicador adicional
  const patientJoinedFromReserva = reservaSessao?.PatientJoinedAt ? new Date(reservaSessao.PatientJoinedAt) : null;
  const psychologistJoinedFromReserva = reservaSessao?.PsychologistJoinedAt ? new Date(reservaSessao.PsychologistJoinedAt) : null;
  
  // Se for paciente e detectou psicólogo via RTC, considera que psicólogo está conectado
  // Se for psicólogo e detectou paciente via RTC, considera que paciente está conectado
  const patientJoined = patientJoinedFromReserva || (!isPatient && (remotePresent || hasRemoteUsers));
  const psychologistJoined = psychologistJoinedFromReserva || (isPatient && (remotePresent || hasRemoteUsers));
  
  // Considera presente se já detectamos via socket/RTC ou se já há tracks remotas
  const peerPresent = remotePresent || hasRemoteUsers;
  // Só mostra mensagem de espera se o outro ainda não entrou (verificado pela ReservaSessao)
  const waitingForPsychologist = isPatient && joined && !psychologistJoined && !peerPresent;
  const waitingForPatient = !isPatient && joined && !patientJoined && !peerPresent;

    // Log para mudanças no peerPresent e overlays
    useEffect(() => {
      console.log(`🎭 [SalaVideo ${role}] Presença:`, {
        peerPresent,
        waitingForPsychologist,
        waitingForPatient,
        remotePresent,
        hasRemoteUsers,
        shouldShowOverlay: waitingForPsychologist || waitingForPatient
      });
    }, [peerPresent, waitingForPsychologist, waitingForPatient, remotePresent, hasRemoteUsers, role]);

  // Renderizar vídeo local no PiP
  useEffect(() => {
    const videoElement = localVideoRef.current;
    
    if (localVideoTrack && videoElement && joined) {
      console.log('🎥 [SalaVideo] Reproduzindo vídeo local no PiP', {
        hasTrack: !!localVideoTrack,
        hasElement: !!videoElement,
        joined,
        isEnabled: localVideoTrack.isPlaying || localVideoTrack.getMediaStreamTrack()?.enabled
      });
      try {
        // Garante que o track está habilitado ANTES de reproduzir
        const wasEnabled = localVideoTrack.getMediaStreamTrack()?.enabled;
        if (!wasEnabled) {
          console.log('🔧 [SalaVideo] Habilitando track de vídeo...');
          localVideoTrack.setEnabled(true);
          setCamOn(true);
        }
        
        // Reproduz o vídeo (play retorna void, não Promise)
        try {
          localVideoTrack.play(videoElement, { fit: 'cover', mirror: true });
          console.log('✅ [SalaVideo] Vídeo local reproduzido com sucesso');
          
          // Garante novamente após play (alguns navegadores podem desabilitar)
          setTimeout(() => {
            const stillEnabled = localVideoTrack.getMediaStreamTrack()?.enabled;
            if (!stillEnabled) {
              console.log('🔧 [SalaVideo] Re-habilitando vídeo após play...');
              localVideoTrack.setEnabled(true);
              setCamOn(true);
            }
          }, 100);
        } catch (error) {
          console.error('❌ [SalaVideo] Erro ao reproduzir vídeo local:', error);
        }
      } catch (error) {
        console.error('❌ [SalaVideo] Erro ao configurar vídeo local:', error);
      }
    } else {
      if (!localVideoTrack) {
        console.log('⏳ [SalaVideo] Aguardando localVideoTrack...');
      }
      if (!videoElement) {
        console.log('⏳ [SalaVideo] Aguardando elemento de vídeo...');
      }
      if (!joined) {
        console.log('⏳ [SalaVideo] Aguardando conexão (joined=false)...');
      }
    }
    
    return () => {
      if (localVideoTrack && videoElement) {
        try {
          localVideoTrack.stop();
        } catch (error) {
          console.error('Erro ao parar vídeo local:', error);
        }
      }
    };
  }, [localVideoTrack, joined]);
  
  // Garante que o áudio está habilitado quando o track estiver disponível
  useEffect(() => {
    if (localAudioTrack && joined) {
      const isEnabled = localAudioTrack.getMediaStreamTrack()?.enabled;
      if (!isEnabled) {
        console.log('🔧 [SalaVideo] Habilitando track de áudio...');
        localAudioTrack.setEnabled(true);
        setMicOn(true);
      }
      
      // Verifica novamente após um delay para garantir que permanece habilitado
      const checkInterval = setTimeout(() => {
        const stillEnabled = localAudioTrack.getMediaStreamTrack()?.enabled;
        if (!stillEnabled) {
          console.log('🔧 [SalaVideo] Re-habilitando áudio após verificação...');
          localAudioTrack.setEnabled(true);
          setMicOn(true);
        }
      }, 200);
      
      return () => clearTimeout(checkInterval);
    }
  }, [localAudioTrack, joined]);

  // Configura áudio para sair pelo dispositivo preferido (mobile e desktop)
  useEffect(() => {
    if (!joined) return;

    const configureAudioOutput = async () => {
      try {
        // Enumera dispositivos de áudio
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        if (audioOutputs.length > 0) {
          // Usa o dispositivo preferido se disponível, senão usa o primeiro (padrão)
          const preferredDeviceId = devicePreferences?.audioOutputDeviceId;
          const deviceToUse = preferredDeviceId && audioOutputs.find(d => d.deviceId === preferredDeviceId)
            ? preferredDeviceId
            : audioOutputs[0].deviceId;
          
          // Cria um elemento de áudio oculto para configurar o dispositivo
          const audioElement = document.createElement('audio');
          audioElement.style.display = 'none';
          audioElement.setAttribute('playsinline', 'true');
          document.body.appendChild(audioElement);

          // Configura para usar o dispositivo preferido ou padrão
          // Type assertion segura para setSinkId (API experimental do HTMLAudioElement)
          // Usa Record para adicionar propriedade opcional sem estender
          const audioElementWithSinkId = audioElement as HTMLAudioElement & {
            setSinkId?: (sinkId: string) => Promise<void>;
          };
          if ('setSinkId' in audioElement && typeof audioElementWithSinkId.setSinkId === 'function') {
            try {
              await audioElementWithSinkId.setSinkId(deviceToUse);
              const deviceLabel = audioOutputs.find(d => d.deviceId === deviceToUse)?.label || 'dispositivo padrão';
              console.log('🔊 [SalaVideo] Áudio configurado para:', deviceLabel);
            } catch (err) {
              console.warn('⚠️ [SalaVideo] Não foi possível configurar dispositivo de áudio:', err);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ [SalaVideo] Erro ao configurar saída de áudio:', err);
      }
    };

    configureAudioOutput();
  }, [joined, devicePreferences?.audioOutputDeviceId]);

  // Desabilitar scroll do body quando a sala estiver ativa
  useEffect(() => {
    if (joined) {
      // Desabilita scroll
      document.body.style.overflow = 'hidden';
      document.body.style.overflowX = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.overflowY = 'hidden';
    }
    
    return () => {
      // Reabilita scroll ao sair
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowX = '';
      document.documentElement.style.overflowY = '';
    };
  }, [joined]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-black flex flex-col overflow-hidden"
      style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflowX: 'hidden', overflowY: 'hidden' }}
    >
      {/* Header da Sala */}
      <div className="flex-shrink-0 z-50">
        <HeaderSala />
      </div>
      
      {/* Container principal - ocupa espaço restante após header - otimizado para mobile */}
      <div className="flex-1 w-full overflow-hidden relative" style={{ height: 'calc(100vh - 70px)', overflowX: 'hidden', overflowY: 'hidden' }}>
        <div className="relative w-full h-full bg-black overflow-hidden" style={{ overflowX: 'hidden', overflowY: 'hidden' }}>
          
          {/* Vídeo principal - Sempre mostra o outro participante (remoto) - otimizado para mobile */}
          {/* Quando modal de avaliação está aberto para paciente, o vídeo principal já mostra o psicólogo (remoto) */}
          <div className="absolute inset-0 w-full h-full bg-black">
            <div
              id="agora-video-container"
              className="w-full h-full"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100%',
                minWidth: '100%'
              }}
            />
            
            {/* Quando modal está aberto e é paciente, mostra indicador que paciente está sendo visto pelo psicólogo */}
            {role === "PATIENT" && showEvaluation && (
              <div className="absolute top-4 left-4 bg-indigo-600/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg z-10 backdrop-blur-sm">
                Paciente (sua câmera está ativa)
              </div>
            )}
            
            {/* Mensagem: Aguardando psicólogo conectar - otimizado para mobile */}
            {waitingForPsychologist && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 to-purple-900/95 flex flex-col items-center justify-center z-10 p-4">
                <div className="text-center px-2 sm:px-4 max-w-2xl w-full">
                  <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full mb-3 sm:mb-4 animate-pulse">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                    Aguardando o psicólogo conectar...
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-indigo-200 mb-4 sm:mb-6 leading-relaxed">
                    Você está na sala. O psicólogo entrará em breve. Se a sessão não começar em até 10 minutos, ela será encerrada automaticamente e a consulta será devolvida ao seu saldo para um novo agendamento, conforme previsto em contrato.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mensagem: Aguardando paciente conectar - otimizado para mobile */}
            {waitingForPatient && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 to-purple-900/95 flex flex-col items-center justify-center z-10 p-4">
                <div className="text-center px-2 sm:px-4 max-w-2xl w-full">
                  <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full mb-3 sm:mb-4 animate-pulse">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                    Aguardando paciente conectar...
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-indigo-200 mb-4 sm:mb-6 leading-relaxed">
                    Você está na sala. O paciente entrará em breve. Se a sessão não começar em até 10 minutos, ela será encerrada automaticamente por inatividade.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tags lado a lado abaixo do logo no desktop - otimizado para mobile - 15px abaixo do header */}
            {/* Mostra apenas as tags dos participantes que estão realmente conectados na sala */}
            {!waitingForPsychologist && !waitingForPatient && (patientJoined || psychologistJoined) && (
              <div className="absolute top-[85px] left-4 sm:left-6 xl:left-24 2xl:left-24 flex flex-row gap-2 z-10">
                {/* Tag do Paciente - apenas se estiver conectado */}
                {patientJoined && (
                  <div className="bg-blue-600/90 text-white text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-sm shadow-lg">
                    Paciente
                  </div>
                )}
                {/* Tag do Psicólogo - apenas se estiver conectado */}
                {psychologistJoined && (
                  <div className="bg-purple-600/90 text-white text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg backdrop-blur-sm shadow-lg">
                    Psicólogo
                  </div>
                )}
              </div>
            )}
            
            {/* Contador de Sessão - SEMPRE visível quando tiver dados de horário */}
            {(joined || scheduledAt || reservaSessao?.ScheduledAt || (consultaDate && consultaTime)) && (
              <ContadorSessao 
                duracao={Math.max(0, callDuration)} 
                tempoRestante={Math.max(0, timeRemaining)} 
              />
            )}

            {/* Mão levantada do outro participante - Notificação visível - otimizado para mobile */}
            {remoteHandRaised && (
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-orange-500 text-white text-[10px] xs:text-xs sm:text-sm font-semibold px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg shadow-2xl flex items-center gap-1.5 sm:gap-2 md:gap-3 z-20 animate-pulse border-2 border-orange-300 min-w-[120px] sm:min-w-[140px] md:min-w-[180px] lg:min-w-[200px] max-w-[calc(100vw-1rem)]">
                <span className="text-lg sm:text-xl md:text-2xl animate-bounce flex-shrink-0">✋</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold truncate text-[10px] sm:text-xs md:text-sm">
                    {remoteHandRole === "Patient" ? "Paciente" : "Psicólogo"} levantou a mão!
                  </span>
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-100 hidden sm:block">Clique para responder</span>
                </div>
              </div>
            )}

            {/* Notificação de Tempo Restante - Estilo Google Meet (canto inferior direito) */}
            {timeRemainingWarning && (
              <NotificationToast
                message={timeRemainingWarning.message}
                type="info"
                minutesRemaining={timeRemainingWarning.minutesRemaining}
                onClose={() => setTimeRemainingWarning(null)}
                autoClose={8000} // 8 segundos
              />
            )}

            {/* Notificação de Inatividade - Estilo Google Meet (canto inferior direito) - otimizado para mobile */}
            {inactivityWarning && countdown !== null && (
              <div 
                className="fixed bottom-24 sm:bottom-28 md:bottom-32 right-2 sm:right-4 md:right-6 z-50 max-w-[calc(100vw-1rem)] sm:max-w-sm"
                style={{
                  animation: 'slideUp 0.3s ease-out'
                }}
              >
                <div className="bg-white rounded-lg shadow-2xl border-2 border-red-500 w-full sm:w-96 p-3 sm:p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
                        Consulta será encerrada
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-700 mb-2">
                        Por inatividade de <span className="font-semibold text-red-600">{inactivityWarning.missingName}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                            style={{ width: `${(countdown / 30) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-red-600 min-w-[2rem] text-right">
                          {countdown}s
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setInactivityWarning(null);
                        setCountdown(null);
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Fechar notificação"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

           
            {/* Erro */}
            {error && !isConnecting && (
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
                <div className="text-white text-center max-w-md mx-4">
                  <div className="text-red-400 text-6xl mb-4">⚠️</div>
                  <h3 className="text-xl font-semibold mb-2">Erro de Conexão</h3>
                  <p className="text-sm text-gray-300 mb-4">{error}</p>
                  {error.includes('PERMISSION_DENIED') || error.includes('Permissão') ? (
                    <>
                      <div className="mb-4 text-left bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Como resolver:</p>
                        <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                          <li>Clique no botão abaixo para solicitar permissões</li>
                          <li>Ou clique no ícone de cadeado/informações na barra de endereço</li>
                          <li>Permita o acesso à câmera e microfone</li>
                          <li>Recarregue a página após permitir</li>
                        </ol>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={async () => {
                            try {
                              console.log('🔐 [SalaVideo] Solicitando permissões manualmente...');
                              const stream = await navigator.mediaDevices.getUserMedia({ 
                                audio: true, 
                                video: true 
                              });
                              // Para os tracks para liberar recursos
                              stream.getTracks().forEach(track => track.stop());
                              console.log('✅ [SalaVideo] Permissões concedidas! Recarregando...');
                              toast.success('Permissões concedidas! Recarregando a página...');
                              setTimeout(() => {
                                window.location.reload();
                              }, 1000);
                            } catch (err) {
                              const error = err as { name?: string; message?: string };
                              console.error('❌ [SalaVideo] Erro ao solicitar permissões:', error);
                              if (error.name === 'NotAllowedError') {
                                toast.error('Permissão negada. Por favor, permita manualmente nas configurações do navegador.');
                              } else {
                                toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
                              }
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                        >
                          Solicitar Permissões Agora
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                        >
                          Recarregar Página
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PiP - Vídeo Local (Você) no canto inferior direito - otimizado para mobile */}
          {/* Quando modal de avaliação está aberto (para paciente), esconde o PiP local */}
          {!(role === "PATIENT" && showEvaluation) && (
          <div className="absolute bottom-20 sm:bottom-24 md:bottom-28 right-2 sm:right-3 w-[100px] h-[75px] xs:w-[120px] xs:h-[90px] sm:w-[160px] sm:h-[120px] md:w-[200px] md:h-[150px] lg:w-[240px] lg:h-[180px] xl:w-[280px] xl:h-[210px] rounded-lg overflow-hidden shadow-2xl border-2 border-white/90 bg-black z-20">
            <div 
              ref={localVideoRef}
              id="agora-video-local" 
              className="w-full h-full"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100%',
                minWidth: '100%'
              }}
            />
            
            {/* Indicador do vídeo local - otimizado para mobile */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1 sm:p-1.5 sm:p-2">
              <p className="text-white text-[9px] sm:text-[10px] sm:text-xs font-medium truncate px-1">{pipVideoLabel}</p>
            </div>
          </div>
          )}
          
          {/* Quando modal de avaliação está aberto e é paciente, mostra vídeo do paciente (local) no principal */}
          {/* O vídeo remoto (psicólogo) continua no container principal por padrão do Agora */}
        </div>
      </div>
      <BotoesFlutuantes
        micOn={micOn}
        camOn={camOn}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        handleLeave={handleLeave}
        role={role}
        onCancelarConsulta={() => setShowModalCancelarSala(true)}
        onReagendar={() => setShowModalReagendarSala(true)}
        onAgendar={() => setShowModalAgendar(true)}
        isProcessingExit={isProcessingExit}
        onLeaveHover={async () => {
          // Apenas paciente: intenção de sair por hover deve preparar avaliação
          if (role !== "PATIENT" || !joined || isAutoCancelled || showEvaluation) return;
          try {
            const ambosEstiveram = await verificarAmbosEstiveramNaSala();
            if (!ambosEstiveram) return;
            const jaExisteDepoimento = await verificarDepoimentoExistente();
            if (!jaExisteDepoimento) {
              // Finaliza consulta se necessário antes de abrir avaliação
              await finalizarConsultaSeNecessario();
              setShowEvaluation(true);
            }
          } catch (e) {
            console.error("[SalaVideo] Erro ao processar hover de sair:", e);
          }
        }}
      />
      {/* Modal de avaliação - obrigatório se paciente ainda não avaliou */}
      {showEvaluation && (
        <>
          {console.log("📋 [SalaVideo] ===== MODAL DE AVALIAÇÕES ABERTO =====")}
          {console.log("  - psicologoId:", PsychologistId)}
          {console.log("  - consultationId:", consultationIdString)}
          {console.log("  - required: true")}
          {console.log("  - Dados do usuário:", {
            loggedUserId,
            loggedUserName: loggedUser?.Nome,
            loggedUserRole: loggedUser?.Role
          })}
          {console.log("  - Dados da consulta:", {
            consultaId: consultaCompletaData?.Id || consultaData?.id,
            status: consultaCompletaData?.Status || consultaData?.status
          })}
          {console.log("  - Dados da reserva sessão:", {
            reservaSessaoId: reservaSessaoFinal?.Id,
            patientJoinedAt: reservaSessaoFinal?.PatientJoinedAt,
            psychologistJoinedAt: reservaSessaoFinal?.PsychologistJoinedAt
          })}
          {console.log("  - Dados da agenda:", {
            agendaId: agendaCompleta?.Id,
            agendaStatus: agendaCompleta?.Status
          })}
          <ModalAvaliacoes
            onClose={() => {
              // Quando required=true, não deve permitir fechar sem avaliar
              // Mas mantém a função para compatibilidade
              console.warn("⚠️ [SalaVideo] Tentativa de fechar modal obrigatório - ignorando");
            }}
            // ✅ Usa o PsychologistId da ReservaSessao (prioriza o retornado pelo backend, depois das props, depois do reservaSessaoFinal)
            psicologoId={reservaSessaoFinal?.PsychologistId || PsychologistId || ""}
            onSuccess={handleEvaluationSuccess}
            onCancel={handleEvaluationCancel}
            consultationId={consultationIdString}
            required={true} // Torna obrigatório quando chamado do fluxo de saída
          />
        </>
      )}
      {/* Modal de confirmação de saída - apenas para psicólogo */}
      {/* Paciente: quando ambos estiveram na sala, abre modal de depoimento diretamente (sem confirmação) */}
      {showConfirmExit && role === "PSYCHOLOGIST" && (
        <ModalConfirmarSaida
          isOpen={showConfirmExit}
          onClose={() => setShowConfirmExit(false)}
          onConfirm={handleConfirmExit}
        />
      )}
      
      {/* Modal de cancelar consulta - apenas para psicólogo */}
      {role === "PSYCHOLOGIST" && showModalCancelar && (
        <ModalCancelarSessao
          open={showModalCancelar}
          onClose={() => setShowModalCancelar(false)}
          consulta={{
            id: consultationIdString,
            date: consultaData?.date || 
                  consultaData?.consulta?.Data || 
                  (typeof consultaDate === 'string' ? consultaDate : consultaDate?.toISOString().split('T')[0]) || 
                  reservaSessao?.ConsultaDate?.toString().split('T')[0] || 
                  "",
            time: consultaData?.time || 
                  consultaData?.consulta?.Horario || 
                  consultaTime || 
                  reservaSessao?.ConsultaTime || 
                  "",
            pacienteId: getPacienteId(),
            psicologoId: getPsicologoId(),
            linkDock: (consultaData as Partial<{ linkDock: string; LinkDock: string }> )?.linkDock || (consultaData as Partial<{ linkDock: string; LinkDock: string }> )?.LinkDock || "",
            status: consultaData?.status || (consultaData as Partial<{ Status: string }> )?.Status || consultaData?.consulta?.Status || "",
            tipo: "Psicologo", // Sempre Psicologo quando vem do psicólogo
          }}
          onConfirm={() => {
            // O modal já faz o cancelamento, apenas fechamos
            setShowModalCancelar(false);
          }}
        />
      )}
      
      {/* Modal de reagendar - apenas para psicólogo */}
      {role === "PSYCHOLOGIST" && showModalReagendar && (
        <ModalReagendarPsicologo
          isOpen={showModalReagendar}
          onClose={() => setShowModalReagendar(false)}
          consultaIdAtual={consultationIdString}
          psicologoId={getPsicologoId()}
          pacienteId={getPacienteId()}
          remoteVideoTrack={firstRemoteVideoTrack}
        />
      )}
      
      {/* Modal de agendar próxima sessão - apenas para psicólogo */}
      {role === "PSYCHOLOGIST" && showModalAgendar && (
        <ModalAgendarProximaSessaoPsicologo
          isOpen={showModalAgendar}
          onClose={() => setShowModalAgendar(false)}
          psicologoId={getPsicologoId()}
          pacienteId={getPacienteId()}
          remoteVideoTrack={firstRemoteVideoTrack}
          consultationId={consultationIdString}
        />
      )}

      {/* Modal de reagendar sessão na sala - apenas para psicólogo (problema do psicólogo) */}
      {role === "PSYCHOLOGIST" && showModalReagendarSala && (
        <ModalReagendarPsicologoSala
          isOpen={showModalReagendarSala}
          onClose={() => setShowModalReagendarSala(false)}
          onConfirm={handleReagendarSala}
          consultationId={consultationIdString}
        />
      )}

      {/* Modal de cancelar sessão na sala - apenas para psicólogo (problema do paciente) */}
      {role === "PSYCHOLOGIST" && showModalCancelarSala && (
        <ModalCancelarPsicologoSala
          isOpen={showModalCancelarSala}
          onClose={() => setShowModalCancelarSala(false)}
          onConfirm={handleCancelarSala}
          consultationId={consultationIdString}
        />
      )}
    </div>
  );
}