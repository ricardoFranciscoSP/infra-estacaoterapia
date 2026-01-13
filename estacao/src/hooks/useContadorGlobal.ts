/**
 * Hook centralizado para gerenciar contadores de tempo
 * Reduz uso de CPU ao usar um único intervalo compartilhado para todos os componentes
 * 
 * Baseado nas melhores práticas do Next.js para otimização de performance
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface ContadorGlobalState {
  tick: number;
  timestamp: number;
}

// Estado global compartilhado (fora do componente para evitar recriações)
let globalTick = 0;
let globalTimestamp = Date.now();
let intervalId: NodeJS.Timeout | null = null;
const subscribers = new Set<() => void>();

/**
 * Função que notifica todos os subscribers sobre uma atualização
 */
function notifySubscribers() {
  globalTick += 1;
  globalTimestamp = Date.now();
  subscribers.forEach(callback => callback());
}

/**
 * Inicia o intervalo global se ainda não estiver rodando
 */
function startGlobalInterval() {
  if (intervalId === null) {
    // Usa 1000ms (1 segundo) para contadores de tempo
    intervalId = setInterval(notifySubscribers, 1000);
  }
}

/**
 * Para o intervalo global se não houver mais subscribers
 */
function stopGlobalInterval() {
  if (subscribers.size === 0 && intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Hook para acessar o contador global compartilhado
 * 
 * @returns Objeto com tick (contador) e timestamp (timestamp atual)
 * 
 * @example
 * ```tsx
 * const { tick, timestamp } = useContadorGlobal();
 * 
 * // Use tick para forçar recálculos quando necessário
 * const tempoFormatado = useMemo(() => {
 *   // Cálculo baseado em timestamp
 *   return formatarTempo(timestamp);
 * }, [timestamp]);
 * ```
 */
export function useContadorGlobal() {
  const [state, setState] = useState<ContadorGlobalState>(() => ({
    tick: globalTick,
    timestamp: globalTimestamp,
  }));

  const updateState = useCallback(() => {
    setState({
      tick: globalTick,
      timestamp: globalTimestamp,
    });
  }, []);

  useEffect(() => {
    // Registra este componente como subscriber
    subscribers.add(updateState);
    
    // Inicia o intervalo global se necessário
    startGlobalInterval();

    // Atualiza o estado inicial
    updateState();

    // Cleanup: remove o subscriber e para o intervalo se necessário
    return () => {
      subscribers.delete(updateState);
      stopGlobalInterval();
    };
  }, [updateState]);

  return state;
}

/**
 * Hook otimizado para contadores de tempo que só atualiza quando necessário
 * 
 * @param shouldUpdate - Função que determina se o contador deve continuar atualizando
 * @param calculateValue - Função que calcula o valor do contador baseado no timestamp
 * 
 * @returns Valor calculado do contador
 * 
 * @example
 * ```tsx
 * const tempoFormatado = useContadorTempo(
 *   () => estaDentroDoPeriodo,
 *   (timestamp) => calcularTempoRestante(inicioConsulta, timestamp)
 * );
 * ```
 */
export function useContadorTempo<T>(
  shouldUpdate: () => boolean,
  calculateValue: (timestamp: number) => T
): T {
  const { timestamp } = useContadorGlobal();
  const [value, setValue] = useState<T>(() => calculateValue(timestamp));
  const shouldUpdateRef = useRef(shouldUpdate);
  const calculateValueRef = useRef(calculateValue);

  // Atualiza as refs quando as funções mudam
  useEffect(() => {
    shouldUpdateRef.current = shouldUpdate;
    calculateValueRef.current = calculateValue;
  }, [shouldUpdate, calculateValue]);

  useEffect(() => {
    // Só atualiza se shouldUpdate retornar true
    if (shouldUpdateRef.current()) {
      setValue(calculateValueRef.current(timestamp));
    }
  }, [timestamp]);

  return value;
}

