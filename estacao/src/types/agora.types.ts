// src/types/agora.types.ts
// Tipos específicos para Agora.io - sem uso de 'any'

import type {
    IAgoraRTCError,
    IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

/**
 * Tipo para erros de permissão de mídia
 */
export interface MediaPermissionError {
    name: 'NotAllowedError' | 'PermissionDeniedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'AbortError' | 'TypeError';
    message: string;
}

/**
 * Tipo para erros genéricos de criação de tracks
 */
export interface TrackCreationError {
    name?: string;
    message: string;
    code?: string;
}

/**
 * Tipo para erros de conexão RTC
 */
export interface RTCConnectionError {
    code?: string;
    message: string;
    name?: string;
    reason?: string;
}

/**
 * Tipo para eventos de usuário remoto publicado
 */
export interface UserPublishedEvent {
    user: IAgoraRTCRemoteUser;
    mediaType: 'audio' | 'video';
}

/**
 * Tipo para eventos de usuário remoto despublicado
 */
export interface UserUnpublishedEvent {
    user: IAgoraRTCRemoteUser;
    mediaType?: 'audio' | 'video';
}

/**
 * Tipo para callbacks de usuário publicado
 */
export type UserPublishedCallback = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;

/**
 * Tipo para callbacks de usuário despublicado
 */
export type UserUnpublishedCallback = (user: IAgoraRTCRemoteUser) => void;

/**
 * Tipo para opções de play de vídeo
 */
export interface VideoPlayOptions {
    fit?: 'contain' | 'cover' | 'fill';
    mirror?: boolean;
    muted?: boolean;
}

/**
 * Tipo para configurações de encoder de áudio
 */
export interface AudioEncoderConfig {
    sampleRate: number;
    stereo: boolean;
    bitrate: number;
}

/**
 * Tipo para configurações de encoder de vídeo
 */
export interface VideoEncoderConfig {
    width: number;
    height: number;
    frameRate: number;
    bitrateMin: number;
    bitrateMax: number;
}

/**
 * Tipo para configurações do cliente Agora
 */
export interface AgoraClientConfig {
    mode: 'rtc' | 'live';
    codec: 'vp8' | 'vp9' | 'h264';
}

/**
 * Tipo para estado de conexão RTC
 */
export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTING';

/**
 * Tipo para estado de mídia (habilitado/desabilitado)
 */
export type MediaState = 'enabled' | 'disabled';

/**
 * Helper type guard para verificar se é erro de permissão
 */
export function isMediaPermissionError(error: unknown): error is MediaPermissionError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        typeof (error as MediaPermissionError).name === 'string' &&
        'message' in error &&
        typeof (error as MediaPermissionError).message === 'string'
    );
}

/**
 * Helper type guard para verificar se é erro do Agora RTC
 */
export function isAgoraRTCError(error: unknown): error is IAgoraRTCError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error
    );
}

/**
 * Helper type guard para verificar se é erro de conexão RTC
 */
export function isRTCConnectionError(error: unknown): error is RTCConnectionError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as RTCConnectionError).message === 'string'
    );
}

