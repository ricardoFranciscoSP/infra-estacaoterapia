import React from 'react';
import dayjs from 'dayjs';
import Image from 'next/image';



import type { ConsultaApi } from "@/types/consultasTypes";

type PacienteType = { nome?: string };
type PsicologoType = { nome?: string };

interface ConsultaEmAndamentoProps {
  consulta: ConsultaApi;
  onEntrar?: () => void;
  role: 'psicologo' | 'paciente';
}

export const ConsultaEmAndamento: React.FC<ConsultaEmAndamentoProps> = ({ consulta, onEntrar, role }) => {
  if (!consulta) return null;

  // Fallback para diferentes formatos de dados
  const pacienteNome = consulta.Paciente?.Nome
    || (typeof (consulta as { paciente?: PacienteType }).paciente === 'object' ? (consulta as { paciente?: PacienteType }).paciente?.nome : undefined)
    || 'Paciente';
  const psicologoNome = consulta.Psicologo?.Nome
    || (typeof (consulta as { psicologo?: PsicologoType }).psicologo === 'object' ? (consulta as { psicologo?: PsicologoType }).psicologo?.nome : undefined)
    || 'Psicólogo';
  const nome = role === 'psicologo' ? pacienteNome : psicologoNome;
  const avatarUrl = role === 'psicologo'
    ? consulta.Paciente?.Images?.[0]?.Url || '/icons/avatar-paciente.svg'
    : consulta.Psicologo?.Images?.[0]?.Url || '/icons/avatar-psicologo.svg';
  const data = consulta.Date || consulta.Agenda?.Data;
  const hora = consulta.Time || consulta.Agenda?.Horario;
  let inicio: dayjs.Dayjs | null = null;
  let fim: dayjs.Dayjs | null = null;
  if (data && hora) {
    const tentativa = dayjs(`${data}T${hora}`);
    if (tentativa.isValid()) {
      inicio = tentativa;
      fim = inicio.add(1, 'hour');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-4 border-l-4 border-[#6D75C0] relative">
      <span className="absolute top-4 right-4 bg-[#F3F4F6] text-[#6D75C0] px-3 py-1 rounded-full text-xs font-bold">Em Andamento</span>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-3">
          <Image src={avatarUrl} alt="Avatar" width={48} height={48} className="rounded-full" />
          <div>
            <span className="block text-sm text-gray-500 mb-1">{role === 'psicologo' ? 'Paciente' : 'Psicólogo'}</span>
            <span className="block text-lg font-semibold text-gray-800">{nome}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500">Horário</span>
          <span className="text-base font-medium text-gray-700">{inicio && fim ? `${inicio.format('HH:mm')} - ${fim.format('HH:mm')}` : '--:--'}</span>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-2">
        <span className="text-xs text-gray-500">Início: {inicio ? inicio.format('DD/MM/YYYY HH:mm') : '--/--/---- --:--'}</span>
        <button
          className="bg-[#6D75C0] hover:bg-[#575fa8] text-white px-5 py-2 rounded font-semibold text-sm shadow transition"
          onClick={onEntrar}
        >
          Entrar na consulta
        </button>
      </div>
    </div>
  );
};
