import { useConsultasFuturas } from '@/hooks/consulta';
import type { ConsultaApi } from '@/types/consultasTypes';
import React from 'react';

export default function ProximaConsultaPaciente() {
  const { consultasFuturas, isLoading, isError } = useConsultasFuturas();
  
  // Usa nextReservation diretamente, que já é a próxima consulta completa
  const nextConsulta: ConsultaApi | null = consultasFuturas?.nextReservation || null;

  if (isLoading) return <div>Carregando próxima consulta...</div>;
  if (isError) return <div>Erro ao carregar próxima consulta.</div>;

  if (!nextConsulta) {
    return <div className="text-gray-500 fira-sans">Você não possui nenhuma consulta futura agendada.</div>;
  }

  const data = nextConsulta.Date || nextConsulta.Agenda?.Data || '';
  const horario = nextConsulta.Time || nextConsulta.Agenda?.Horario || '';
  const psicologoNome = nextConsulta.Psicologo?.Nome || '';

  return (
    <section className="bg-white p-4 rounded-lg mt-8">
      <h3 className="font-bold text-[#232A5C] text-lg mb-5">Sua próxima consulta</h3>
      <div className="flex flex-col gap-2">
        <span><b>Data:</b> {data}</span>
        <span><b>Horário:</b> {horario}</span>
        {psicologoNome && <span><b>Psicólogo:</b> {psicologoNome}</span>}
      </div>
    </section>
  );
}
