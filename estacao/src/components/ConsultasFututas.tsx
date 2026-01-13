'use client';
import { formatDateBR } from "@/utils/formatarDataHora";
import React, { useEffect, useState } from "react";
import { useConsultasFuturas } from "@/hooks/consulta";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatarUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export type Consulta = {
  Id: string | number;
  Agenda?: { Data?: string; Horario?: string };
  Date?: string;
  Time?: string;
  Status?: string;
  Psicologo?: {
    Id?: string | number;
    Nome?: string;
    Images?: { Url?: string }[];
  };
  ReservaSessao?: {
    Status?: string;
    AgoraChannel?: string | null;
    VideoCallLink?: string | null;
  };
};

function ConsultaCard({ consulta }: { consulta: Consulta }) {
  const data = formatDateBR(consulta.Agenda?.Data || consulta.Date || "");
  const horario = consulta.Agenda?.Horario || consulta.Time;
  const nomePsicologo = consulta.Psicologo?.Nome || "Psicólogo";
  const fotoPsicologo = getAvatarUrl(consulta.Psicologo?.Images?.[0]);
  const psicologoId = consulta.Psicologo?.Id;

  // Obtém o status da consulta
  const status = consulta?.ReservaSessao?.Status || consulta?.Status || 'Reservado';
  
  // Usa função centralizada para obter informações do status
  const tagInfo = getStatusTagInfo(status);

  return (
    <Card
      className="w-full min-h-[104px] sm:w-[588px] sm:h-[132px] flex flex-col bg-[#F2F4FD] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04),0px_2px_1px_-1px_rgba(0,0,0,0.08),0px_1px_3px_0px_rgba(0,0,0,0.08)] rounded-lg mb-4 relative border-0"
    >
      <CardContent className="p-2 sm:p-4 sm:h-full sm:flex sm:flex-col sm:justify-between">
      {/* Tag de status no canto superior direito */}
      <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
        {tagInfo.texto}
      </span>
      <div className="flex flex-row items-start gap-4 w-full pr-20 sm:pr-0">
        <Image
          src={fotoPsicologo}
          alt={nomePsicologo}
          className="w-[56px] h-[56px] sm:w-12 sm:h-12 rounded-full object-cover"
        />
        <div className="flex flex-col flex-1 min-w-0">
          <div className="font-semibold text-gray-800 fira-sans text-base truncate">{nomePsicologo}</div>
          <div className="text-gray-500 text-sm fira-sans mt-1">{`${data} às ${horario}`}</div>
        </div>
        <div className="flex flex-col items-end gap-2 min-w-fit sm:static pt-8 sm:pt-0">
          {/* Ver perfil só no mobile */}
          <Link
            href={`/painel/psicologo/${psicologoId}`}
            className="text-[#232A5C] hover:underline text-sm fira-sans sm:hidden"
          >
            Ver perfil
          </Link>
        </div>
      </div>
      {/* Botões: mobile alinhado à direita, desktop ver perfil à esquerda e agendar à direita */}
      <div className="absolute bottom-2 right-2 w-full sm:static sm:mt-4 sm:flex sm:justify-between">
        {/* Mobile: botão agendar novamente à direita */}
        <div className="flex justify-end w-full sm:hidden gap-[4px]">
          <button
            className="w-[126px] h-[24px] px-2 sm:px-4 rounded-[3px] text-white text-xs font-semibold fira-sans bg-[#8494E9] hover:bg-[#6D75C0] transition-shadow shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)"
            style={{ opacity: 1 }}
          >
            Agendar novamente
          </button>
        </div>
        {/* Desktop: ver perfil ao lado do botão agendar novamente */}
        <div className="hidden sm:flex w-full justify-end items-center gap-[12px]">
          <Link
            href={`/painel/psicologo/${psicologoId}`}
            className="w-[99px] h-[40px] px-4 rounded-[6px] flex items-center justify-center font-medium text-[16px] leading-[24px] text-[#6D75C0] bg-white border border-[#6D75C0] hover:bg-[#E6E9FF] transition"
            style={{ opacity: 1 }}
          >
            Ver perfil
          </Link>
          <button
            className="w-[178px] h-[40px] px-4 rounded-[6px] text-white text-sm font-semibold fira-sans bg-[#8494E9] hover:bg-[#6D75C0] transition-shadow shadow-[0px_1px_4px_0px_rgba(0,0,0,0.04)"
            style={{ opacity: 1 }}
          >
            Agendar novamente
          </button>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col justify-center py-8">
      <p className="text-gray-500 fira-sans">Você ainda não possui nenhuma consulta</p>
    </div>
  );
}

export default function ConsultasFuturas() {
  const [visibleCount, setVisibleCount] = useState(3);
  const { consultasFuturas, refetch } = useConsultasFuturas();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Garante que consultasFuturas.futuras é sempre um array
  const consultasArray = Array.isArray(consultasFuturas?.futuras) ? consultasFuturas.futuras : [];
  // Adapta ConsultaApi para Consulta
  const consultasAdaptadas: Consulta[] = consultasArray.map((c) => ({
    Id: c.Id ?? '',
    Agenda: {
      Data: c.Agenda?.Data ?? '',
      Horario: c.Agenda?.Horario ?? '',
    },
    Date: c.Date ?? '',
    Time: c.Time ?? '',
    Status: c.Status ?? '',
    Psicologo: {
      Id: c.Psicologo?.Id ?? '',
      Nome: c.Psicologo?.Nome ?? '',
      Images: c.Psicologo?.Images?.map(img => ({ Url: img.Url })) ?? [],
    },
    ReservaSessao: c.ReservaSessao ? {
      Status: c.ReservaSessao.Status ?? '',
      AgoraChannel: c.ReservaSessao.VideoCallLink ?? null,
      VideoCallLink: c.ReservaSessao.VideoCallLink ?? null,
    } : undefined,
  }));
  const hasConsultas = consultasAdaptadas.length > 0;
  const consultasVisiveis = consultasAdaptadas.slice(0, visibleCount);
  const podeVerMais = visibleCount < consultasAdaptadas.length;

  const handleVerMais = () => {
    setVisibleCount((prev) => prev + 3);
  };

  return (
    <section className="bg-[#fff] p-4 sm:p-6 rounded-lg mt-8">
      <h3 className="font-bold text-[#232A5C] text-lg mb-5">Consultas Agendadas</h3>
      {!hasConsultas ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {consultasVisiveis.map((consulta: Consulta) => (
              <ConsultaCard key={consulta.Id} consulta={consulta} />
            ))}
          </div>
          {podeVerMais && (
            <button
              className="mt-4 px-4 py-2 bg-[#232A5C] text-white rounded hover:bg-[#1a2047] transition"
              onClick={handleVerMais}
            >
              Ver mais
            </button>
          )}
        </>
      )}
    </section>
  );
}
