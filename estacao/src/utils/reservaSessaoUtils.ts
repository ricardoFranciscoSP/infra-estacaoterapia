/**
 * Utilitários para trabalhar com ReservaSessao
 * Funções helper para extrair dados de forma type-safe sem usar `any`
 */

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { ReservaSessaoPartial } from '@/hooks/useReservaSessaoData';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Type guard para verificar se um objeto tem estrutura de ReservaSessao
 */
export function isReservaSessaoLike(obj: unknown): obj is ReservaSessaoPartial {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj)
  );
}

/**
 * Extrai ScheduledAt de um objeto normalizado de forma type-safe
 * @param normalized - Objeto normalizado que pode conter ReservaSessao
 * @returns ScheduledAt ou null
 */
export function extractScheduledAtFromNormalized(
  normalized?: {
    raw?: {
      ReservaSessao?: unknown;
    };
  } | null
): string | null {
  if (!normalized?.raw?.ReservaSessao) return null;
  
  const reservaSessao = normalized.raw.ReservaSessao;
  
  if (isReservaSessaoLike(reservaSessao) && reservaSessao.ScheduledAt) {
    return String(reservaSessao.ScheduledAt);
  }
  
  return null;
}

/**
 * Extrai ScheduledAt de um objeto ReservaSessao direto
 * @param reservaSessao - Objeto ReservaSessao
 * @returns ScheduledAt ou null
 */
export function extractScheduledAt(reservaSessao: unknown): string | null {
  if (!reservaSessao) return null;
  
  if (isReservaSessaoLike(reservaSessao) && reservaSessao.ScheduledAt) {
    return String(reservaSessao.ScheduledAt);
  }
  
  return null;
}

/**
 * Converte ScheduledAt para timestamp (milliseconds)
 * @param scheduledAt - String no formato 'YYYY-MM-DD HH:mm:ss'
 * @returns Timestamp em milliseconds ou null se inválido
 */
export function scheduledAtToTimestamp(scheduledAt: string | null): number | null {
  if (!scheduledAt) return null;
  
  try {
    const [datePart, timePart] = scheduledAt.split(' ');
    if (!datePart || !timePart) return null;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);
    
    const inicioConsultaDate = dayjs.tz(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
      'America/Sao_Paulo'
    );
    
    return inicioConsultaDate.valueOf();
  } catch (error) {
    console.error('[scheduledAtToTimestamp] Erro ao parsear ScheduledAt:', error);
    return null;
  }
}

/**
 * Extrai Status de um objeto normalizado de forma type-safe
 * @param normalized - Objeto normalizado que pode conter ReservaSessao
 * @returns Status ou null
 */
export function extractStatusFromNormalized(
  normalized?: {
    raw?: {
      ReservaSessao?: unknown;
    };
  } | null
): string | null {
  if (!normalized?.raw?.ReservaSessao) return null;
  
  const reservaSessao = normalized.raw.ReservaSessao;
  
  if (isReservaSessaoLike(reservaSessao) && reservaSessao.Status) {
    return String(reservaSessao.Status);
  }
  
  return null;
}

