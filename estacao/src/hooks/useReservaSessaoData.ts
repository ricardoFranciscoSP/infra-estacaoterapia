/**
 * Hook centralizado para acessar dados da ReservaSessao
 * 
 * Este hook normaliza o acesso a ReservaSessao de diferentes fontes:
 * - De dados normalizados (normalized.raw?.ReservaSessao)
 * - Do hook useReservaSessao
 * - De objetos diretos
 * 
 * IMPORTANTE: ScheduledAt é sempre a fonte da verdade para contadores e horários
 * 
 * @example
 * ```tsx
 * const { scheduledAt, status, reservaSessao } = useReservaSessaoData({
 *   normalized,
 *   consultationId: normalized?.id
 * });
 * ```
 */

import { useMemo } from 'react';
import { useReservaSessao } from './reservaSessao';

export interface UseReservaSessaoDataOptions {
  /**
   * Dados normalizados que podem conter ReservaSessao em raw
   */
  normalized?: {
    raw?: {
      ReservaSessao?: unknown;
    };
  } | null;
  
  /**
   * ID da consulta para buscar ReservaSessao via hook
   */
  consultationId?: string | null;
  
  /**
   * ReservaSessao já carregada (opcional, para evitar busca duplicada)
   */
  reservaSessaoDirect?: unknown;
}

export interface ReservaSessaoData {
  /**
   * ScheduledAt da ReservaSessao (fonte da verdade para horários)
   * Formato: 'YYYY-MM-DD HH:mm:ss'
   */
  scheduledAt: string | null;
  
  /**
   * Status da ReservaSessao
   */
  status: string | null;
  
  /**
   * Objeto ReservaSessao completo (typed)
   */
  reservaSessao: ReservaSessaoPartial | null;
  
  /**
   * Indica se os dados estão carregando
   */
  isLoading: boolean;
  
  /**
   * Indica se houve erro ao carregar
   */
  isError: boolean;
}

/**
 * Tipo para ReservaSessao parcial (apenas campos que precisamos)
 */
export interface ReservaSessaoPartial {
  ScheduledAt?: string | null;
  Status?: string | null;
  PatientJoinedAt?: string | Date | null;
  PsychologistJoinedAt?: string | Date | null;
  AgoraChannel?: string | null;
  AgoraTokenPatient?: string | null;
  AgoraTokenPsychologist?: string | null;
  ConsultaDate?: string | null;
  ConsultaTime?: string | null;
  PatientId?: string | null;
  PsychologistId?: string | null;
  [key: string]: unknown;
}

/**
 * Type guard para verificar se um objeto é uma ReservaSessao válida
 */
function isReservaSessaoObject(obj: unknown): obj is ReservaSessaoPartial {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj)
  );
}

/**
 * Normaliza e extrai dados da ReservaSessao de diferentes fontes
 * Sem usar `any` - usa type guards e type assertions seguras
 */
function extractReservaSessao(source: unknown): ReservaSessaoPartial | null {
  if (!source) return null;
  
  // Se já é um objeto válido
  if (isReservaSessaoObject(source)) {
    return source;
  }
  
  return null;
}

/**
 * Hook centralizado para acessar dados da ReservaSessao
 * 
 * Prioriza dados na seguinte ordem:
 * 1. reservaSessaoDirect (se fornecido)
 * 2. normalized.raw?.ReservaSessao (se disponível)
 * 3. useReservaSessao hook (se consultationId fornecido)
 */
export function useReservaSessaoData(options: UseReservaSessaoDataOptions = {}): ReservaSessaoData {
  const { normalized, consultationId, reservaSessaoDirect } = options;
  
  // Busca via hook se consultationId foi fornecido e não temos dados diretos
  const shouldFetch = !!consultationId && !reservaSessaoDirect && !normalized?.raw?.ReservaSessao;
  const { reservaSessao: reservaSessaoFromHook, isLoading, isError } = useReservaSessao(
    shouldFetch ? consultationId : undefined
  );
  
  // Determina a fonte de dados (prioridade: direct > normalized > hook)
  const reservaSessaoSource = useMemo(() => {
    if (reservaSessaoDirect) {
      return extractReservaSessao(reservaSessaoDirect);
    }
    
    if (normalized?.raw?.ReservaSessao) {
      return extractReservaSessao(normalized.raw.ReservaSessao);
    }
    
    if (reservaSessaoFromHook) {
      return extractReservaSessao(reservaSessaoFromHook);
    }
    
    return null;
  }, [reservaSessaoDirect, normalized?.raw?.ReservaSessao, reservaSessaoFromHook]);
  
  // Extrai campos comuns de forma normalizada
  const scheduledAt = reservaSessaoSource?.ScheduledAt ?? null;
  const status = reservaSessaoSource?.Status ?? null;
  
  return useMemo(() => ({
    scheduledAt: scheduledAt ? String(scheduledAt) : null,
    status: status ? String(status) : null,
    reservaSessao: reservaSessaoSource,
    isLoading: shouldFetch ? isLoading : false,
    isError: shouldFetch ? isError : false,
  }), [scheduledAt, status, reservaSessaoSource, shouldFetch, isLoading, isError]);
}

/**
 * Helper para extrair ScheduledAt de forma rápida
 * Útil quando você só precisa do ScheduledAt sem carregar outros dados
 */
export function useScheduledAt(options: UseReservaSessaoDataOptions = {}): string | null {
  const { scheduledAt } = useReservaSessaoData(options);
  return scheduledAt;
}

/**
 * Helper para verificar se ReservaSessao tem dados válidos
 */
export function useHasReservaSessao(options: UseReservaSessaoDataOptions = {}): boolean {
  const { reservaSessao } = useReservaSessaoData(options);
  return reservaSessao !== null;
}

