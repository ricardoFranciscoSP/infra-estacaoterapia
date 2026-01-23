import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Calcula o tempo restante dos 60 minutos a partir do ScheduledAt
 * @param scheduledAt - Data/hora do início da consulta no formato 'YYYY-MM-DD HH:mm:ss'
 * @param date - Data da consulta (fallback)
 * @param time - Horário da consulta (fallback)
 * @returns Objeto com tempo restante em segundos e string formatada
 */
export function calcularTempoRestante60Minutos(
  scheduledAt?: string | null,
  date?: string | null,
  time?: string | null
): { segundosRestantes: number; tempoFormatado: string; estaDentroDoPeriodo: boolean } {
  try {
    let inicioConsulta: number | null = null;
    
    // Prioriza ScheduledAt
    if (scheduledAt) {
      try {
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
      } catch (error) {
        console.error('[calcularTempoRestante60Minutos] Erro ao parsear ScheduledAt:', error);
      }
    }
    
    // Fallback: usa date/time se ScheduledAt não estiver disponível
    if (!inicioConsulta && date && time) {
      const dateOnly = date.split('T')[0].split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [hh, mm] = time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
    }
    
    if (!inicioConsulta) {
      return { segundosRestantes: 0, tempoFormatado: '', estaDentroDoPeriodo: false };
    }
    
    const agoraBr = dayjs().tz('America/Sao_Paulo');
    const agoraTimestamp = agoraBr.valueOf();
    const fimConsulta = inicioConsulta + (60 * 60 * 1000); // 60 minutos
    
    // Verifica se está dentro do período de 60 minutos
    const estaDentroDoPeriodo = agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta;
    
    if (!estaDentroDoPeriodo) {
      return { segundosRestantes: 0, tempoFormatado: '', estaDentroDoPeriodo: false };
    }
    
    // Calcula tempo decorrido desde o início (em segundos)
    const segundosDecorridos = Math.floor((agoraTimestamp - inicioConsulta) / 1000);
    
    // Calcula tempo restante até 60 minutos (em segundos)
    const segundosRestantes = (60 * 60) - segundosDecorridos;
    
    // Formata o tempo decorrido (não o restante) para exibir
    const minutosDecorridos = Math.floor(segundosDecorridos / 60);
    const segundosRestantesDoMinuto = segundosDecorridos % 60;
    const tempoFormatado = `${String(minutosDecorridos).padStart(2, '0')}:${String(segundosRestantesDoMinuto).padStart(2, '0')}`;
    
    return {
      segundosRestantes,
      tempoFormatado,
      estaDentroDoPeriodo: true,
    };
  } catch (error) {
    console.error('[calcularTempoRestante60Minutos] Erro ao calcular tempo:', error);
    return { segundosRestantes: 0, tempoFormatado: '', estaDentroDoPeriodo: false };
  }
}

/**
 * Verifica se a consulta está dentro dos 60 minutos usando ScheduledAt
 */
export function isConsultaDentro60MinutosComScheduledAt(
  scheduledAt?: string | null,
  date?: string | null,
  time?: string | null
): boolean {
  const { estaDentroDoPeriodo } = calcularTempoRestante60Minutos(scheduledAt, date, time);
  return estaDentroDoPeriodo;
}

export function isStatusFinalizadoOuCancelado(status?: string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("cancel") ||
    normalized.includes("conclu") ||
    normalized.includes("realiz") ||
    normalized.includes("finaliz") ||
    normalized.includes("encerr") ||
    normalized.includes("nao compareceu") ||
    normalized.includes("naocompareceu") ||
    normalized.includes("ausent") ||
    normalized.includes("deferid")
  );
}

export function shouldEnableEntrarConsulta(params: {
  scheduledAt?: string | null;
  date?: string | null;
  time?: string | null;
  status?: string | null;
}): boolean {
  const { scheduledAt, date, time, status } = params;
  if (isStatusFinalizadoOuCancelado(status)) return false;
  return isConsultaDentro60MinutosComScheduledAt(scheduledAt, date, time);
}

