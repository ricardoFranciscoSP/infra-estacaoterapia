'use client';
import React, { useEffect, useState } from "react";
import { useConsultasConcluidas } from "@/hooks/consulta";
import ConsultaModal from "./ConsultaModal";
import ModalReagendar from "./ModalReagendar";
import ModalCancelarSessao from "./ModalCancelarSessao";
import ModalCancelarSessaoDentroPrazo from "./ModalCancelarSessaoDentroPrazo";
import { isCancelamentoDentroPrazo } from "@/utils/cancelamentoUtils";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getAvatarUrl } from "@/utils/avatarUtils";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";


export type Consulta = {
  Id: string | number;
  agenda?: { data?: string; horario?: string };
  date?: string;
  time?: string;
  Status?: string;
  status?: string;
  pacienteId?: string | number;
  psicologoId?: string | number;
  psicologo?: {
    id?: string | number;
    nome?: string;
    images?: { url?: string }[];
  };
};

function ConsultaCard({ consulta, agendada = false }: { consulta: Consulta, agendada?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [showModalReagendar, setShowModalReagendar] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [showModalCancelarDentroPrazo, setShowModalCancelarDentroPrazo] = useState(false);
  const user = useAuthStore((state) => state.user);

  function formatarData(dataStr?: string) {
    if (!dataStr) return "";
    const dateObj = new Date(dataStr);
    if (isNaN(dateObj.getTime())) return "";
    const dia = String(dateObj.getDate()).padStart(2, "0");
    const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
    const ano = dateObj.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  const data = formatarData(consulta.agenda?.data || consulta.date);
  const horario = consulta.agenda?.horario || consulta.time;
  const dataHoraFormatada = data && horario ? `${data} às ${horario}` : "";

  const nomePsicologo = obterPrimeiroUltimoNome(consulta.psicologo?.nome) || "Psicólogo";
  const fotoPsicologo = getAvatarUrl({ imageUrl: consulta.psicologo?.images?.[0]?.url });
  const psicologoId = consulta.psicologoId || consulta.psicologo?.id;
  const pacienteId = consulta.pacienteId || user?.Id;
  const status = consulta.Status || consulta.status || "";
  
  // Usa util unificado para refletir exatamente o status do banco
  const statusTag = getStatusTagInfo(status);

  return (
    <>
      {agendada && (
        <>
          <ConsultaModal
            open={showModal}
            onClose={() => setShowModal(false)}
            consulta={{
              data: consulta.agenda?.data || consulta.date || "",
              horario: consulta.agenda?.horario || consulta.time || "",
              psicologo: {
                nome: nomePsicologo,
                avatarUrl: fotoPsicologo,
              },
            }}
            botaoEntrarDesabilitado={true}
            consultaId={consulta.Id ? String(consulta.Id) : undefined}
            onAbrirCancelar={(consultaIdParam) => {
              console.log('[HistoricoConsultas] onAbrirCancelar chamado', {
                consultaIdParam,
                consultaId: consulta.Id
              });
              
              setShowModal(false);
              setTimeout(() => {
                // Verifica se está dentro ou fora do prazo de 24h
                const dataConsulta = consulta.agenda?.data || consulta.date;
                const horarioConsulta = consulta.agenda?.horario || consulta.time;
                const dentroPrazo = isCancelamentoDentroPrazo(dataConsulta, horarioConsulta);
                // Verifica se é paciente (usuário logado)
                const isPaciente = user?.Role === 'Patient' || !user?.Role;
                
                console.log('[HistoricoConsultas] Verificação de prazo', {
                  dataConsulta,
                  horarioConsulta,
                  dentroPrazo,
                  isPaciente,
                  vaiAbrirDentroPrazo: dentroPrazo && isPaciente
                });
                
                if (dentroPrazo && isPaciente) {
                  // Dentro do prazo: usa modal simples sem motivo
                  console.log('[HistoricoConsultas] Abrindo modal de cancelamento dentro do prazo');
                  setShowModalCancelarDentroPrazo(true);
                } else {
                  // Fora do prazo: usa modal com motivo e upload
                  console.log('[HistoricoConsultas] Abrindo modal de cancelamento fora do prazo');
                  setShowModalCancelar(true);
                }
              }, 200);
            }}
          />
          {/* Modal de cancelamento dentro do prazo (>24h) - apenas para pacientes */}
          {showModalCancelarDentroPrazo && (
            <ModalCancelarSessaoDentroPrazo
              open={showModalCancelarDentroPrazo}
              onClose={() => setShowModalCancelarDentroPrazo(false)}
              consulta={{
                id: consulta.Id ? String(consulta.Id) : undefined,
                date: consulta.agenda?.data || consulta.date,
                time: consulta.agenda?.horario || consulta.time,
                pacienteId: pacienteId ? String(pacienteId) : undefined,
                psicologoId: psicologoId ? String(psicologoId) : undefined,
                linkDock: undefined,
                status: "Deferido", // Cancelamento dentro do prazo é automaticamente deferido
                tipo: "Paciente"
              }}
              onConfirm={() => {
                setShowModalCancelarDentroPrazo(false);
                // Recarrega a página ou atualiza a lista de consultas
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            />
          )}
          {/* Modal de cancelamento fora do prazo (<24h) - com motivo e upload */}
          <ModalCancelarSessao
            open={showModalCancelar}
            onClose={() => setShowModalCancelar(false)}
            consulta={{
              id: consulta.Id ? String(consulta.Id) : undefined,
              date: consulta.agenda?.data || consulta.date,
              time: consulta.agenda?.horario || consulta.time,
              pacienteId: pacienteId ? String(pacienteId) : undefined,
              psicologoId: psicologoId ? String(psicologoId) : undefined,
              status: 'EmAnalise',
              tipo: undefined
            }}
            onConfirm={() => {
              setShowModalCancelar(false);
              // Recarrega a página ou atualiza a lista de consultas
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
          />
        </>
      )}
      <ModalReagendar
        isOpen={showModalReagendar}
        onClose={() => setShowModalReagendar(false)}
        consulta={{
          data: consulta.agenda?.data || consulta.date || "",
          horario: consulta.agenda?.horario || consulta.time || "",
          psicologo: {
            nome: nomePsicologo,
          },
        }}
  consultaIdAtual={String(consulta.Id)}
      />
      <Card className="relative bg-white sm:bg-[#F2F4FD] shadow rounded-xl sm:w-[588px] sm:h-[132px] mb-4 border-0">
        <CardContent className="p-4 sm:p-6 sm:h-full sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Botão "Ver perfil" no topo direito somente no mobile */}
        <Link
          href={`/psicologo/${psicologoId}`}
          className="absolute right-4 top-4 text-[#6D75C0] hover:underline text-sm font-medium sm:hidden cursor-pointer"
        >
          Ver perfil
        </Link>
        <div className="flex gap-4 items-start sm:items-center">
          <div className="relative shrink-0">
            <Image
              src={fotoPsicologo}
              alt={nomePsicologo}
              width={64}
              height={64}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#6D75C0]"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[#232A5C] font-bold text-base sm:text-lg leading-5">
              {nomePsicologo}
            </span>
            <span className="text-[#232A5C] text-sm mt-[2px]">
              {dataHoraFormatada}
            </span>
            {/* Versão desktop do "Ver perfil" */}
            <Link
              href={`/psicologo/${psicologoId}`}
              className="text-[#6D75C0] hover:underline text-sm font-medium mt-[4px] text-left hidden sm:inline cursor-pointer"
            >
              Ver perfil
            </Link>
          </div>
        </div>
        {/* Status e botão à direita */}
        <div className="flex flex-col items-end gap-3 mt-4 sm:mt-0">
          {/* Box de Status */}
          {status && (
            <div className={`${statusTag.bg} rounded-lg px-3 py-2 flex items-center gap-2 w-full sm:w-auto`}>
              <svg className={`w-5 h-5 ${statusTag.text}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className={`${statusTag.text} text-sm font-medium`}>
                {statusTag.texto}
              </span>
            </div>
          )}
          {/* Botão Ver detalhes */}
          <button
            className="min-w-[140px] h-[40px] bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer w-full sm:w-auto"
            onClick={() => setShowModal(true)}
          >
            Ver detalhes
          </button>
        </div>
        </CardContent>
      </Card>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col justify-center py-8">
      <p className="text-gray-500 fira-sans">Você ainda não possui nenhuma consulta</p>
    </div>
  );
}

export default function HistoricoConsultas() {
  const [visibleCountCompleted, setVisibleCountCompleted] = useState(3);
  const [visibleCountReserved, setVisibleCountReserved] = useState(3);
  const { consultasConcluidas, refetch } = useConsultasConcluidas();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Normaliza formatos diferentes que a API pode retornar.
  type PessoaApiRaw = {
    Id?: string | number;
    id?: string | number;
    Nome?: string;
    nome?: string;
    Images?: { Url?: string; url?: string }[];
    images?: { Url?: string; url?: string }[];
    [key: string]: unknown;
  };

  type ReservaSessaoApiRaw = {
    Status?: string;
    status?: string;
    [key: string]: unknown;
  };

  type ConsultaApiRaw = {
    Id?: string | number;
    id?: string | number;
    Status?: string;
    status?: string;
    ReservaSessao?: ReservaSessaoApiRaw;
    reservaSessao?: ReservaSessaoApiRaw;
    Agenda?: {
      Data?: string;
      Horario?: string;
      Status?: string;
      data?: string;
      horario?: string;
      status?: string;
    };
    agenda?: {
      Data?: string;
      Horario?: string;
      Status?: string;
      data?: string;
      horario?: string;
      status?: string;
    };
    Date?: string;
    date?: string;
    Time?: string;
    time?: string;
    Psicologo?: PessoaApiRaw;
    psicologo?: PessoaApiRaw;
    Paciente?: PessoaApiRaw;
    paciente?: PessoaApiRaw;
    [key: string]: unknown;
  };

  type ConsultasApiFormat = {
    reserved?: ConsultaApiRaw[];
    completed?: ConsultaApiRaw[];
    futuras?: ConsultaApiRaw[];
    data?: ConsultaApiRaw[];
    [key: string]: unknown;
  };

  function toArrayPossible(obj: unknown): ConsultaApiRaw[] {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj as ConsultaApiRaw[];
    if (typeof obj === 'object' && obj !== null) {
      const o = obj as ConsultasApiFormat;
      if (Array.isArray(o.reserved)) return o.reserved;
      if (Array.isArray(o.completed)) return o.completed;
      if (Array.isArray(o.futuras)) return o.futuras;
      if (Array.isArray(o.data)) return o.data;
    }
    return [];
  }

  const reservedArray = toArrayPossible((consultasConcluidas && typeof consultasConcluidas === 'object' && 'reserved' in consultasConcluidas)
    ? (consultasConcluidas as unknown as ConsultasApiFormat).reserved
    : consultasConcluidas);
  const completedArray = toArrayPossible((consultasConcluidas && typeof consultasConcluidas === 'object' && 'completed' in consultasConcluidas)
    ? (consultasConcluidas as unknown as ConsultasApiFormat).completed
    : consultasConcluidas);

  const hasReserved = reservedArray.length > 0;
  const hasCompleted = completedArray.length > 0;

  const reservedVisiveis = reservedArray.slice(0, visibleCountReserved);
  const completedVisiveis = completedArray.slice(0, visibleCountCompleted);

  const podeVerMaisReserved = visibleCountReserved < reservedArray.length;
  const podeVerMaisCompleted = visibleCountCompleted < completedArray.length;

  const handleVerMaisReserved = () => setVisibleCountReserved((prev) => prev + 3);
  const handleVerMaisCompleted = () => setVisibleCountCompleted((prev) => prev + 3);

  return (
    <section
      id="proxima-consulta"
      className="bg-[#fff] p-4 sm:p-6 rounded-lg mt-8 w-full max-w-full md:max-w-[580px]"
    >
      <h3 className="font-bold text-[#232A5C] text-lg mb-5">Consultas Agendadas</h3>
      {!hasReserved ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {reservedVisiveis.map((c) => {
              const id = typeof c.Id === "string" || typeof c.Id === "number"
                ? c.Id
                : typeof c.id === "string" || typeof c.id === "number"
                  ? c.id
                  : String(Math.random());
              const agendaObj = c.Agenda ?? c.agenda;
              const date = agendaObj?.Data ?? agendaObj?.data ?? c.Date ?? c.date ?? null;
              const time = agendaObj?.Horario ?? agendaObj?.horario ?? c.Time ?? c.time ?? null;
              // Usa o status da ReservaSessao/Consulta/Agenda se disponível, sem usar any
              const status = c.ReservaSessao?.Status
                ?? c.reservaSessao?.Status
                ?? c.reservaSessao?.status
                ?? c.Status
                ?? c.status
                ?? agendaObj?.Status
                ?? agendaObj?.status
                ?? null;
              const psic = c.Psicologo ?? c.psicologo ?? c.Paciente ?? c.paciente;
              const psImages = psic?.Images ?? psic?.images ?? [];
              const psicologo = psic
                ? ((typeof psic.Id === "string" || typeof psic.Id === "number")
                    ? {
                        id: psic.Id,
                        nome: obterPrimeiroUltimoNome(
                          typeof psic.Nome === "string"
                            ? psic.Nome
                            : typeof psic.nome === "string"
                              ? psic.nome
                              : undefined
                        ) || "Psicólogo",
                        images: Array.isArray(psImages)
                          ? psImages.map((img: { Url?: string; url?: string }) => ({ url: typeof img?.Url === "string" ? img.Url : typeof img?.url === "string" ? img.url : undefined }))
                          : [],
                      }
                    : (typeof psic.id === "string" || typeof psic.id === "number")
                      ? {
                          id: psic.id,
                          nome: obterPrimeiroUltimoNome(
                            typeof psic.Nome === "string"
                              ? psic.Nome
                              : typeof psic.nome === "string"
                                ? psic.nome
                                : undefined
                          ) || "Psicólogo",
                          images: Array.isArray(psImages)
                            ? psImages.map((img: { Url?: string; url?: string }) => ({ url: typeof img?.Url === "string" ? img.Url : typeof img?.url === "string" ? img.url : undefined }))
                            : [],
                        }
                      : undefined)
                : undefined;

              return (
                <ConsultaCard
                  key={String(id)}
                  consulta={{
                    Id: id,
                    agenda: date ? { data: String(date), horario: String(time) } : undefined,
                    date: date ? String(date) : undefined,
                    time: time ? String(time) : undefined,
                    Status: status ? String(status) : undefined,
                    status: status ? String(status) : undefined,
                    psicologo: psicologo && typeof psicologo.id !== "object" ? psicologo : undefined,
                  }}
                  agendada={true}
                />
              );
            })}
          </div>
          {podeVerMaisReserved && (
            <button
              className="mt-4 px-4 py-2 bg-[#232A5C] text-white rounded hover:bg-[#1a2047] transition"
              onClick={handleVerMaisReserved}
            >
              Ver mais
            </button>
          )}
        </>
      )}

      {/* Divisor visual */}
      <div className="w-full border-t border-gray-200 my-8"></div>

      <h3 className="font-bold text-[#232A5C] text-lg mb-5">Consultas Realizadas</h3>
      {!hasCompleted ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {completedVisiveis.map((c) => {
              const id = typeof c.Id === "string" || typeof c.Id === "number"
                ? c.Id
                : typeof c.id === "string" || typeof c.id === "number"
                  ? c.id
                  : String(Math.random());
              const agendaObj = c.Agenda ?? c.agenda;
              const date = agendaObj?.Data ?? agendaObj?.data ?? c.Date ?? c.date ?? null;
              const time = agendaObj?.Horario ?? agendaObj?.horario ?? c.Time ?? c.time ?? null;
              const status = c.Status ?? c.status ?? agendaObj?.Status ?? agendaObj?.status ?? null;
              const psic = c.Psicologo ?? c.psicologo ?? c.Paciente ?? c.paciente;
              const psImages = psic?.Images ?? psic?.images ?? [];
              const psicologo = psic
                ? ((typeof psic.Id === "string" || typeof psic.Id === "number")
                    ? {
                        id: psic.Id,
                        nome: obterPrimeiroUltimoNome(
                          typeof psic.Nome === "string"
                            ? psic.Nome
                            : typeof psic.nome === "string"
                              ? psic.nome
                              : undefined
                        ) || "Psicólogo",
                        images: Array.isArray(psImages)
                          ? psImages.map((img: { Url?: string; url?: string }) => ({ url: typeof img?.Url === "string" ? img.Url : typeof img?.url === "string" ? img.url : undefined }))
                          : [],
                      }
                    : (typeof psic.id === "string" || typeof psic.id === "number")
                      ? {
                          id: psic.id,
                          nome: obterPrimeiroUltimoNome(
                            typeof psic.Nome === "string"
                              ? psic.Nome
                              : typeof psic.nome === "string"
                                ? psic.nome
                                : undefined
                          ) || "Psicólogo",
                          images: Array.isArray(psImages)
                            ? psImages.map((img: { Url?: string; url?: string }) => ({ url: typeof img?.Url === "string" ? img.Url : typeof img?.url === "string" ? img.url : undefined }))
                            : [],
                        }
                      : undefined)
                : undefined;

              return (
                <ConsultaCard
                  key={String(id)}
                  consulta={{
                    Id: id,
                    agenda: date ? { data: String(date), horario: String(time) } : undefined,
                    date: date ? String(date) : undefined,
                    time: time ? String(time) : undefined,
                    Status: status ? String(status) : undefined,
                    status: status ? String(status) : undefined,
                    psicologo: psicologo,
                  }}
                  agendada={false}
                />
              );
            })}
          </div>
          {podeVerMaisCompleted && (
            <button
              className="mt-4 px-4 py-2 bg-[#232A5C] text-white rounded hover:bg-[#1a2047] transition"
              onClick={handleVerMaisCompleted}
            >
              Ver mais
            </button>
          )}
        </>
      )}
    </section>
  );
}
