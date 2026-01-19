import { useCallback } from 'react';
import { consultaEmAndamentoService } from '@/services/consultaEmAndamentoService';
import { useConsultaEmAndamentoStore } from '@/store/consultaEmAndamentoStore';

export function useConsultaEmAndamento(role: 'psicologo' | 'paciente') {
  // Sempre retorna null se não houver consulta válida
  const consulta = useConsultaEmAndamentoStore((s) => {
    const c = s.consulta;
    if (!c || !c.Id || !c.Status || !c.Date || !c.Time) return null;
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
      // Só seta se for um objeto válido
      if (c && c.Id && c.Status && c.Date && c.Time) {
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
