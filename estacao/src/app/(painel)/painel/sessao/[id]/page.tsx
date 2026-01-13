"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import Dicas from "@/components/Dicas";

import { useConsultaById } from "@/hooks/consulta";
import { useMediaPreview } from "@/hooks/useMediaPreview";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import { useReservaSessao } from "@/hooks/reservaSessao";
import {  loadDevicePreferences, updateDevicePreference } from "@/utils/devicePreferences";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MediaDevice = {
  deviceId: string;
  label: string;
};

interface HTMLAudioElementWithSinkId {
  setSinkId?: (sinkId: string) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SessaoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  /* ------------------------------------------------------------------------ */
  /* Refs                                                                    */
  /* ------------------------------------------------------------------------ */

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ------------------------------------------------------------------------ */
  /* Media Hook                                                               */
  /* ------------------------------------------------------------------------ */

  const {
    start,
    stop,
    micLevel,
    ready,
    streamRef,
  } = useMediaPreview();

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [microfones, setMicrofones] = useState<MediaDevice[]>([]);
  const [audios, setAudios] = useState<MediaDevice[]>([]);

  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrofone, setSelectedMicrofone] = useState("");
  const [selectedAudio, setSelectedAudio] = useState("");

  /* ------------------------------------------------------------------------ */
  /* Load saved device preferences                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    loadDevicePreferences().then((preferences) => {
      if (preferences) {
        if (preferences.cameraDeviceId) {
          setSelectedCamera(preferences.cameraDeviceId);
        }
        if (preferences.microphoneDeviceId) {
          setSelectedMicrofone(preferences.microphoneDeviceId);
        }
        if (preferences.audioOutputDeviceId) {
          setSelectedAudio(preferences.audioOutputDeviceId);
        }
      }
    }).catch(console.error);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Apply saved preferences when devices are enumerated                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if ((cameras.length > 0 || microfones.length > 0 || audios.length > 0) && ready) {
      loadDevicePreferences().then((preferences) => {
        if (preferences) {
          // Aplica câmera preferida se disponível
          if (preferences.cameraDeviceId && cameras.length > 0 && !selectedCamera) {
            const cameraExists = cameras.some(c => c.deviceId === preferences.cameraDeviceId);
            if (cameraExists) {
              setSelectedCamera(preferences.cameraDeviceId);
              // Aplica a câmera automaticamente se o stream já estiver ativo
              if (streamRef.current) {
                handleChangeCamera(preferences.cameraDeviceId).catch(console.error);
              }
            }
          }
          
          // Aplica microfone preferido se disponível
          if (preferences.microphoneDeviceId && microfones.length > 0 && !selectedMicrofone) {
            const micExists = microfones.some(m => m.deviceId === preferences.microphoneDeviceId);
            if (micExists) {
              setSelectedMicrofone(preferences.microphoneDeviceId);
              // Aplica o microfone automaticamente se o stream já estiver ativo
              if (streamRef.current) {
                handleChangeMicrofone(preferences.microphoneDeviceId).catch(console.error);
              }
            }
          }
          
          // Aplica áudio de saída preferido se disponível
          if (preferences.audioOutputDeviceId && audios.length > 0 && !selectedAudio) {
            const audioExists = audios.some(a => a.deviceId === preferences.audioOutputDeviceId);
            if (audioExists) {
              setSelectedAudio(preferences.audioOutputDeviceId);
            }
          }
        }
      }).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras.length, microfones.length, audios.length, ready]);

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [isValidatingAccess, setIsValidatingAccess] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Data                                                                     */
  /* ------------------------------------------------------------------------ */

  const { consulta } = useConsultaById(id);
  const { reservaSessao, isLoading: isLoadingReserva, refetch: refetchReservaSessao } = useReservaSessao(id);
  const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();

  const channel = consulta?.ReservaSessao?.AgoraChannel || reservaSessao?.AgoraChannel;
  const agendaId = consulta?.AgendaId || reservaSessao?.AgendaId;
  
  const canEnter = Boolean(
    channel && 
    agendaId && 
    !isLoadingReserva && 
    !isValidatingAccess
  );

  /* ------------------------------------------------------------------------ */
  /* Helpers                                                                  */
  /* ------------------------------------------------------------------------ */

  const enumerateDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();

    setCameras(
      devices
        .filter(d => d.kind === "videoinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || "Câmera",
        }))
    );

    setMicrofones(
      devices
        .filter(d => d.kind === "audioinput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || "Microfone",
        }))
    );

    setAudios(
      devices
        .filter(d => d.kind === "audiooutput")
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || "Áudio",
        }))
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Permission + Start Preview                                               */
  /* ------------------------------------------------------------------------ */

  const handleRequestPermission = async () => {
    try {
      setRequesting(true);
      setPermissionError(null);

      const stream = await start({ audio: true, video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      await enumerateDevices();
    } catch (err) {
      console.error(err);
      setPermissionError(
        "Não foi possível acessar câmera e microfone. Verifique as permissões do navegador."
      );
    } finally {
      setRequesting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Auto-start permissions if already granted                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const checkAndStartPermissions = async () => {
      // Verifica se já tem permissões concedidas
      const PERMISSIONS_CACHE_KEY = 'agora_media_permissions_granted';
      const hasCachedPermissions = typeof window !== 'undefined' && localStorage.getItem(PERMISSIONS_CACHE_KEY) === 'true';
      
      // Verifica permissões via API se disponível
      let audioPermissionGranted = false;
      let videoPermissionGranted = false;
      
      try {
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            audioPermissionGranted = audioPermission.state === 'granted';
          } catch (e) {
            console.warn('Não foi possível verificar permissão de áudio:', e);
          }

          try {
            const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            videoPermissionGranted = videoPermission.state === 'granted';
          } catch (e) {
            console.warn('Não foi possível verificar permissão de vídeo:', e);
          }
        }
      } catch (e) {
        console.warn('API de permissões não disponível:', e);
      }

      // Se já tem permissões concedidas (cache ou API), inicia automaticamente
      if (hasCachedPermissions || (audioPermissionGranted && videoPermissionGranted)) {
        try {
          console.log('✅ [SessaoPage] Permissões já concedidas, iniciando câmera e microfone automaticamente...');
          const stream = await start({ audio: true, video: true });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          await enumerateDevices();
        } catch (err) {
          // Se falhar, limpa o cache e permite solicitação manual
          if (typeof window !== 'undefined') {
            localStorage.removeItem(PERMISSIONS_CACHE_KEY);
          }
          console.warn('⚠️ [SessaoPage] Permissões foram revogadas:', err);
        }
      }
    };

    checkAndStartPermissions();
  }, [start, enumerateDevices]);

  /* ------------------------------------------------------------------------ */
  /* Change Camera                                                            */
  /* ------------------------------------------------------------------------ */

  const handleChangeCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    // Salva a preferência
    updateDevicePreference('cameraDeviceId', deviceId || null);

    if (!streamRef.current) return;

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    });

    const newTrack = newStream.getVideoTracks()[0];
    const oldTrack = streamRef.current.getVideoTracks()[0];

    if (oldTrack) {
      streamRef.current.removeTrack(oldTrack);
      oldTrack.stop();
    }

    streamRef.current.addTrack(newTrack);

    if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Change Microphone                                                        */
  /* ------------------------------------------------------------------------ */

  const handleChangeMicrofone = async (deviceId: string) => {
    setSelectedMicrofone(deviceId);
    // Salva a preferência
    updateDevicePreference('microphoneDeviceId', deviceId || null).catch(console.error);

    if (!streamRef.current) return;

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
    });

    const newTrack = newStream.getAudioTracks()[0];
    const oldTrack = streamRef.current.getAudioTracks()[0];

    if (oldTrack) {
      streamRef.current.removeTrack(oldTrack);
      oldTrack.stop();
    }

    streamRef.current.addTrack(newTrack);
  };

  /* ------------------------------------------------------------------------ */
  /* Audio Output                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!audioRef.current || !selectedAudio) return;
    const audioElement = audioRef.current as HTMLAudioElement & HTMLAudioElementWithSinkId;
    if ('setSinkId' in audioElement && typeof audioElement.setSinkId === 'function') {
      audioElement.setSinkId(selectedAudio).catch((err: unknown) => {
        console.error("Erro ao definir dispositivo de áudio:", err);
      });
    }
  }, [selectedAudio]);

  // Salva preferência de áudio de saída quando selecionada
  useEffect(() => {
    if (selectedAudio) {
      updateDevicePreference('audioOutputDeviceId', selectedAudio || null).catch(console.error);
    }
  }, [selectedAudio]);

  /* ------------------------------------------------------------------------ */
  /* Cleanup                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  /* ------------------------------------------------------------------------ */
  /* Enter Session                                                            */
  /* ------------------------------------------------------------------------ */

  const handleEntrarSessao = async () => {
    if (!id) {
      toast.error("ID da consulta não encontrado.");
      return;
    }

    if (!channel || !agendaId) {
      toast.error("Dados da consulta incompletos.");
      return;
    }

    try {
      setIsValidatingAccess(true);

      console.log('[SessaoPage] Verificando tokens antes de entrar na sala...');
      
      // Valida se ambos os tokens existem na reservaSessao atual
      const hasPatientToken = reservaSessao?.AgoraTokenPatient && 
        reservaSessao.AgoraTokenPatient.trim().length > 0;
      const hasPsychologistToken = reservaSessao?.AgoraTokenPsychologist && 
        reservaSessao.AgoraTokenPsychologist.trim().length > 0;

      // Se algum token estiver ausente ou null, gera ambos
      if (!hasPatientToken || !hasPsychologistToken) {
        console.log('[SessaoPage] Tokens ausentes ou inválidos. Gerando tokens...', {
          hasPatientToken,
          hasPsychologistToken,
        });
        
        // Chama o método que gera os tokens com callback para refetch
        const tokensResult = await checkAndGenerateTokens(id, async () => {
          // Faz refetch da reserva após gerar os tokens
          await refetchReservaSessao();
          await new Promise(resolve => setTimeout(resolve, 300)); // Aguarda um pouco para garantir que o backend atualizou
        });

        if (!tokensResult) {
          console.error('[SessaoPage] Falha ao gerar tokens');
          toast.error('Não foi possível gerar os tokens da consulta.');
          return;
        }

        // Verifica novamente se ambos os tokens foram gerados com sucesso
        if (!tokensResult.patientTokenExists || !tokensResult.psychologistTokenExists) {
          console.error('[SessaoPage] Tokens não foram gerados corretamente:', {
            patientTokenExists: tokensResult.patientTokenExists,
            psychologistTokenExists: tokensResult.psychologistTokenExists,
          });
          toast.error('Não foi possível gerar os tokens. Tente novamente.');
          return;
        }
      } else {
        console.log('[SessaoPage] Ambos os tokens já existem e são válidos');
      }

      // Validação final: verifica se ambos os tokens são diferentes de null
      // Recarrega a reserva para garantir que temos os dados mais recentes
      const finalCheck = await checkAndGenerateTokens(id, async () => {
        await refetchReservaSessao();
      });
      
      if (!finalCheck || !finalCheck.patientTokenExists || !finalCheck.psychologistTokenExists) {
        console.error('[SessaoPage] Validação final falhou:', finalCheck);
        toast.error('Não foi possível validar os tokens. Tente novamente.');
        return;
      }

      console.log('[SessaoPage] Tokens validados com sucesso, entrando na sala...');
      
      // Navega para a sala
      router.push(`/painel/room/${agendaId}/${channel}`);
    } catch (error) {
      console.error('[SessaoPage] Erro ao entrar na sessão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao acessar a sala';
      toast.error(errorMessage);
    } finally {
      setIsValidatingAccess(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-[#FCFBF6] px-4 py-4">
      <div className="max-w-7xl mx-auto">
        <BreadcrumbsVoltar />

        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Algumas dicas importantes para que você tenha uma boa sessão!
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Dicas />
          </div>

          <div className="flex flex-col items-center order-1 lg:order-2">
            {permissionError && (
              <div className="mb-4 p-3 bg-red-50 border rounded text-sm text-red-700">
                {permissionError}
              </div>
            )}

            {!ready && (
              <button
                onClick={handleRequestPermission}
                disabled={requesting}
                className="w-full max-w-sm h-11 rounded-lg bg-[#6D75C0] text-white font-semibold mb-4 hover:bg-[#5a63a8] active:bg-[#4d558f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {requesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Solicitando permissões...
                  </span>
                ) : (
                  "Permitir câmera e microfone"
                )}
              </button>
            )}

            <div className="w-full max-w-sm aspect-video bg-gray-200 rounded-lg overflow-hidden mb-3 relative shadow-lg border-2 border-gray-300">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <div className="text-center p-4">
                    <Image
                      src="/assets/video-placeholder.svg"
                      alt="Preview"
                      fill
                      className="object-cover opacity-50"
                    />
                    <p className="text-xs text-gray-500 mt-2 relative z-10">Aguardando câmera...</p>
                  </div>
                </div>
              )}
              {ready && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Ativo
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4 w-full max-w-sm">
              <span className="text-xs font-medium text-gray-700 min-w-[100px]">Nível do microfone</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-150"
                  style={{ width: `${Math.min(micLevel * 2, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 min-w-[30px] text-right">
                {Math.round(micLevel * 2)}%
              </span>
            </div>

            <audio ref={audioRef} autoPlay hidden />

            {/* Device Selectors - Responsive layout */}
            <div className="w-full max-w-sm mb-4 space-y-3">
              {/* Mobile: Stacked layout */}
              <div className="flex flex-col sm:hidden space-y-2">
                <label className="text-xs font-medium text-gray-700">Microfone</label>
                <select
                  className="w-full h-11 rounded-lg bg-[#F2F4FD] px-3 text-sm border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedMicrofone}
                  onChange={e => handleChangeMicrofone(e.target.value)}
                >
                  <option value="">Selecione o microfone</option>
                  {microfones.map(m => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <label className="text-xs font-medium text-gray-700">Câmera</label>
                <select
                  className="w-full h-11 rounded-lg bg-[#F2F4FD] px-3 text-sm border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedCamera}
                  onChange={e => handleChangeCamera(e.target.value)}
                >
                  <option value="">Selecione a câmera</option>
                  {cameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <label className="text-xs font-medium text-gray-700">Áudio de Saída</label>
                <select
                  className="w-full h-11 rounded-lg bg-[#F2F4FD] px-3 text-sm border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedAudio}
                  onChange={e => setSelectedAudio(e.target.value)}
                >
                  <option value="">Selecione o áudio</option>
                  {audios.map(a => (
                    <option key={a.deviceId} value={a.deviceId}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop: Horizontal layout */}
              <div className="hidden sm:flex gap-2">
                <select
                  className="flex-1 h-11 rounded-lg bg-[#F2F4FD] px-3 text-xs border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedMicrofone}
                  onChange={e => handleChangeMicrofone(e.target.value)}
                  title="Microfone"
                >
                  <option value="">Microfone</option>
                  {microfones.map(m => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label.length > 15 ? m.label.substring(0, 15) + '...' : m.label}
                    </option>
                  ))}
                </select>

                <select
                  className="flex-1 h-11 rounded-lg bg-[#F2F4FD] px-3 text-xs border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedCamera}
                  onChange={e => handleChangeCamera(e.target.value)}
                  title="Câmera"
                >
                  <option value="">Câmera</option>
                  {cameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label.length > 15 ? c.label.substring(0, 15) + '...' : c.label}
                    </option>
                  ))}
                </select>

                <select
                  className="flex-1 h-11 rounded-lg bg-[#F2F4FD] px-3 text-xs border border-gray-200 focus:border-[#6D75C0] focus:outline-none focus:ring-2 focus:ring-[#6D75C0]/20 transition-all"
                  value={selectedAudio}
                  onChange={e => setSelectedAudio(e.target.value)}
                  title="Áudio de Saída"
                >
                  <option value="">Áudio</option>
                  {audios.map(a => (
                    <option key={a.deviceId} value={a.deviceId}>
                      {a.label.length > 15 ? a.label.substring(0, 15) + '...' : a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleEntrarSessao}
              disabled={!canEnter || isValidatingAccess || isCheckingTokens || !ready}
              className={`w-full max-w-sm h-12 rounded-lg text-white text-lg font-medium transition-all duration-200 shadow-md ${
                canEnter && !isValidatingAccess && !isCheckingTokens && ready
                  ? "bg-[#8494E9] hover:bg-[#7383d8] hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-gray-400 cursor-not-allowed opacity-60"
              }`}
            >
              {isValidatingAccess || isCheckingTokens ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparando acesso...
                </span>
              ) : !ready ? (
                'Aguarde a inicialização da câmera'
              ) : (
                'Entrar na sessão'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
