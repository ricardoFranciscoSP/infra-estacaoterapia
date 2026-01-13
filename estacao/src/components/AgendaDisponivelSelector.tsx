import React, { useState } from 'react';
import { useAgendaDisponivel, AgendaItem } from '@/hooks/useAgendaDisponivel';

interface AgendaDisponivelSelectorProps {
  agendas: AgendaItem[];
  onSelect: (data: Date, horario: string) => void;
}

export const AgendaDisponivelSelector: React.FC<AgendaDisponivelSelectorProps> = ({ agendas, onSelect }) => {
  const horariosPorData = useAgendaDisponivel(agendas);
  const datasDisponiveis = Object.keys(horariosPorData);
  const [dataSelecionada, setDataSelecionada] = useState<string>(datasDisponiveis[0] || '');
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block mb-1 font-medium">Selecione a data:</label>
        <select
          value={dataSelecionada}
          onChange={e => {
            setDataSelecionada(e.target.value);
            setHorarioSelecionado('');
          }}
          className="border rounded px-2 py-1 w-full"
        >
          {datasDisponiveis.map(data => (
            <option key={data} value={data}>{new Date(data).toLocaleDateString('pt-BR')}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Selecione o horário:</label>
        <select
          value={horarioSelecionado}
          onChange={e => setHorarioSelecionado(e.target.value)}
          className="border rounded px-2 py-1 w-full"
          disabled={!dataSelecionada}
        >
          <option value="" disabled>Selecione um horário</option>
          {(horariosPorData[dataSelecionada] || []).map(horario => (
            <option key={horario} value={horario}>{horario}</option>
          ))}
        </select>
      </div>
      <button
        className="bg-[#8494E9] text-white rounded px-4 py-2 font-semibold mt-2"
        disabled={!dataSelecionada || !horarioSelecionado}
        onClick={() => {
          if (dataSelecionada && horarioSelecionado) {
            onSelect(new Date(dataSelecionada), horarioSelecionado);
          }
        }}
      >
        Confirmar
      </button>
    </div>
  );
};
