import { useMemo } from 'react';
import { ConsultaApi } from '@/types/consultasTypes';
import { selecionarProximaConsulta, ProximaConsultaResult } from './selecionar-proxima-consulta';

/**
 * Hook que retorna a próxima consulta e seu ID
 */
export function useProximaConsulta(consultas: ConsultaApi[] | null | undefined): {
  proximaConsulta: ConsultaApi | null;
  proximaConsultaId: string | null;
  isHoje: boolean;
  isAmanha: boolean;
} {
  const result: ProximaConsultaResult = useMemo(() => {
    if (!consultas || consultas.length === 0) {
      return { proximaConsulta: null, isHoje: false, isAmanha: false };
    }
    return selecionarProximaConsulta(consultas);
  }, [consultas]);

  return {
    proximaConsulta: result.proximaConsulta,
    proximaConsultaId: result.proximaConsulta?.Id || null,
    isHoje: result.isHoje,
    isAmanha: result.isAmanha,
  };
}

