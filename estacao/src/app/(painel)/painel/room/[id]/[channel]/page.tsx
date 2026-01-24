"use client";
import SalaVideo from '@/components/SalaVideo';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useReservaSessao } from '@/hooks/reservaSessao';
import type { ReservaSessao } from '@/types/reservaSessaoTypes';
import { consultaService } from '@/services/consultaService';
import { reservaSessaoService } from '@/services/reservaSessaoService';
import toast from 'react-hot-toast';
import { onConsultationEvent, onRoomClosed, offRoomClosed, getSocket, ConsultationEventData } from '@/lib/socket';
 
export default function Room() {
  // ✅ HOOKS DEVEM ESTAR NO INÍCIO - ANTES DE QUALQUER RETURN
  // Hooks de estado e refs
  const timeoutMinutesMs = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [forceReady, setForceReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [tokenFromChannel, setTokenFromChannel] = useState<string | null>(null);
  const [uidFromChannel, setUidFromChannel] = useState<number>(0);
  const [tokenFetchAttempts, setTokenFetchAttempts] = useState(0);
  const tokenFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastShownRef = useRef(false);
  const [reservaSessaoFromChannel, setReservaSessaoFromChannel] = useState<ReservaSessao | null>(null);
  const [isLoadingFromChannel, setIsLoadingFromChannel] = useState(false);

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

  // Só chama o hook se id existir

  console.log("Room ID:", id);
  console.log("Channel (param):", channelParam);

  const { reservaSessao, refetch, isLoading: isLoadingReserva, isError: isErrorReserva } = useReservaSessao(id);
  const rs = reservaSessao as ReservaSessao | undefined;
  
  // Prioriza dados do channel se disponíveis, senão usa dados da reserva original
  const finalReservaSessao = reservaSessaoFromChannel || rs;
  
  useEffect(() => {
    // Só busca pelo channel se:
    // 1. Tem channel disponível
    // 2. Não está carregando
    // 3. A reserva não tem todos os dados necessários OU não foi encontrada
    const hasAllData = rs && 
      rs.AgoraTokenPatient && 
      rs.Uid && 
      rs.ConsultaDate && 
      rs.ConsultaTime && 
      rs.ScheduledAt && 
      rs.PsychologistId;
    
    if (channelParam && !isLoadingFromChannel && !hasAllData && !reservaSessaoFromChannel) {
      setIsLoadingFromChannel(true);
      try {
        const service = reservaSessaoService();
        if (!service || typeof service?.getByChannel !== 'function') {
          console.error('❌ [Room] reservaSessaoService não retornou um objeto válido ou getByChannel não é uma função', {
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
            // Atualiza o store também
            import('@/store/reservaSessaoStore').then(({ useReservaSessaoStore }) => {
              useReservaSessaoStore.getState().setReservaSessao(data);
            });
          }
        })
        .catch((err) => {
          console.error("❌ Erro ao buscar ReservaSessao pelo channel:", err);
        })
        .finally(() => {
          setIsLoadingFromChannel(false);
        });
      } catch (error) {
        console.error("❌ [Room] Erro ao chamar reservaSessaoService:", error);
        setIsLoadingFromChannel(false);
      }
    }
  }, [channelParam, rs, isLoadingFromChannel, reservaSessaoFromChannel]);

  const consultationId = useMemo(() => {
    // Prioriza ConsultaId da reserva, mas garante que sempre retorne o id original se não existir
    return finalReservaSessao?.ConsultaId || id || "";
  }, [finalReservaSessao?.ConsultaId, id]);

  // Estado isLoadingToken 
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Valores estáveis usando useMemo para garantir que o array de dependências não mude de tamanho
  // IMPORTANTE: Sala do paciente usa APENAS AgoraTokenPatient (não usa token do psicólogo)
  // FONTE DOS TOKENS: Sempre vem da tabela ReservaSessao via useReservaSessao(id)
  const existingTokenValue = useMemo(() => {
    // Usa APENAS AgoraTokenPatient - NUNCA usa tokens alternativos
    return finalReservaSessao?.AgoraTokenPatient || '';
  }, [finalReservaSessao?.AgoraTokenPatient]);

  // Busca token pelo channel se necessário (quando reserva não encontrada ou token não disponível)
  useEffect(() => {
    // Se já mostrou toast de erro, não tenta buscar novamente
    if (toastShownRef.current) {
      return;
    }

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
      !toastShownRef.current && // Não tenta se já mostrou toast
      tokenFetchAttempts < MAX_TOKEN_FETCH_ATTEMPTS && // Limita tentativas
      (
        // Caso 1: Reserva não encontrada mas temos channel
        !hasReserva ||
        // Caso 2: Reserva encontrada mas não tem token do paciente
        (hasReserva && !hasToken)
      );

    if (shouldFetchToken) {
      console.log("🔄 Buscando token pelo channel...", { 
        hasReserva, 
        channel: channelParam,
        attempt: tokenFetchAttempts + 1,
        maxAttempts: MAX_TOKEN_FETCH_ATTEMPTS
      });
      setIsLoadingToken(true);
      setTokenFetchAttempts(prev => prev + 1);
      
      // Limpa timeout anterior se existir
      if (tokenFetchTimeoutRef.current) {
        clearTimeout(tokenFetchTimeoutRef.current);
      }
      
      // Timeout de segurança: se a requisição demorar mais de 10s, cancela
      tokenFetchTimeoutRef.current = setTimeout(() => {
        console.warn("⏱️ Timeout ao buscar token pelo channel (10s)");
        setIsLoadingToken(false);
        if (tokenFetchAttempts >= MAX_TOKEN_FETCH_ATTEMPTS - 1) {
          toastShownRef.current = true;
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
          
          // Se já mostrou toast, não mostra novamente
          if (toastShownRef.current) {
            return;
          }
          
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
            router.replace("/painel/sala-nao-encontrada");
            return;
          }
          
          // Marca que o toast foi mostrado ANTES de mostrar (apenas para outros erros)
          toastShownRef.current = true;
          
          // Erros de consulta finalizada (410)
          if (status === 410 || errorCode === 'CONSULTA_CONCLUIDA' || errorCode === 'TOKENS_EXPIRADOS' || errorCode === 'CONSULTA_CANCELADA') {
            const message = errorMessage || 'Esta consulta já foi finalizada. Os tokens de acesso foram removidos por segurança.';
            setError(message);
            toast.error(message);
            
            // Redireciona após 3 segundos
            setTimeout(() => {
              router.push("/painel");
            }, 3000);
            return; // Impede que continue o fluxo
          }
          
          // Outros erros
          const message = errorMessage || 'Erro ao acessar a sala de vídeo. Por favor, tente novamente.';
          setError(message);
          toast.error(message);
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
      router.replace("/painel/sala-nao-encontrada");
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

  // Redireciona ao cancelar/fechar sala por inatividade
  useEffect(() => {
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
        router.replace("/painel");
      }
    };

    const handleRoomClosed = (data: { event?: string; consultationId?: string; reason?: string; message?: string }) => {
      if (data.consultationId === consultationId || !data.consultationId) {
        toast.dismiss();
        toast.error(data.message || "Sessão encerrada.");
        router.replace("/painel");
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
  }, [consultationId, router]);

  // IMPORTANTE: Sala do paciente usa APENAS AgoraTokenPatient (não usa token do psicólogo)
  // HIERARQUIA DE TOKENS:
  // 1. AgoraTokenPatient da reserva (fonte primária)
  // 2. tokenFromChannel (gerado via API /reservas/token/{channel} se necessário)
  // NUNCA usa: TokenPaciente, TokenPsicologo, AgoraTokenPsychologist ou qualquer outro token
  const tokenForPatient = finalReservaSessao?.AgoraTokenPatient || tokenFromChannel || "";
  const channel = finalReservaSessao?.AgoraChannel || finalReservaSessao?.Channel || channelParam || "";
  const uidPatient = finalReservaSessao?.Uid || uidFromChannel || 0;
  
  // Extrai dados da consulta com múltiplos fallbacks
  // 🎯 Prioriza dados do channel se disponíveis
  const finalConsultaDate = finalReservaSessao?.ConsultaDate || "";
  const finalConsultaTime = finalReservaSessao?.ConsultaTime || "";
  const finalScheduledAt = finalReservaSessao?.ScheduledAt || "";
  const finalPsychologistId = finalReservaSessao?.PsychologistId || "";
  
  // Log detalhado dos dados (apenas para debug quando necessário)
  useEffect(() => {
    console.log("🔑 [Patient] Token (AgoraTokenPatient):", tokenForPatient ? "✅ Presente" : "❌ Ausente");
    console.log("📺 [Patient] Channel:", channel || "❌ Ausente");
    console.log("🆔 [Patient] UID:", uidPatient || "❌ Ausente");
    console.log("📋 [Patient] Channel (param):", channelParam);
    console.log("📅 [Patient] ConsultaDate:", finalConsultaDate || "❌ Ausente");
    console.log("⏰ [Patient] ConsultaTime:", finalConsultaTime || "❌ Ausente");
    console.log("📆 [Patient] ScheduledAt:", finalScheduledAt || "❌ Ausente");
    console.log("👨‍⚕️ [Patient] PsychologistId:", finalPsychologistId || "❌ Ausente");
    console.log("🔍 [Patient] Token source:", {
      AgoraTokenPatient: finalReservaSessao?.AgoraTokenPatient ? "✅" : "❌",
      tokenFromChannel: tokenFromChannel ? "✅" : "❌",
      finalToken: tokenForPatient ? "✅ Presente" : "❌ Ausente",
      source: reservaSessaoFromChannel ? "channel" : "id"
    });
    console.log("🔍 [Patient] Loading states:", {
      isLoadingReserva,
      isLoadingToken,
      isLoadingFromChannel,
      isErrorReserva
    });
  }, [tokenForPatient, channel, uidPatient, channelParam, finalConsultaDate, finalConsultaTime, finalScheduledAt, finalPsychologistId, finalReservaSessao, tokenFromChannel, reservaSessaoFromChannel, isLoadingReserva, isLoadingToken, isLoadingFromChannel, isErrorReserva]);
  
  // Validação mais rigorosa: só permite se tiver token válido
  const hasValidToken = typeof tokenForPatient === "string" && tokenForPatient.trim().length > 0;
  const hasValidChannel = typeof channel === "string" && channel.trim().length > 0;
  const hasValidAppId = typeof appId === "string" && appId.trim().length > 0;
  const hasValidUid = (typeof uidPatient === "number" && uidPatient > 0) || uidFromChannel > 0;
  
  // ✅ NOVA LÓGICA: Permite entrar na sala se tiver token (de qualquer fonte) E channel e appId
  // Não aguarda todos os dados da reserva se conseguir o token por outro caminho
  const isReady =
    !error && // Não permite se houver erro de permissão
    hasValidAppId && // AppId é obrigatório
    hasValidToken && // Token é obrigatório (de qualquer fonte: AgoraTokenPatient ou tokenFromChannel)
    hasValidChannel && // Channel é obrigatório
    hasValidUid && // UID é obrigatório
    (
      // Condições de carregamento: permite se dados NOT estão carregando OU se conseguiu dados por algum caminho
      (!isLoadingReserva && !isLoadingToken && !isLoadingFromChannel) || // Nenhum está carregando
      (tokenFromChannel && channel && hasValidUid) || // Tem token e channel via fallback
      (finalReservaSessao && finalReservaSessao.AgoraTokenPatient) // Tem dados da reserva
    );

  // ✅ NOVO: Permite entrar com dados parciais após timeout para evitar telas de loading infinitas
  useEffect(() => {
    // Se já tem um token válido e dados essenciais, permite entrar
    if (isReady) {
      if (timeoutMinutesMs.current) {
        clearTimeout(timeoutMinutesMs.current);
      }
      setForceReady(false);
      return;
    }
    
    // Se passou 5 segundos e tem pelo menos token + channel + appId, permite forçadamente
    if (!timeoutMinutesMs.current && hasValidToken && hasValidChannel && hasValidAppId) {
      timeoutMinutesMs.current = setTimeout(() => {
        console.warn('⚠️ [Room Page] Timeout de loading - forçando entrada na sala com dados parciais');
        setForceReady(true);
      }, 5000);
    }
    
    return () => {
      if (timeoutMinutesMs.current) {
        clearTimeout(timeoutMinutesMs.current);
      }
    };
  }, [isReady, hasValidToken, hasValidChannel, hasValidAppId]);

  // Mostra erro se houver problema - especialmente erros de permissão
  // ✅ NOVA LÓGICA: Só mostra erro se realmente não conseguiu nenhum token após todas as tentativas
  if (error && !tokenFromChannel && !finalReservaSessao?.AgoraTokenPatient) {
    // Se for erro de permissão, não mostra botão de tentar novamente
    const isPermissionError = error?.includes('permissão') || error?.includes('Token') || error?.includes('sala foi fechada');
    
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          <div className="text-red-300 text-lg mb-4 max-w-md">
            {!appId 
              ? "Erro de configuração: App ID do Agora não está configurado. Verifique se a variável de ambiente AGORA_APP_ID está definida e reinicie o servidor." 
              : (error || "Erro ao carregar dados da sala")
            }
          </div>
          {!isPermissionError && (
            <button
              onClick={() => {
                setError(null);
                setRetryCount(0);
                refetch();
              }}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
          {isPermissionError && (
            <div className="text-indigo-200 text-sm">
              Redirecionando para o painel...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!appId) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          <div className="text-red-300 text-lg mb-4 max-w-md">
            Erro de configuração: App ID do Agora não está configurado
          </div>
        </div>
      </div>
    );
  }

  // ✅ Permite entrar se estiver pronto OU se forçou após timeout
  const canEnter = isReady || (forceReady && hasValidToken && hasValidChannel && hasValidAppId && hasValidUid);

  if (!canEnter) {
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
              {error ? "Erro ao carregar sala" : "Preparando sua sala..."}
            </h2>
            <p className="text-base sm:text-lg text-indigo-200/80">
              {error || "Aguarde enquanto configuramos tudo para você"}
            </p>
            {(isLoadingReserva || isLoadingToken) && (
              <p className="text-sm text-indigo-300/60 mt-2">
                {isLoadingToken ? "Buscando token alternativo..." : `Carregando dados da sala... ${retryCount > 0 ? `(Tentativa ${retryCount + 1})` : ""}`}
              </p>
            )}
            {!isLoadingReserva && !isLoadingToken && !isReady && (
              <p className="text-xs text-indigo-300/40 mt-2">
                Se esta tela não desaparecer, verifique sua conexão e recarregue a página.
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

  // Registra entrada do paciente ao entrar na room
  useEffect(() => {
    const markPatientJoined = async () => {
      if (!consultationId || !id) return;
      
      try {
        const { useAuthStore } = await import('@/store/authStore');
        const userId = useAuthStore.getState().user?.Id;
        if (!userId) return;

        // Verifica se já entrou
        const rs = finalReservaSessao as any;
        if (rs?.PatientJoinedAt) {
          return; // Já entrou
        }

        // Chama a API para registrar entrada
        const { api } = await import('@/lib/axios');
        await api.post(`/reserva-sessao/${consultationId || id}/join`, {
          userId,
          role: 'Patient',
        });
        
        console.log('✅ [Room Patient] Entrada registrada na sala');
      } catch (error) {
        console.warn('⚠️ [Room Patient] Erro ao registrar entrada:', error);
      }
    };

    markPatientJoined();
  }, [consultationId, id, finalReservaSessao]);

  return (
    <SalaVideo
      token={tokenForPatient}
      appId={appId || ""}
      channel={channel}
      uid={String(uidPatient || uidFromChannel || 0)}
      role="PATIENT"
      consultationId={consultationId || id}
      PsychologistId={finalPsychologistId}
      consultaDate={finalConsultaDate}
      consultaTime={finalConsultaTime}
      scheduledAt={finalScheduledAt}
    />
  );
}
