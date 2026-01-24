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
    } catch {
      setConsulta(null);
    }
  }, [role, setConsulta]);

  return { consulta, fetchConsulta };
}

export { useConsultaEmAndamento };
export default useConsultaEmAndamento;
