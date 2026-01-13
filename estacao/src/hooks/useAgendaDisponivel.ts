import { useMemo } from 'react';

export type AgendaItem = {
  Data: string;
  Horario: string;
  Status: string;
};

export function useAgendaDisponivel(agendas: AgendaItem[] = []) {
  // Agrupa horários disponíveis por data (YYYY-MM-DD)
  return useMemo(() => {
    const horariosPorData: Record<string, string[]> = {};
    agendas.forEach((agenda) => {
      if (agenda.Status === 'Disponivel') {
        const dataKey = new Date(agenda.Data).toISOString().slice(0, 10);
        if (!horariosPorData[dataKey]) horariosPorData[dataKey] = [];
        horariosPorData[dataKey].push(agenda.Horario);
      }
    });
    return horariosPorData;
  }, [agendas]);
}
