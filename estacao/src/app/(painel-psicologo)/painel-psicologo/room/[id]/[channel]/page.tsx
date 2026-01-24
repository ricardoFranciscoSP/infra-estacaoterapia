"use client";
import SalaVideo from '@/components/SalaVideo';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useReservaSessao } from '@/hooks/reservaSessao';
import type { ReservaSessao } from '@/types/reservaSessaoTypes';
import { consultaService } from '@/services/consultaService';
import { reservaSessaoService } from '@/services/reservaSessaoService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { onConsultationEvent, onRoomClosed, offRoomClosed, getSocket, ConsultationEventData } from '@/lib/socket'; 

export default function Room() {
  // No Next.js, variáveis NEXT_PUBLIC_* são expostas automaticamente no cliente
  // IMPORTANTE: Esta variável precisa estar configurada no arquivo .env.local ou .env
  // e o servidor precisa ser reiniciado após adicionar a variável
  const appId: string = useMemo(() => {
    // Em produção, use NEXT_PUBLIC_AGORA_APP_ID; em dev, use AGORA_APP_ID; fallback para valor fixo
    const prodId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const devId = process.env.AGORA_APP_ID;
    const fallback = "92119e72f3db4955b35dcb0e61dd5179";
    const id =
      (typeof window !== "undefined" && process.env.NODE_ENV === "production"
        ? prodId
        : devId) || prodId || devId || fallback;
    if (!id) {
      console.error("❌ AGORA_APP_ID não está configurado.");
      console.error(
        "📝 Para corrigir: Adicione AGORA_APP_ID=seu_app_id no arquivo de ambiente do servidor e reinicie o servidor."
      );
    } else {
      console.log("✅ AGORA_APP_ID configurado corretamente");
    }
    return id;
  }, []);

  const params = useParams();
  const router = useRouter();
  const id: string = useMemo(() => {
    const raw = params?.["id"];
    return Array.isArray(raw) ? raw[0] : (raw ?? "");
  }, [params]);

  const channelParam: string = useMemo(() => {
    const raw = params?.["channel"];
    return Array.isArray(raw) ? raw[0] : (raw ?? "");
  }, [params]);

  console.log("Room ID (Psychologist):", id);
  console.log("Channel (param):", channelParam);

  const { reservaSessao, refetch, isLoading: isLoadingReserva, isError: isErrorReserva } = useReservaSessao(id);
  const rs = reservaSessao as ReservaSessao | undefined;
  const [reservaSessaoFromChannel, setReservaSessaoFromChannel] = useState<ReservaSessao | null>(null);
  const [isLoadingFromChannel, setIsLoadingFromChannel] = useState(false);
  
  // Obtém o ID do psicólogo logado diretamente do authStore
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";

  console.log("🔵 [Room Psychologist] Reserva Sala:", reservaSessao);
  console.log("🔵 [Room Psychologist] isLoadingReserva:", isLoadingReserva);
  console.log("🔵 [Room Psychologist] isErrorReserva:", isErrorReserva);
  console.log("🔵 [Room Psychologist] rs?.PsychologistId:", rs?.PsychologistId);
  console.log("🔵 [Room Psychologist] loggedUserId (do useAuthStore):", loggedUserId);
  console.log("🔵 [Room Psychologist] loggedUser completo:", loggedUser);
  console.log("🔵 [Room Psychologist] rs completo:", JSON.stringify(rs, null, 2));
  
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [tokenFromChannel, setTokenFromChannel] = useState<string>("");
  const [uidFromChannel, setUidFromChannel] = useState<number>(0);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenFetchAttempts, setTokenFetchAttempts] = useState(0);
  const tokenFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref para timeout do token

  // Busca dados completos pelo channel quando necessário
  useEffect(() => {
    const hasAllData = rs &&
      rs.AgoraTokenPsychologist &&
      rs.UidPsychologist &&
      rs.ConsultaDate &&
      rs.ConsultaTime &&
      rs.ScheduledAt &&
      rs.PsychologistId;

    if (channelParam && !isLoadingFromChannel && !hasAllData && !reservaSessaoFromChannel) {
      setIsLoadingFromChannel(true);
      try {
        const service = reservaSessaoService();
        if (!service || typeof service?.getByChannel !== 'function') {
          console.error('❌ [Room Psychologist] reservaSessaoService inválido', {
            service,
            hasGetByChannel: !!service?.getByChannel,
            type: typeof service?.getByChannel
          });
          setIsLoadingFromChannel(false);
          return;
        }

        service.getByChannel(channelParam)
          .then((response) => {
            const data = response.data?.data;
            if (data) {
              setReservaSessaoFromChannel(data);
              import('@/store/reservaSessaoStore').then(({ useReservaSessaoStore }) => {
                useReservaSessaoStore.getState().setReservaSessao(data);
              });
            }
          })
          .catch((err) => {
            console.error('❌ [Room Psychologist] Erro ao buscar ReservaSessao pelo channel:', err);
          })
          .finally(() => {
            setIsLoadingFromChannel(false);
          });
      } catch (fetchError) {
        console.error('❌ [Room Psychologist] Erro ao chamar reservaSessaoService:', fetchError);
        setIsLoadingFromChannel(false);
      }
    }
  }, [channelParam, rs, isLoadingFromChannel, reservaSessaoFromChannel]);

  // Prioriza dados do channel se disponíveis
  const finalReservaSessao = reservaSessaoFromChannel || rs;

  // Valores estáveis usando useMemo para garantir que o array de dependências não mude de tamanho
  // IMPORTANTE: Sala do psicólogo usa APENAS AgoraTokenPsychologist (não usa token do paciente)
  // FONTE DOS TOKENS: Sempre vem da tabela ReservaSessao via useReservaSessao(id)
  const existingTokenValue = useMemo(() => {
    // Usa APENAS AgoraTokenPsychologist - NUNCA usa tokens alternativos
    return finalReservaSessao?.AgoraTokenPsychologist || '';
  }, [finalReservaSessao?.AgoraTokenPsychologist]);

  // Busca token pelo channel se necessário (quando reserva não encontrada ou token não disponível)
  // IMPORTANTE: Sempre tenta buscar/gerar token se não existir, garantindo que esteja disponível no horário marcado
  useEffect(() => {
    // Calcula valores dentro do effect
    const hasReserva = !!reservaSessao;
    const hasToken = !!existingTokenValue && existingTokenValue.length > 0;
    const hasChannel = !!channelParam && channelParam.length > 0;
    const hasTokenFromChannel = !!tokenFromChannel && tokenFromChannel.length > 0;

    const MAX_TOKEN_FETCH_ATTEMPTS = 3;
    const TOKEN_FETCH_TIMEOUT = 10000; // 10 segundos

    const shouldFetchToken = 
      !isLoadingToken && 
      hasChannel && 
      !hasTokenFromChannel &&
      !isLoadingReserva &&
      tokenFetchAttempts < MAX_TOKEN_FETCH_ATTEMPTS && // Limita tentativas
      (
        // Caso 1: Reserva não encontrada mas temos channel - tenta buscar token
        !hasReserva ||
        // Caso 2: Reserva encontrada mas não tem token do psicólogo - GERA/BUSCA token
        (hasReserva && !hasToken)
      );

    if (shouldFetchToken) {
      console.log("🔄 [Psychologist Room] Buscando/gerando token pelo channel...", { 
        hasReserva, 
        hasToken, 
        channel: channelParam,
        attempt: tokenFetchAttempts + 1,
        maxAttempts: MAX_TOKEN_FETCH_ATTEMPTS,
        reason: !hasReserva ? 'Reserva não encontrada' : 'Token não encontrado na reserva'
      });
      setIsLoadingToken(true);
      setTokenFetchAttempts(prev => prev + 1);
      
      // Limpa timeout anterior se existir
      if (tokenFetchTimeoutRef.current) {
        clearTimeout(tokenFetchTimeoutRef.current);
      }
      
      // Timeout de segurança: se a requisição demorar mais de 10s, cancela
      tokenFetchTimeoutRef.current = setTimeout(() => {
        console.warn("⏱️ [Psychologist Room] Timeout ao buscar token pelo channel (10s)");
        setIsLoadingToken(false);
        if (tokenFetchAttempts >= MAX_TOKEN_FETCH_ATTEMPTS - 1) {
          setError('Timeout ao buscar token. Verifique sua conexão e tente novamente.');
          toast.error('Timeout ao buscar token. Verifique sua conexão e tente novamente.');
        }
      }, TOKEN_FETCH_TIMEOUT);
      
      consultaService().getToken(channelParam)
        .then((response) => {
          // Limpa timeout se a requisição completar
          if (tokenFetchTimeoutRef.current) {
            clearTimeout(tokenFetchTimeoutRef.current);
            tokenFetchTimeoutRef.current = null;
          }
          
          const data = response.data;
          console.log("✅ Token obtido pelo channel:", data);
          if (data?.token) {
            setTokenFromChannel(data.token);
            // Usa o UID retornado pela API
            if (data?.uid !== undefined && data?.uid !== null) {
              setUidFromChannel(typeof data.uid === 'number' ? data.uid : parseInt(String(data.uid)) || 0);
            } else {
              // Fallback: gera um UID baseado no hash do channel (sempre o mesmo para o mesmo channel)
              const hash = channelParam.split('').reduce((acc, char) => {
                return ((acc << 5) - acc) + char.charCodeAt(0);
              }, 0);
              setUidFromChannel(Math.abs(hash) % 1000000);
            }
          }
          setIsLoadingToken(false);
        })
        .catch((err: unknown) => {
          // Limpa timeout se houver erro
          if (tokenFetchTimeoutRef.current) {
            clearTimeout(tokenFetchTimeoutRef.current);
            tokenFetchTimeoutRef.current = null;
          }
          
          console.error("❌ Erro ao buscar token pelo channel:", err);
          setIsLoadingToken(false);
          
          // Verifica se é erro de consulta concluída ou token expirado
          type AxiosError = {
            response?: {
              data?: {
                code?: string;
                message?: string;
                error?: string;
              };
              status?: number;
            };
          };
          
          const axiosError = err as AxiosError;
          const errorData = axiosError?.response?.data;
          const status = axiosError?.response?.status;
          const errorCode = errorData?.code;
          const errorMessage = errorData?.message || errorData?.error;
          
          // Erros de permissão (403) - redireciona imediatamente sem mostrar toast
          if (status === 403 || errorCode === 'TOKEN_MISSING' || errorCode === 'TOKEN_INVALID' || errorCode === 'ROOM_CLOSED') {
            // Redireciona imediatamente sem mostrar mensagem (navega para rota inexistente que aciona not-found)
            router.replace("/painel-psicologo/sala-nao-encontrada");
            return;
          }
          
          if (status === 410 || errorCode === 'CONSULTA_CONCLUIDA' || errorCode === 'TOKENS_EXPIRADOS' || errorCode === 'CONSULTA_CANCELADA') {
            setError(errorMessage || 'Esta consulta já foi finalizada. Não é possível acessar a sala de vídeo.');
            toast.error(errorMessage || 'Esta consulta já foi finalizada. Não é possível acessar a sala de vídeo.');
            
            // Redireciona após 3 segundos
            setTimeout(() => {
              router.push("/painel-psicologo");
            }, 3000);
          } else {
            setError(errorMessage || 'Erro ao acessar a sala de vídeo. Por favor, tente novamente.');
            toast.error(errorMessage || 'Erro ao acessar a sala de vídeo. Por favor, tente novamente.');
          }
        });
    }
  }, [
    isLoadingReserva,
    isLoadingToken,
    reservaSessao,
    existingTokenValue,
    channelParam,
    tokenFromChannel,
    tokenFetchAttempts,
    router
  ]);

  // Cleanup: limpa timeout quando o componente desmonta
  useEffect(() => {
    return () => {
      if (tokenFetchTimeoutRef.current) {
        clearTimeout(tokenFetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!id) {
      // Se não tiver ID, redireciona imediatamente (navega para rota inexistente que aciona not-found)
      router.replace("/painel-psicologo/sala-nao-encontrada");
      return;
    }
    
    // Se houver erro e ainda não tentou 3 vezes, tenta novamente
    if (isErrorReserva && retryCount < 3) {
      const timeoutId = setTimeout(() => {
        console.log(`🔄 Tentativa ${retryCount + 1} de buscar reserva...`);
        setRetryCount(prev => prev + 1);
        refetch();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
    
    // Se houver erro após 3 tentativas e não tiver token alternativo
    if (isErrorReserva && retryCount >= 3 && !tokenFromChannel) {
      setError("Não foi possível carregar os dados da sala após várias tentativas. Verifique sua conexão.");
    }
  }, [id, isErrorReserva, retryCount, refetch, tokenFromChannel, router]);

  // IMPORTANTE: Sala do psicólogo usa APENAS AgoraTokenPsychologist (não usa token do paciente)
  // HIERARQUIA DE TOKENS:
  // 1. AgoraTokenPsychologist da reserva (fonte primária)
  // 2. tokenFromChannel (gerado via API /reservas/token/{channel} se necessário)
  // NUNCA usa: TokenPsicologo, TokenPaciente, AgoraTokenPatient ou qualquer outro token
  const tokenForPsychologist = finalReservaSessao?.AgoraTokenPsychologist || tokenFromChannel || "";
  const channel = finalReservaSessao?.AgoraChannel || finalReservaSessao?.Channel || channelParam || "";
  const uidPsychologist = finalReservaSessao?.UidPsychologist || uidFromChannel || 0;
  
  // Extrai dados da consulta com múltiplos fallbacks
  const finalConsultaDate = finalReservaSessao?.ConsultaDate || "";
  const finalConsultaTime = finalReservaSessao?.ConsultaTime || "";
  const finalScheduledAt = finalReservaSessao?.ScheduledAt || "";
  const finalPsychologistId = loggedUserId || finalReservaSessao?.PsychologistId || "";
  
  console.log("🔑 [Psychologist] Token (AgoraTokenPsychologist):", tokenForPsychologist ? "✅ Presente" : "❌ Ausente");
  console.log("📺 [Psychologist] Channel:", channel || "❌ Ausente");
  console.log("🆔 [Psychologist] UID:", uidPsychologist || "❌ Ausente");
  console.log("📋 [Psychologist] Channel (param):", channelParam);
  console.log("📅 [Psychologist] ConsultaDate:", finalConsultaDate || "❌ Ausente");
  console.log("⏰ [Psychologist] ConsultaTime:", finalConsultaTime || "❌ Ausente");
  console.log("📆 [Psychologist] ScheduledAt:", finalScheduledAt || "❌ Ausente");
  console.log("👨‍⚕️ [Psychologist] PsychologistId (final):", finalPsychologistId || "❌ Ausente");
  console.log("🔍 [Psychologist] Token source:", {
    AgoraTokenPsychologist: finalReservaSessao?.AgoraTokenPsychologist ? "✅" : "❌",
    tokenFromChannel: tokenFromChannel ? "✅" : "❌",
    finalToken: tokenForPsychologist ? "✅ Presente" : "❌ Ausente",
    source: reservaSessaoFromChannel ? "channel" : "id"
  });
  
  const isReady =
    !isLoadingReserva &&
    !isLoadingToken &&
    !isLoadingFromChannel &&
    (!isErrorReserva || tokenFromChannel) && // Permite se tiver token alternativo mesmo com erro
    typeof tokenForPsychologist === "string" && tokenForPsychologist.trim().length > 0 &&
    typeof channel === "string" && channel.trim().length > 0 &&
    typeof appId === "string" && appId.trim().length > 0 && // Valida que appId está configurado
    (typeof uidPsychologist === "number" && uidPsychologist > 0 || uidFromChannel > 0); // Permite UID do fallback

  // Se houver erro de permissão (403), redireciona para not-found imediatamente
  useEffect(() => {
    if (error && (error.includes('permissão') || error.includes('Token') || error.includes('sala foi fechada') || error.includes('acesso negado'))) {
      router.push("/painel-psicologo/not-found");
    }
  }, [error, router]);

  // Mostra erro se houver problema (exceto erros de permissão que já redirecionam)
  if ((error && !error.includes('permissão') && !error.includes('Token') && !error.includes('sala foi fechada') && !error.includes('acesso negado')) || (isErrorReserva && retryCount >= 3 && !tokenFromChannel) || !appId) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          <div className="text-red-300 text-lg mb-4 max-w-md">
            {!appId 
              ? "Erro de configuração: App ID do Agora não está configurado. Verifique se a variável de ambiente AGORA_APP_ID está definida e reinicie o servidor."
              : (error || "Erro ao carregar dados da sala")
            }
          </div>
          <button
            onClick={() => {
              setError(null);
              setRetryCount(0);
              refetch();
            }}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  
  // Se for erro de permissão, mostra loading enquanto redireciona
  if (error && (error.includes('permissão') || error.includes('Token') || error.includes('sala foi fechada') || error.includes('acesso negado'))) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          <div className="text-white text-lg">
            Redirecionando...
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Loading content */}
        <div className="relative z-10 flex flex-col items-center space-y-8">
          {/* Animated video icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-ping"></div>
            <div className="relative bg-white/10 backdrop-blur-sm p-8 rounded-full border border-white/20 shadow-2xl">
              <svg 
                className="w-16 h-16 text-white animate-pulse" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
                />
              </svg>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white animate-pulse">
              {error ? "Erro ao carregar sala" : "Aguardando paciente conectar..."}
            </h2>
            <p className="text-base sm:text-lg text-indigo-200/80">
              {error || "Você está na sala. O paciente entrará em breve."}
            </p>
            {(isLoadingReserva || isLoadingToken) && (
              <p className="text-sm text-indigo-300/60 mt-2">
                {isLoadingToken ? "Buscando token alternativo..." : `Carregando dados da sala... ${retryCount > 0 ? `(Tentativa ${retryCount + 1})` : ""}`}
              </p>
            )}
          </div>

          {/* Animated dots */}
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>

          {/* Progress bar */}
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  console.log("🔵 [Room Psychologist] ===== PASSANDO PROPS PARA SALAVIDEO =====");
  console.log("  - loggedUserId (do useAuthStore):", loggedUserId);
  console.log("  - rs?.PsychologistId:", rs?.PsychologistId);
  console.log("  - finalPsychologistId (escolhido):", finalPsychologistId);
  console.log("  - consultationId:", finalReservaSessao?.ConsultaId || id);
  console.log("  - finalConsultaDate:", finalConsultaDate);
  console.log("  - finalConsultaTime:", finalConsultaTime);
  console.log("  - finalScheduledAt:", finalScheduledAt);
  
  if (!finalPsychologistId) {
    console.error("❌ [Room Psychologist] ATENÇÃO: PsychologistId está vazio!");
    console.error("  - loggedUserId:", loggedUserId);
    console.error("  - rs?.PsychologistId:", rs?.PsychologistId);
    console.error("  - loggedUser completo:", loggedUser);
    console.error("  - rs completo:", rs);
  } else {
    console.log("✅ [Room Psychologist] PsychologistId disponível:", finalPsychologistId);
  }

  // Registra entrada do psicólogo ao entrar na room
  useEffect(() => {
    const markPsychologistJoined = async () => {
      const consultationId = finalReservaSessao?.ConsultaId || id;
      if (!consultationId) return;
      
      try {
        const userId = loggedUserId;
        if (!userId) return;

        // Verifica se já entrou
        const rs = finalReservaSessao as any;
        if (rs?.PsychologistJoinedAt) {
          return; // Já entrou
        }

        // Chama a API para registrar entrada
        const { api } = await import('@/lib/axios');
        await api.post(`/reserva-sessao/${consultationId}/join`, {
          userId,
          role: 'Psychologist',
        });
        
        console.log('✅ [Room Psychologist] Entrada registrada na sala');
      } catch (error) {
        console.warn('⚠️ [Room Psychologist] Erro ao registrar entrada:', error);
      }
    };

    markPsychologistJoined();
  }, [finalReservaSessao?.ConsultaId, id, loggedUserId, finalReservaSessao]);

  // ✅ Notificações em tempo real na room
  useEffect(() => {
    const consultationId = finalReservaSessao?.ConsultaId || id;
    if (!consultationId) return;

    const socket = getSocket();
    if (!socket) return;

    // Garante que está na sala da consulta para receber eventos
    const roomName = `consulta_${consultationId}`;
    socket.emit("join-room", roomName);

    const handleConsultationEvent = (data: ConsultationEventData) => {
      const status = data.status;
      if (status === "Cancelado" || status === "cancelled_by_patient" || status === "cancelled_by_psychologist") {
        toast.dismiss();
        toast.error("Sessão cancelada. Voltando para o painel.");
        router.replace("/painel-psicologo");
      }
    };

    const handleRoomClosed = (data: { event?: string; consultationId?: string; reason?: string; message?: string }) => {
      if (data.consultationId === consultationId || !data.consultationId) {
        toast.dismiss();
        toast.error(data.message || "Sessão encerrada.");
        router.replace("/painel-psicologo");
      }
    };

    // Escuta eventos da sala da consulta
    socket.on(`consultation:${consultationId}`, handleConsultationEvent);
    socket.on("room:close", handleRoomClosed);
    
    // Também escuta eventos diretos
    onConsultationEvent(handleConsultationEvent, consultationId);
    onRoomClosed(handleRoomClosed, consultationId);

    return () => {
      socket.off(`consultation:${consultationId}`, handleConsultationEvent);
      socket.off("room:close", handleRoomClosed);
      offRoomClosed(consultationId);
    };
  }, [finalReservaSessao?.ConsultaId, id, router]);

  return (
    <SalaVideo
      token={tokenForPsychologist}
      appId={appId || ""}
      channel={channel}
      uid={String(uidPsychologist || uidFromChannel || 0)}
      role="PSYCHOLOGIST"
      consultationId={finalReservaSessao?.ConsultaId || id}
      PsychologistId={finalPsychologistId}
      consultaDate={finalConsultaDate}
      consultaTime={finalConsultaTime}
      scheduledAt={finalScheduledAt}
    />
  );
}