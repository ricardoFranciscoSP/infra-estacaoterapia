// src/hooks/useAgora.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type {
    IAgoraRTCClient,
    IMicrophoneAudioTrack,
    ICameraVideoTrack,
    IAgoraRTCRemoteUser,
    IRemoteVideoTrack,
    IAgoraRTCError,
} from 'agora-rtc-sdk-ng';
import { loadAgoraRTC } from '@/lib/agoraRtc';

const isBrowser = typeof window !== 'undefined';

import { agoraConfig, validateAgoraConfig } from '@/config/agoraConfig';
import type {
    UserPublishedCallback,
    UserUnpublishedCallback,
} from '@/types/agora.types';
import {
    isMediaPermissionError,
    isAgoraRTCError,
    isRTCConnectionError,
} from '@/types/agora.types';

export function useAgora({
    appId,
    channelName,
    token,
    uid,
    videoContainerId = 'video-streams',
    onUserPublished,
    onUserUnpublished,
    devicePreferences,
}: {
    appId: string;
    channelName: string;
    token: string;
    uid: string | number;
    videoContainerId?: string;
    onUserPublished?: UserPublishedCallback;
    onUserUnpublished?: UserUnpublishedCallback;
    devicePreferences?: {
        cameraDeviceId?: string | null;
        microphoneDeviceId?: string | null;
        audioOutputDeviceId?: string | null;
    };
}) {
    const [joined, setJoined] = useState(false);
    const [roomLink, setRoomLink] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [messages, setMessages] = useState<{ text: string; from: string }[]>([]);

    // Referências
    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
    const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
    const remoteVideoTracksRef = useRef<Record<string, IRemoteVideoTrack>>({});
    // Estado reativo para disparar re-render quando usuários remotos entram/saem
    const [remoteVideoTracksState, setRemoteVideoTracksState] = useState<Record<string, IRemoteVideoTrack>>({});

    // Estados reativos para tracks locais - forçam re-render quando são criados
    const [localAudioTrackState, setLocalAudioTrackState] = useState<IMicrophoneAudioTrack | null>(null);
    const [localVideoTrackState, setLocalVideoTrackState] = useState<ICameraVideoTrack | null>(null);

    const isCleanupRef = useRef(false);
    const sanitizedUidRef = useRef<string>('');

    // Inicializa sanitizedUid apenas uma vez
    if (!sanitizedUidRef.current) {
        let uid_clean = String(uid ?? "").replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
        if (!uid_clean) {
            uid_clean = 'user' + Math.random().toString(36).substr(2, 9);
        }
        sanitizedUidRef.current = uid_clean;
    }

    const [effectiveUid, setEffectiveUid] = useState(sanitizedUidRef.current);

    // Refs para callbacks para evitar loop
    const onUserPublishedRef = useRef(onUserPublished);
    const onUserUnpublishedRef = useRef(onUserUnpublished);

    useEffect(() => {
        onUserPublishedRef.current = onUserPublished;
        onUserUnpublishedRef.current = onUserUnpublished;
    }, [onUserPublished, onUserUnpublished]);

    // Flags para evitar múltiplas conexões simultâneas
    const isRTCJoiningRef = useRef(false);

    // === Funções Públicas ===
    const leaveRoom = useCallback(async () => {
        if (!isBrowser) return;
        try {
            if (localVideoTrackRef.current) {
                localVideoTrackRef.current.stop();
                localVideoTrackRef.current.close();
                localVideoTrackRef.current = null;
                setLocalVideoTrackState(null);
            }
            if (localAudioTrackRef.current) {
                localAudioTrackRef.current.stop();
                localAudioTrackRef.current.close();
                localAudioTrackRef.current = null;
                setLocalAudioTrackState(null);
            }
            if (clientRef.current) {
                await clientRef.current.leave();
                clientRef.current = null;
            }
            // Limpa tracks remotos
            remoteVideoTracksRef.current = {};
            setRemoteVideoTracksState({});
            const container = document.getElementById(videoContainerId);
            if (container) {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }
            setJoined(false);
            setError(null);
            console.log('🚪 Saiu da sala (RTC)');
        } catch (err) {
            setError('Erro ao sair da sala');
            console.error('Erro ao sair da sala:', err);
        }
    }, [videoContainerId]);

    // === RTC: Conectar à Sala de Vídeo ===
    useEffect(() => {
        if (!isBrowser) return;
        if (!appId || !channelName || !token || !uid) {
            setError("Parâmetros obrigatórios ausentes para conexão RTC");
            return;
        }

        isCleanupRef.current = false;

        async function joinRTC() {
            if (isCleanupRef.current || isRTCJoiningRef.current) return;
            isRTCJoiningRef.current = true;

            try {
                setIsConnecting(true);
                setError(null);

                // Verifica se está em contexto seguro (HTTPS ou localhost)
                if (isBrowser) {
                    const isSecureContext = window.isSecureContext ||
                        window.location.protocol === 'https:' ||
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';

                    if (!isSecureContext) {
                        console.warn('⚠️ [useAgora] Aplicação não está em contexto seguro. Alguns navegadores podem bloquear acesso a câmera/microfone.');
                    }
                }

                const validationErrors = validateAgoraConfig(appId, token, channelName);
                if (validationErrors.length > 0) {
                    throw new Error(`Configuração inválida: ${validationErrors.join(', ')}`);
                }

                await leaveRoom();
                await new Promise(resolve => setTimeout(resolve, 300));

                // 🎯 CORREÇÃO: Não retorna se já existe cliente - permite reconexão
                // Remove cliente anterior para permitir nova conexão
                if (clientRef.current) {
                    console.log('🔄 [useAgora] Cliente existente encontrado, limpando para reconexão...');
                    try {
                        await clientRef.current.leave();
                        await clientRef.current.unpublish();
                    } catch (e) {
                        console.warn('⚠️ [useAgora] Erro ao limpar cliente anterior:', e);
                    }
                    clientRef.current = null;
                }

                const AgoraRTC = await loadAgoraRTC();
                const client = AgoraRTC.createClient(agoraConfig.client);
                clientRef.current = client;

                client.on('error', (err: IAgoraRTCError) => {
                    setError(`RTC: ${err.message}`);
                });

                client.on('connection-state-change', (cur, prev, reason) => {
                    console.log('RTC estado:', { cur, prev, reason });
                });

                // Listener para detectar quando usuário entra no canal (antes de publicar)
                client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
                    console.log(`🚪 [useAgora] user-joined - Usuário entrou no canal - UID: ${user.uid}`);
                });

                // Listener para detectar quando usuário sai do canal
                client.on('user-left', (user: IAgoraRTCRemoteUser, reason: string) => {
                    console.log(`🚪 [useAgora] user-left - Usuário saiu do canal - UID: ${user.uid}, motivo: ${reason}`);
                });

                // Tentativa com retry
                let connected = false;
                let currentUid = effectiveUid;
                for (let i = 0; i < agoraConfig.network.maxRetries && !isCleanupRef.current; i++) {
                    try {
                        await client.join(appId, channelName, token, currentUid);
                        connected = true;
                        setEffectiveUid(currentUid);

                        // Log dos usuários já presentes no canal
                        const existingUsers = client.remoteUsers;
                        console.log(`👥 [useAgora] Conectado ao canal! Usuários já presentes:`, {
                            total: existingUsers.length,
                            uids: existingUsers.map(u => u.uid)
                        });

                        break;
                    } catch (err) {
                        // Tipagem explícita para erro de conexão
                        if (isRTCConnectionError(err) && err.code === 'UID_CONFLICT') {
                            currentUid = sanitizedUidRef.current + '_' + (i + 1);
                            setEffectiveUid(currentUid);
                            console.warn(`UID em conflito, tentando ${currentUid}`);
                            if (i < agoraConfig.network.maxRetries - 1) {
                                await new Promise(r => setTimeout(r, agoraConfig.network.retryDelay * (i + 1)));
                            }
                            continue;
                        }
                        if (i < agoraConfig.network.maxRetries - 1) {
                            await new Promise(r => setTimeout(r, agoraConfig.network.retryDelay * (i + 1)));
                        }
                    }
                }

                if (!connected || isCleanupRef.current) {
                    throw new Error('Falha ao conectar ao RTC após várias tentativas');
                }

                // Verificar se o contexto é seguro antes de solicitar permissões
                if (isBrowser) {
                    const isSecureContext = window.isSecureContext ||
                        window.location.protocol === 'https:' ||
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';

                    if (!isSecureContext) {
                        throw new Error('PERMISSION_DENIED: A aplicação precisa estar em HTTPS ou localhost para acessar câmera e microfone.');
                    }
                }

                // Verificar se getUserMedia está disponível
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('PERMISSION_DENIED: Seu navegador não suporta acesso à câmera e microfone. Tente usar Chrome, Firefox ou Edge.');
                }

                // Verificar permissões antes de solicitar (se a API estiver disponível)
                let audioPermissionGranted = false;
                let videoPermissionGranted = false;

                try {
                    if (navigator.permissions && navigator.permissions.query) {
                        console.log('🔍 [useAgora] Verificando status das permissões...');

                        try {
                            const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                            audioPermissionGranted = audioPermission.state === 'granted';
                            console.log(`🎤 [useAgora] Status da permissão de áudio: ${audioPermission.state}`);

                            if (audioPermission.state === 'prompt') {
                                console.log('⚠️ [useAgora] Permissão de áudio ainda não foi solicitada ou foi resetada');
                            }
                        } catch (e) {
                            console.warn('⚠️ [useAgora] Não foi possível verificar permissão de áudio:', e);
                        }

                        try {
                            const videoPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                            videoPermissionGranted = videoPermission.state === 'granted';
                            console.log(`📹 [useAgora] Status da permissão de vídeo: ${videoPermission.state}`);

                            if (videoPermission.state === 'prompt') {
                                console.log('⚠️ [useAgora] Permissão de vídeo ainda não foi solicitada ou foi resetada');
                            }
                        } catch (e) {
                            console.warn('⚠️ [useAgora] Não foi possível verificar permissão de vídeo:', e);
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ [useAgora] API de permissões não disponível, solicitando diretamente:', e);
                }

                // ✅ NOVO: Verificar permissões salvas no localStorage
                const PERMISSIONS_CACHE_KEY = 'agora_media_permissions_granted';
                const cachedPermissions = isBrowser ? localStorage.getItem(PERMISSIONS_CACHE_KEY) : null;
                const hasCachedPermissions = cachedPermissions === 'true';

                console.log('🔐 [useAgora] ===== VERIFICANDO PERMISSÕES SALVAS =====');
                console.log(`💾 Cache de permissões: ${hasCachedPermissions ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);

                // Solicitar permissões de mídia antes de criar os tracks
                // IMPORTANTE: Se já foram concedidas anteriormente (cache), não solicita novamente
                let audioStream: MediaStream | null = null;
                let videoStream: MediaStream | null = null;

                try {
                    console.log('🔐 [useAgora] ===== SOLICITANDO PERMISSÕES =====');
                    console.log(`🔐 [useAgora] Áudio já concedido (API): ${audioPermissionGranted}`);
                    console.log(`🔐 [useAgora] Vídeo já concedido (API): ${videoPermissionGranted}`);
                    console.log(`💾 [useAgora] Permissões no cache: ${hasCachedPermissions}`);

                    // Se tem cache OU ambas já foram concedidas, tenta acessar diretamente sem solicitar novamente
                    if (hasCachedPermissions || (audioPermissionGranted && videoPermissionGranted)) {
                        console.log('✅ [useAgora] Permissões já concedidas anteriormente, acessando dispositivos...');
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({
                                audio: true,
                                video: true
                            });
                            stream.getTracks().forEach(track => track.stop());
                            console.log('✅ [useAgora] Acesso aos dispositivos confirmado!');

                            // ✅ Salva no cache que as permissões foram concedidas
                            if (isBrowser) {
                                localStorage.setItem(PERMISSIONS_CACHE_KEY, 'true');
                                console.log('💾 [useAgora] Permissões salvas no cache');
                            }
                        } catch {
                            console.warn('⚠️ [useAgora] Permissão foi revogada, solicitando novamente...');
                            // Limpa cache se foi revogada
                            if (isBrowser) {
                                localStorage.removeItem(PERMISSIONS_CACHE_KEY);
                            }
                            audioPermissionGranted = false;
                            videoPermissionGranted = false;
                        }
                    }

                    // Se não foram concedidas ou foram revogadas, solicita
                    if (!audioPermissionGranted || !videoPermissionGranted) {
                        console.log('🔐 [useAgora] Solicitando permissões de câmera e microfone...');

                        // Tenta solicitar ambos de uma vez primeiro
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({
                                audio: true,
                                video: true
                            });
                            // Para os tracks do stream temporário para liberar recursos
                            stream.getTracks().forEach(track => track.stop());
                            console.log('✅ [useAgora] Permissões concedidas (áudio + vídeo)!');

                            // ✅ Salva no cache que as permissões foram concedidas
                            if (isBrowser) {
                                localStorage.setItem(PERMISSIONS_CACHE_KEY, 'true');
                                console.log('💾 [useAgora] Permissões salvas no cache');
                            }
                        } catch (combinedError) {
                            // Se falhar, tenta separadamente
                            console.log('⚠️ [useAgora] Falha ao solicitar ambos, tentando separadamente...');

                            try {
                                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                console.log('✅ [useAgora] Permissão de áudio concedida');
                            } catch (audioError) {
                                if (isMediaPermissionError(audioError)) {
                                    console.error('❌ [useAgora] Erro ao solicitar áudio:', {
                                        name: audioError.name,
                                        message: audioError.message
                                    });
                                } else {
                                    console.error('❌ [useAgora] Erro ao solicitar áudio:', audioError);
                                }
                            }

                            try {
                                videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                                console.log('✅ [useAgora] Permissão de vídeo concedida');
                            } catch (videoError) {
                                if (isMediaPermissionError(videoError)) {
                                    console.error('❌ [useAgora] Erro ao solicitar vídeo:', {
                                        name: videoError.name,
                                        message: videoError.message
                                    });
                                } else {
                                    console.error('❌ [useAgora] Erro ao solicitar vídeo:', videoError);
                                }
                            }

                            // Se ambos falharam, lança o erro original
                            if (!audioStream && !videoStream) {
                                // Limpa cache se falhou
                                if (isBrowser) {
                                    localStorage.removeItem(PERMISSIONS_CACHE_KEY);
                                }
                                throw combinedError;
                            }

                            // Para os tracks se foram criados
                            if (audioStream) {
                                audioStream.getTracks().forEach(track => track.stop());
                            }
                            if (videoStream) {
                                videoStream.getTracks().forEach(track => track.stop());
                            }

                            // Se pelo menos um funcionou, salva no cache
                            if (audioStream || videoStream) {
                                if (isBrowser) {
                                    localStorage.setItem(PERMISSIONS_CACHE_KEY, 'true');
                                    console.log('💾 [useAgora] Permissões parciais salvas no cache');
                                }
                            }
                        }
                    }

                    console.log('🔐 [useAgora] ====================================');
                } catch (permissionError) {
                    console.error('❌ [useAgora] ===== ERRO AO SOLICITAR PERMISSÕES =====');

                    // Limpa cache se houve erro
                    if (isBrowser) {
                        localStorage.removeItem(PERMISSIONS_CACHE_KEY);
                    }

                    if (isMediaPermissionError(permissionError)) {
                        console.error('❌ [useAgora] Nome do erro:', permissionError.name);
                        console.error('❌ [useAgora] Mensagem:', permissionError.message);

                        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
                            throw new Error('PERMISSION_DENIED: Permissão de câmera e/ou microfone negada. Por favor, permita o acesso nas configurações do navegador e recarregue a página.');
                        } else if (permissionError.name === 'NotFoundError') {
                            throw new Error('Dispositivos de câmera e/ou microfone não encontrados. Verifique se os dispositivos estão conectados.');
                        } else if (permissionError.name === 'NotReadableError') {
                            throw new Error('Erro ao acessar câmera e/ou microfone. Verifique se outro aplicativo está usando os dispositivos.');
                        } else if (permissionError.name === 'OverconstrainedError') {
                            throw new Error('As configurações de câmera/microfone solicitadas não estão disponíveis. Tente ajustar as configurações do dispositivo.');
                        } else {
                            throw new Error(`Erro ao solicitar permissões: ${permissionError.message}`);
                        }
                    } else {
                        const errorMessage = permissionError instanceof Error ? permissionError.message : 'Erro desconhecido';
                        console.error('❌ [useAgora] Erro desconhecido:', permissionError);
                        throw new Error(`Erro ao solicitar permissões: ${errorMessage}`);
                    }
                    console.error('❌ [useAgora] =========================================');
                }

                // Criar tracks após confirmar permissões
                let audioTrack: IMicrophoneAudioTrack;
                let videoTrack: ICameraVideoTrack;

                try {
                    console.log('🎤 [useAgora] ===== CRIANDO TRACKS =====');
                    console.log('🎤 [useAgora] Criando track de áudio...');

                    // Configura o microfone com deviceId preferido se disponível
                    interface MicrophoneConfig {
                        encoderConfig: typeof agoraConfig.audio.encoderConfig;
                        microphoneId?: string;
                    }
                    const microphoneConfig: MicrophoneConfig = {
                        encoderConfig: agoraConfig.audio.encoderConfig,
                    };
                    if (devicePreferences?.microphoneDeviceId) {
                        microphoneConfig.microphoneId = devicePreferences.microphoneDeviceId;
                        console.log('🎤 [useAgora] Usando microfone preferido:', devicePreferences.microphoneDeviceId);
                    }

                    audioTrack = await AgoraRTC.createMicrophoneAudioTrack(microphoneConfig);
                    // Garante que o áudio está habilitado por padrão
                    audioTrack.setEnabled(true);
                    console.log('✅ [useAgora] Track de áudio criado e habilitado');
                    console.log(`✅ [useAgora] Áudio habilitado: ${audioTrack.enabled}`);
                    console.log(`✅ [useAgora] Áudio muted: ${audioTrack.muted}`);

                    console.log('📹 [useAgora] Criando track de vídeo...');

                    // Configura a câmera com deviceId preferido se disponível
                    interface CameraConfig {
                        encoderConfig: typeof agoraConfig.video.encoderConfig;
                        optimizationMode: 'detail';
                        cameraId?: string;
                    }
                    const cameraConfig: CameraConfig = {
                        encoderConfig: agoraConfig.video.encoderConfig,
                        optimizationMode: 'detail',
                    };
                    if (devicePreferences?.cameraDeviceId) {
                        cameraConfig.cameraId = devicePreferences.cameraDeviceId;
                        console.log('📹 [useAgora] Usando câmera preferida:', devicePreferences.cameraDeviceId);
                    }

                    videoTrack = await AgoraRTC.createCameraVideoTrack(cameraConfig);
                    // Garante que o vídeo está habilitado por padrão
                    videoTrack.setEnabled(true);
                    console.log('✅ [useAgora] Track de vídeo criado e habilitado');
                    console.log(`✅ [useAgora] Vídeo habilitado: ${videoTrack.enabled}`);
                    console.log(`✅ [useAgora] Vídeo muted: ${videoTrack.muted}`);
                    console.log('🎤 [useAgora] ===========================');
                } catch (trackError) {
                    console.error('❌ [useAgora] ===== ERRO AO CRIAR TRACKS =====');

                    if (isMediaPermissionError(trackError)) {
                        console.error('❌ [useAgora] Nome do erro:', trackError.name);
                        console.error('❌ [useAgora] Mensagem:', trackError.message);
                        if (trackError.name === 'NotAllowedError' || trackError.name === 'PermissionDeniedError' || trackError.message.includes('PERMISSION_DENIED')) {
                            throw new Error('PERMISSION_DENIED: Permissão de câmera e/ou microfone negada. Por favor, permita o acesso nas configurações do navegador.');
                        }
                        throw new Error(`Erro ao criar tracks de mídia: ${trackError.message}`);
                    } else {
                        const errorMessage = trackError instanceof Error ? trackError.message : 'Erro desconhecido';
                        console.error('❌ [useAgora] Erro desconhecido:', trackError);
                        throw new Error(`Erro ao criar tracks de mídia: ${errorMessage}`);
                    }
                    console.error('❌ [useAgora] ===================================');
                }

                localAudioTrackRef.current = audioTrack;
                localVideoTrackRef.current = videoTrack;
                // Atualiza estados para forçar re-render no componente
                setLocalAudioTrackState(audioTrack);
                setLocalVideoTrackState(videoTrack);
                console.log('✅ [useAgora] Tracks locais armazenados nas refs e estados atualizados');

                // Container de vídeos remotos (o local é exibido via PiP no componente)
                const container = document.getElementById(videoContainerId);
                if (!container) {
                    console.warn('⚠️ Container não encontrado, mas prosseguindo com conexão');
                }

                // Garante que os tracks estão habilitados antes de publicar
                if (!audioTrack.enabled) {
                    console.log('🔧 [useAgora] Habilitando áudio antes de publicar...');
                    audioTrack.setEnabled(true);
                }
                if (!videoTrack.enabled) {
                    console.log('🔧 [useAgora] Habilitando vídeo antes de publicar...');
                    videoTrack.setEnabled(true);
                }

                // Publicar tracks (o vídeo local será tocado no PiP pelo componente SalaVideo)
                console.log('📤 Publicando tracks locais...');
                await client.publish([audioTrack, videoTrack]);
                console.log('✅ Tracks publicadas com sucesso!');

                // Garante novamente que estão habilitados após publicação
                if (!audioTrack.enabled) {
                    console.log('🔧 [useAgora] Re-habilitando áudio após publicação...');
                    audioTrack.setEnabled(true);
                }
                if (!videoTrack.enabled) {
                    console.log('🔧 [useAgora] Re-habilitando vídeo após publicação...');
                    videoTrack.setEnabled(true);
                }

                // Usuários remotos
                const handleUserPublished = async (
                    user: IAgoraRTCRemoteUser,
                    mediaType: 'audio' | 'video'
                ) => {
                    console.log(`🎯 [useAgora] user-published disparado - UID: ${user.uid}, tipo: ${mediaType}`);
                    await client.subscribe(user, mediaType);
                    console.log(`✅ [useAgora] Inscrito no usuário ${user.uid} para ${mediaType}`);

                    if (mediaType === 'video' && user.videoTrack) {
                        const container = document.getElementById(videoContainerId);
                        if (!container) {
                            console.warn('⚠️ Container não encontrado para vídeo remoto');
                            return;
                        }
                        const remoteDiv = document.createElement('div');
                        remoteDiv.id = `remote-video-${user.uid}`;
                        remoteDiv.className = 'video-container';
                        remoteDiv.style.cssText = `
                            position: relative; width: 100%; height: 100%; min-height: 300px;
                            background: #000; border-radius: 8px; overflow: hidden;
                            display: flex; align-items: center; justify-content: center;
                        `;
                        container.appendChild(remoteDiv);
                        user.videoTrack.play(remoteDiv, { fit: 'cover' });
                        remoteVideoTracksRef.current[user.uid] = user.videoTrack as IRemoteVideoTrack;
                        // Atualiza estado para reatividade
                        const newState = { ...remoteVideoTracksRef.current };
                        setRemoteVideoTracksState(newState);
                        console.log('👤 Vídeo remoto renderizado:', user.uid, 'Total remotos:', Object.keys(newState).length);
                    }
                    if (mediaType === 'audio' && user.audioTrack) {
                        // Reproduz o áudio
                        user.audioTrack.play();
                        console.log('🔊 Áudio remoto tocando:', user.uid);

                        // Configura para usar o alto-falante (dispositivo padrão)
                        // Em mobile, isso força o uso do alto-falante em vez do fone de ouvido
                        // O Agora SDK gerencia o elemento de áudio internamente, mas podemos tentar configurar
                        // através do MediaStreamTrack se disponível
                        try {
                            const mediaStream = user.audioTrack.getMediaStreamTrack();
                            if (mediaStream) {
                                // Tenta obter o dispositivo padrão de saída de áudio
                                navigator.mediaDevices.enumerateDevices().then(devices => {
                                    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                                    // Em mobile, o navegador geralmente usa o alto-falante por padrão
                                    // Mas podemos tentar forçar se necessário
                                    if (audioOutputs.length > 0) {
                                        // O Agora SDK gerencia o elemento de áudio, então não podemos
                                        // diretamente configurar setSinkId. O áudio já deve sair pelo alto-falante
                                        // por padrão em mobile quando não há fone conectado
                                        console.log('🔊 [useAgora] Dispositivos de áudio disponíveis:', audioOutputs.length);
                                    }
                                }).catch((err: unknown) => {
                                    console.warn('⚠️ [useAgora] Erro ao enumerar dispositivos de áudio:', err);
                                });
                            }
                        } catch (err) {
                            console.warn('⚠️ [useAgora] Não foi possível acessar MediaStreamTrack do áudio:', err);
                        }
                    }
                    onUserPublishedRef.current?.(user, mediaType);
                };

                const handleUserUnpublished = (user: IAgoraRTCRemoteUser) => {
                    console.log(`📴 [useAgora] user-unpublished disparado - UID: ${user.uid}`);
                    const el = document.getElementById(`remote-video-${user.uid}`);
                    if (el) el.remove();
                    delete remoteVideoTracksRef.current[user.uid];
                    // Atualiza estado para reatividade
                    const newState = { ...remoteVideoTracksRef.current };
                    setRemoteVideoTracksState(newState);
                    console.log('👋 Usuário remoto removido:', user.uid, 'Total remotos:', Object.keys(newState).length);
                    onUserUnpublishedRef.current?.(user);
                };

                client.on('user-published', handleUserPublished);
                client.on('user-unpublished', handleUserUnpublished);

                // Ao conectar, pode haver usuários já publicados antes da inscrição nos eventos
                try {
                    const existing = client.remoteUsers || [];
                    if (existing.length > 0) {
                        console.log('🔁 [useAgora] Processando usuários remotos já presentes...', existing.map(u => ({ uid: u.uid, hasVideo: u.hasVideo, hasAudio: u.hasAudio })));
                    }
                    for (const u of existing) {
                        if (u.hasVideo) {
                            await handleUserPublished(u, 'video');
                        }
                        if (u.hasAudio) {
                            await handleUserPublished(u, 'audio');
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ [useAgora] Falha ao processar usuários remotos existentes:', e);
                }

                // Link da sala
                if (isBrowser) {
                    const link = `${window.location.origin}/join?appId=${appId}&channel=${channelName}&token=${encodeURIComponent(token)}`;
                    setRoomLink(link);
                }

                console.log(`🎉 [useAgora] Conexão bem-sucedida! Canal: ${channelName}, UID: ${currentUid}`);
                setJoined(true);
                setIsConnecting(false);

                // Log periódico dos usuários remotos
                const intervalId = setInterval(() => {
                    if (client && !isCleanupRef.current) {
                        const remoteUsers = client.remoteUsers;
                        console.log(`📊 [useAgora] Usuários remotos no canal:`, {
                            total: remoteUsers.length,
                            uids: remoteUsers.map(u => u.uid),
                            hasVideo: remoteUsers.map(u => ({ uid: u.uid, hasVideo: u.hasVideo, hasAudio: u.hasAudio }))
                        });
                    }
                }, 3000); // A cada 3 segundos

                // Cleanup do interval
                return () => clearInterval(intervalId);
            } catch (err) {
                let errorMessage = 'Erro desconhecido';

                // Tratamento específico de erros do Agora
                if (isAgoraRTCError(err)) {
                    errorMessage = err.message || 'Erro desconhecido';
                    console.error(`❌ [useAgora] Erro do Agora - código: ${err.code}, mensagem: ${errorMessage}`);

                    // Erros comuns do Agora
                    const errorCode = String(err.code);
                    switch (errorCode) {
                        case 'DYNAMIC_KEY_TIMEOUT':
                            errorMessage = 'Token expirado. Por favor, recarregue a página.';
                            break;
                        case 'INVALID_TOKEN':
                            errorMessage = 'Token inválido. Por favor, recarregue a página.';
                            break;
                        case 'INVALID_APP_ID':
                            errorMessage = 'Configuração inválida do Agora. Contate o suporte.';
                            break;
                        case 'INVALID_CHANNEL_NAME':
                            errorMessage = 'Nome do canal inválido. Por favor, tente novamente.';
                            break;
                        case 'CONNECTION_LOST':
                        case 'CONNECTION_DISCONNECTED':
                            errorMessage = 'Conexão perdida. Tentando reconectar...';
                            // Tenta reconectar após 2 segundos
                            setTimeout(() => {
                                if (!isCleanupRef.current) {
                                    console.log('🔄 [useAgora] Tentando reconectar após erro de conexão...');
                                    joinRTC();
                                }
                            }, 2000);
                            break;
                        default:
                            // Mantém a mensagem original se não for um erro conhecido
                            break;
                    }
                } else if (isMediaPermissionError(err)) {
                    errorMessage = 'PERMISSION_DENIED: Permissão de câmera e/ou microfone negada. Por favor, permita o acesso nas configurações do navegador e recarregue a página.';
                } else if (isRTCConnectionError(err)) {
                    errorMessage = err.message || 'Erro desconhecido';
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                }

                // Verifica se é erro de permissão na mensagem
                if (errorMessage.includes('PERMISSION_DENIED') ||
                    errorMessage.includes('NotAllowedError') ||
                    errorMessage.includes('Permission denied')) {
                    errorMessage = 'PERMISSION_DENIED: Permissão de câmera e/ou microfone negada. Por favor, permita o acesso nas configurações do navegador e recarregue a página.';
                }

                // Verifica se está em contexto seguro (HTTPS ou localhost)
                if (isBrowser && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    console.warn('⚠️ Aplicação não está em contexto seguro (HTTPS). Alguns navegadores podem bloquear acesso a câmera/microfone.');
                }

                setError(`Falha no RTC: ${errorMessage}`);
                setIsConnecting(false);
                console.error('❌ [useAgora] Erro ao conectar:', err);
            } finally {
                isRTCJoiningRef.current = false;
            }
        }

        joinRTC();

        return () => {
            isCleanupRef.current = true;
            leaveRoom();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appId, channelName, token, uid, videoContainerId, devicePreferences?.cameraDeviceId, devicePreferences?.microphoneDeviceId]);

    // === Funções Públicas ===
    const sendMessage = async (text: string) => {
        if (!text || typeof text !== "string") return;
        setMessages(prev => [...prev, { text, from: effectiveUid }]);
        console.log('📤 Mensagem enviada (mock):', text);
    };

    // === Retorno do Hook ===
    return {
        joined,
        error,
        isConnecting,
        roomLink,
        messages,
        sendMessage,
        leaveRoom,
        localAudioTrack: localAudioTrackState,
        localVideoTrack: localVideoTrackState,
        remoteVideoTracks: remoteVideoTracksState,
        remoteVideoTrack: Object.values(remoteVideoTracksState)[0] || null,
    };
}

// Nenhuma alteração de código necessária. Habilite o serviço RTM no painel da Agora.