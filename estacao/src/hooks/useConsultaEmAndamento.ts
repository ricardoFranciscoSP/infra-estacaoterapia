"use client";

import { useCallback } from 'react';
import { consultaEmAndamentoService } from '@/services/consultaEmAndamentoService';
import { useConsultaEmAndamentoStore } from '@/store/consultaEmAndamentoStore';
import type { ConsultaApi } from '@/types/consultasTypes';

export type UseConsultaEmAndamentoRole = 'psicologo' | 'paciente';

export interface UseConsultaEmAndamentoReturn {
  consulta: ConsultaApi | null;
  fetchConsulta: () => Promise<void>;
}

function isConsultaValida(c: unknown): c is ConsultaApi {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.Id === 'string' &&
    typeof o.Status === 'string' &&
    typeof o.Date === 'string' &&
    typeof o.Time === 'string'
  );
}

function useConsultaEmAndamento(role: UseConsultaEmAndamentoRole): UseConsultaEmAndamentoReturn {
  const consulta = useConsultaEmAndamentoStore((s) => {
    const c = s.consulta;
    if (!isConsultaValida(c)) return null;
    return c;
  });
  const setConsulta = useConsultaEmAndamentoStore((s) => s.setConsulta);

  const fetchConsulta = useCallback(async () => {
    try {
      const response =
        role === 'psicologo'
          ? await consultaEmAndamentoService.getPsicologo()
          : await consultaEmAndamentoService.getPaciente();
      const c = response.data?.consulta;
      if (isConsultaValida(c)) {
        setConsulta(c);
      } else {
        setConsulta(null);
      }
    } catch (error) {
      // Log apenas em desenvolvimento para não poluir o console em produção
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        type ErrorWithResponse = { response?: { status?: number } };
        const statusCode = (error as ErrorWithResponse)?.response?.status;
        // Não loga 404 ou quando não há consulta em andamento (é esperado)
        if (statusCode !== 404 && statusCode !== 200) {
          console.warn(`[useConsultaEmAndamento] Erro ao buscar consulta em andamento (${role}):`, {
            message: errorMessage,
            status: statusCode,
            url: role === 'psicologo' ? '/psicologo/consultas/em-andamento' : '/consultas-paciente/em-andamento'
          });
        }
      }
      setConsulta(null);
    }
  }, [role, setConsulta]);

  return { consulta, fetchConsulta };
}

export { useConsultaEmAndamento };
export default useConsultaEmAndamento;
