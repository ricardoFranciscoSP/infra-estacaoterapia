import { useCallback } from 'react';
import { consultaEmAndamentoService } from '@/services/consultaEmAndamentoService';
import { useConsultaEmAndamentoStore } from '@/store/consultaEmAndamentoStore';

export function useConsultaEmAndamento(role: 'psicologo' | 'paciente') {
  const consulta = useConsultaEmAndamentoStore((s) => s.consulta);
  const setConsulta = useConsultaEmAndamentoStore((s) => s.setConsulta);

  const fetchConsulta = useCallback(async () => {
    try {
      const response =
        role === 'psicologo'
          ? await consultaEmAndamentoService.getPsicologo()
          : await consultaEmAndamentoService.getPaciente();
      setConsulta(response.data.consulta || null);
    } catch {
      setConsulta(null);
    }
  }, [role, setConsulta]);

  return { consulta, fetchConsulta };
}
