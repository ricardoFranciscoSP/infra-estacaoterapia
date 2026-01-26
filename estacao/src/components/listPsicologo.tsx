"use client";
import React, { useRef, Dispatch, SetStateAction, useState } from "react";
import { AgendamentoParams } from "@/utils/agendamentoUtils";
import { useAuthStore } from "@/store/authStore";
import ModalLoginAgendamento from "./ModalLoginAgendamento";
import { useVerificarSaldoConsulta } from "@/hooks/useVerificarSaldoConsulta";
import toast from "react-hot-toast";
import Link from "next/link";

// Tipos para datas e horários
interface DiaData {
  label: string;
  date: Date;
}
interface HorarioData {
  horario: string;
  id: string | number;
}
interface Psicologo {
  Id?: string | number;
  id?: string | number;
  nome?: string;
  Nome?: string;
  Image?: Array<{ Url?: string }>;
  Images?: Array<{ Url?: string }>;
}

interface HorarioSelecionado {
  diaIdx: number;
  horaIdx: number;
  agendaId: string;
}

export type BloqueioHorario = {
  diaIdx: number;
  horaIdx: number;
  agendaId: string;
} | null;

interface ListPsicologoProps {
  idx: number;
  p: Psicologo;
  datas: DiaData[];
  startIdx: number;
  setStartIdx: (idx: number) => void;
  totalDias: number;
  diasVisiveis: number;
  diaSelecionado: number;
  setDiaSelecionado: (idx: number) => void;
  horariosPorData: HorarioData[][][];
  horariosSelecionados: Record<string, HorarioSelecionado | undefined | null>;
  setHorariosSelecionados: Dispatch<SetStateAction<{ [psicologoId: string]: HorarioSelecionado | null }>>;
  selecionarHorario: (psicologoId: string, diaIdx: number, horaIdx: number, agendaId: string) => void;
  bloqueioHorarios: Record<string, BloqueioHorario | undefined>;
  setBloqueioHorarios?: Dispatch<SetStateAction<Record<string, BloqueioHorario | undefined>>>;
  abrirResumoAgenda: (params: {
    psicologoId: string;
    agendaId: string;
    nome: string;
    data: string;
    horario: string;
  }) => void;
}

const ListPsicologo: React.FC<ListPsicologoProps> = ({
  idx,
  p,
  datas,
  startIdx,
  setStartIdx,
  totalDias,
  diasVisiveis,
  diaSelecionado,
  setDiaSelecionado,
  horariosPorData,
  horariosSelecionados,
  setHorariosSelecionados,
  selecionarHorario,
  setBloqueioHorarios,
  abrirResumoAgenda,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const [modalLoginOpen, setModalLoginOpen] = useState(false);
  const [agendamentoPendente, setAgendamentoPendente] = useState<AgendamentoParams | null>(null);
  const { data: saldoConsulta, isLoading: isLoadingSaldo } = useVerificarSaldoConsulta();

  const psicologoKey = String(p.Id ?? p.id);
  
  // Obter avatar URL do psicólogo
  const psicologoAvatarUrl = p.Image?.[0]?.Url || p.Images?.[0]?.Url;

  // Limpar seleção e bloqueio só deste psicólogo
  // Quando limpar, todos os horários devem ficar clicáveis novamente
  const limparSelecao = () => {
    // Remove a seleção deste psicólogo
    setHorariosSelecionados((prev) => {
      const novo = { ...prev };
      novo[psicologoKey] = null;
      return novo;
    });
    // Remove o bloqueio deste psicólogo, permitindo que todos os horários fiquem clicáveis
    if (setBloqueioHorarios) {
      setBloqueioHorarios((prev) => {
        const novo = { ...prev };
        delete novo[psicologoKey];
        return novo;
      });
    }
  };


  return (
    <div
      className="flex-1 flex flex-col justify-between bg-[#F2F4FD] border-l-0 md:border-l md:border-[1px] border-[#9BA9ED] border-t-0 md:border-t-0 rounded-br-[8px] md:rounded-tr-[8px] md:rounded-br-[8px] rounded-bl-[8px] md:rounded-bl-[0px] md:rounded-tl-[0px] p-0 md:p-0 min-h-0 w-full h-[344px] md:w-[565px] md:h-[372px] relative"
    >
      {/* Carrossel horizontal de datas e horários */}
      <div className="w-full mb-0 md:mb-0 flex flex-col items-center justify-center md:pt-6 md:pl-4 md:pr-4">
        <div className="flex flex-row items-start w-full h-auto md:h-[260px] justify-between relative overflow-visible md:overflow-visible" style={{ maxHeight: "calc(100% - 50px)" }}>
          {/* Seta para a esquerda - MOBILE: menor e mais compacta */}
          <button
            className="absolute left-0 z-10 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-[#75838F] hover:opacity-70 rounded mt-0 md:mt-1 top-0 transition-opacity bg-transparent md:bg-transparent"
            onClick={() => setStartIdx(Math.max(0, startIdx - 1))}
            disabled={startIdx === 0}
            style={{ opacity: startIdx === 0 ? 0.3 : 1, left: "0px" }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="md:w-5 md:h-5">
              <path d="M15 18l-6-6 6-6" stroke="#75838F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            ref={scrollRef}
            className="flex flex-col h-auto md:h-[230px] select-none items-center md:pl-0"
            style={{
              WebkitOverflowScrolling: "touch",
              marginLeft: "0px",
              marginRight: "0px",
              paddingLeft: "28px",
              paddingRight: "0px",
              transition: "margin-left 0.2s",
              width: "calc(100% - 28px)",
            }}
          >
            {/* Datas - colunas sempre visíveis, largura total */}
            <div className="flex flex-row w-full h-[40px] md:w-full md:h-[48px] mb-1 md:mb-1 justify-start md:justify-start overflow-x-hidden scrollbar-hide pb-0 md:gap-2 md:px-8" style={{ paddingLeft: "0px", paddingRight: "0px", gap: "4px", marginRight: "0px" }}>
              {datas.slice(startIdx, startIdx + diasVisiveis).map((dia: DiaData, idxDia: number) => {
                const hoje = new Date();
                const isHoje = dia.date.toDateString() === hoje.toDateString();
                return (
                  <div
                    key={dia.label}
                    className="flex flex-col items-center flex-shrink-0 md:w-[56px] md:flex-none"
                    style={{ flex: "1 1 0", minWidth: "0", alignItems: "center", width: "100%" }}
                  >
                    <button
                      className={`rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all duration-200 shadow-sm md:w-[56px] md:h-[48px] md:p-2 w-full
                        ${
                          isHoje
                            ? "bg-[#8494E9] text-white border-[#8494E9] shadow-md hover:shadow-lg"
                            : diaSelecionado === startIdx + idxDia
                            ? "bg-[#8494E9] text-white border-[#8494E9] shadow-md hover:shadow-lg"
                            : "bg-white text-[#75838F] border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#8494E9] hover:shadow-md"
                        }
                      `}
                      style={{ 
                        width: "100%", 
                        height: "36px", 
                        padding: "6px",
                        borderWidth: "1px",
                        borderRadius: "8px"
                      }}
                      onClick={() => setDiaSelecionado(startIdx + idxDia)}
                    >
                      <span className="text-[9px] md:text-[11px] leading-tight">{dia.label.split(" ")[0] ?? ""}</span>
                      <span className="font-bold text-[11px] md:text-[14px] leading-tight">{dia.label.split(" ")[1] ?? ""}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Horários - 7 colunas, rolagem única à direita, 4 horários visíveis */}
            {(() => {
              const semanaSemHorarios = datas
                .slice(startIdx, startIdx + diasVisiveis)
                .every(
                  (d, i) =>
                    !(
                      Array.isArray(horariosPorData[idx]) &&
                      horariosPorData[idx][startIdx + i] &&
                      horariosPorData[idx][startIdx + i].length > 0
                    )
                );
              
              if (semanaSemHorarios) {
                return (
                  <div className="flex items-center justify-center w-full h-[104px] md:h-[204px] px-2">
                    <span className="font-fira-sans font-normal text-[16px] leading-6 text-[#49525A] text-center">
                      Não há horários disponíveis para essa data
                    </span>
                  </div>
                );
              }

              return (
                <div
                  className="flex flex-row w-full h-[104px] md:w-full md:h-[204px] max-h-[104px] md:max-h-[204px] overflow-y-auto overflow-x-hidden justify-start md:justify-start scrollbar-visible gap-[4px] md:gap-2 md:px-8"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#CACFD4 #F2F4FD",
                    WebkitOverflowScrolling: "touch",
                    paddingRight: "0px",
                    marginRight: "0px",
                    paddingLeft: "0px",
                  }}
                >
                  {datas.slice(startIdx, startIdx + diasVisiveis).map((dia: DiaData, idxDia: number) => {
                    const horariosDataCol =
                      horariosPorData[idx] && horariosPorData[idx][startIdx + idxDia]
                        ? horariosPorData[idx][startIdx + idxDia]
                        : [];
                    return (
                      <div
                        key={dia.label + "-horarios"}
                        className="flex flex-col items-center flex-shrink-0 md:w-[56px] md:flex-none"
                        style={{ flex: "1 1 0", minWidth: "0", width: "100%", alignItems: "center" }}
                      >
                        <div className="flex flex-col items-center w-full gap-[3px] md:gap-[10px]" style={{ width: "100%" }}>
                          {horariosDataCol.length > 0 &&
                            horariosDataCol.map((horario: HorarioData, hIdx: number) => {
                              if (!horario || !horario.horario) return null;
                              const hora = horario.horario;
                              const agendaId = horario.id || null;
                              const horarioSelecionado = horariosSelecionados[psicologoKey];
                              const isSelected =
                                horarioSelecionado !== null &&
                                horarioSelecionado !== undefined &&
                                horarioSelecionado.diaIdx === startIdx + idxDia &&
                                horarioSelecionado.horaIdx === hIdx;
                              const hasSelection = horarioSelecionado !== null && horarioSelecionado !== undefined;
                              const isBlocked = hasSelection && !isSelected;
                              return (
                                <button
                                  key={`${psicologoKey}-${startIdx + idxDia}-${hIdx}-${hora}`}
                                  className={`rounded-lg text-[10px] md:text-[12px] font-semibold flex items-center justify-center transition-all duration-200 relative shadow-sm md:w-[56px] md:h-[32px] md:p-1 w-full
                                    ${
                                      isSelected
                                        ? "bg-[#8494E9] text-white ring-2 ring-[#8494E9] ring-offset-1 font-bold cursor-pointer shadow-md"
                                        : isBlocked
                                        ? "bg-[#E5E7EB] text-[#9CA3AF] opacity-50 cursor-not-allowed"
                                        : "bg-[#F3F4F6] text-[#75838F] hover:bg-[#8494E9] hover:text-white hover:shadow-md cursor-pointer border border-[#E5E7EB]"
                                    }
                                  `}
                                  style={{ 
                                    width: "100%", 
                                    height: "24px", 
                                    padding: "4px",
                                    borderRadius: "8px",
                                    margin: "0"
                                  }}
                                  disabled={isBlocked}
                                  onClick={() => {
                                    if (isBlocked) return;
                                    if (isSelected) {
                                      setHorariosSelecionados((prev) => ({
                                        ...prev,
                                        [psicologoKey]: null,
                                      }));
                                      if (setBloqueioHorarios) {
                                        setBloqueioHorarios((prev) => {
                                          const novo = { ...prev };
                                          delete novo[psicologoKey];
                                          return novo;
                                        });
                                      }
                                      return;
                                    }
                                    if (setBloqueioHorarios) {
                                      setBloqueioHorarios((prev) => ({
                                        ...prev,
                                        [psicologoKey]: {
                                          diaIdx: startIdx + idxDia,
                                          horaIdx: hIdx,
                                          agendaId: String(agendaId ?? ""),
                                        },
                                      }));
                                    }
                                    selecionarHorario(psicologoKey, startIdx + idxDia, hIdx, String(agendaId ?? ""));
                                  }}
                                >
                                  {hora}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          {/* Seta para a direita - MOBILE: menor e mais compacta */}
          <button
            className="absolute right-0 z-10 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-[#75838F] hover:opacity-70 rounded mt-0 md:mt-1 top-0 transition-opacity bg-transparent md:bg-transparent"
            onClick={() => setStartIdx(Math.min(totalDias - diasVisiveis, startIdx + 1))}
            disabled={
              startIdx >= totalDias - diasVisiveis ||
              (Array.isArray(horariosPorData[idx]) ? horariosPorData[idx] : []).every(
                (horarios: HorarioData[]) => horarios.length === 0
              )
            }
            style={{
              opacity:
                startIdx >= totalDias - diasVisiveis ||
                (Array.isArray(horariosPorData[idx]) ? horariosPorData[idx] : []).every(
                  (horarios: HorarioData[]) => horarios.length === 0
                )
                  ? 0.3
                  : 1,
              right: "0px",
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="md:w-5 md:h-5">
              <path d="M9 6l6 6-6 6" stroke="#75838F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Botões LIMPAR e AGENDAR - Mobile */}
      <div className="w-full flex justify-end items-center gap-2 md:hidden mt-0 mb-4" style={{ paddingRight: "30px", marginRight: "0px", zIndex: 5 }}>
        {(() => {
          const algumHorarioDisponivel = datas
            .slice(startIdx, startIdx + diasVisiveis)
            .some((d: DiaData, i: number) => {
              if (d.date.getDay() === 0) return false;
              const horariosArray = Array.isArray(horariosPorData[idx]) ? horariosPorData[idx][startIdx + i] : [];
              return (horariosArray?.length ?? 0) > 0;
            });
          if (!algumHorarioDisponivel) return null;
          const isAgendarHabilitadoMobile =
            !!horariosSelecionados[psicologoKey] &&
            horariosSelecionados[psicologoKey]!.diaIdx >= startIdx &&
            horariosSelecionados[psicologoKey]!.diaIdx < startIdx + diasVisiveis;
          return (
            <>
              {isAgendarHabilitadoMobile && (
                <button
                  className="w-20 md:w-[100px] min-h-[44px] h-11 md:h-[40px] flex items-center justify-center rounded-md px-2 py-1 text-sm md:text-base font-bold transition bg-white text-[#8494E9] border border-[#8494E9] hover:bg-[#6B7DD8] hover:text-white hover:border-[#6B7DD8]"
                  onClick={limparSelecao}
                >
                  Limpar
                </button>
              )}
              <button
                className={`w-auto md:w-[200px] min-h-[44px] h-11 md:h-[40px] flex items-center justify-center gap-2 md:gap-3 rounded-md px-4 md:px-8 py-2 md:py-2 text-sm md:text-base font-bold transition relative
                  ${
                    isAgendarHabilitadoMobile
                      ? "bg-[#8494E9] text-white hover:bg-[#6B7DD8] cursor-pointer"
                      : "bg-[#CACFD4] text-white cursor-not-allowed"
                  }`}
                style={{ marginRight: "0px", zIndex: 10 }}
                disabled={!isAgendarHabilitadoMobile}
                onClick={() => {
                  if (!isAgendarHabilitadoMobile) return;
                  const horarioSel = horariosSelecionados[psicologoKey];
                  const diaIdx = horarioSel?.diaIdx ?? 0;
                  const horaIdx = horarioSel?.horaIdx ?? 0;
                  const agendaId = horarioSel?.agendaId;
                  const dataISO = datas[diaIdx]?.date?.toISOString().slice(0, 10) || "";
                  const hora =
                    horariosPorData[idx] &&
                    horariosPorData[idx][diaIdx] &&
                    horariosPorData[idx][diaIdx][horaIdx]?.horario
                      ? horariosPorData[idx][diaIdx][horaIdx].horario
                      : "";
                  const agendamento: AgendamentoParams = {
                    psicologoId: psicologoKey,
                    agendaId: String(agendaId ?? ""),
                    nome: p.nome ?? p.Nome ?? "",
                    data: dataISO,
                    horario: hora,
                  };
                  const isUserValid = !!user && !!user.Id;
                  
                  if (isUserValid) {
                    // Usuário logado: segue fluxo normal de agendamento
                    // Verifica saldo e efetiva agendamento direto
                    if (isLoadingSaldo) {
                      // Aguarda carregar o saldo
                      toast.error("Aguarde enquanto verificamos seu saldo...");
                      return;
                    }
                    // Se tem saldo, abre o resumo de agendamento
                    if (saldoConsulta?.temSaldo) {
                      abrirResumoAgenda(agendamento);
                    } else {
                      // Sem saldo, mostra toast de saldo insuficiente com link
                      toast.error(
                        (t) => (
                          <div className="flex flex-col gap-2">
                            <span>Você não possui saldo suficiente ou plano ativo para agendar uma consulta.</span>
                            <Link
                              href="/painel/planos"
                              onClick={() => toast.dismiss(t.id)}
                              className="underline font-semibold text-[#B30000] hover:text-[#8B0000] transition-colors"
                            >
                              Adquira um plano ou consulta avulsa agora
                            </Link>
                          </div>
                        ),
                        {
                          duration: 6000,
                        }
                      );
                    }
                  } else {
                    // Usuário NÃO logado: segue fluxo de primeira sessão
                    // Abre modal de login que cria DraftSession e salva dados para compra
                    setAgendamentoPendente(agendamento);
                    setModalLoginOpen(true);
                  }
                }}
              >
                Agendar
              </button>
            </>
          );
        })()}
      </div>
      {/* Botão AGENDAR - Desktop (canto inferior direito do card principal, alinhado ao "Ver perfil completo") */}
      <div className="hidden md:flex absolute bottom-0 right-0 pr-4 pb-6 mb-4 z-30" style={{ marginRight: "30px" }}>
        {(() => {
          const algumHorarioDisponivel = datas
            .slice(startIdx, startIdx + diasVisiveis)
            .some((d: DiaData, i: number) => {
              if (d.date.getDay() === 0) return false;
              const horariosArray = Array.isArray(horariosPorData[idx]) ? horariosPorData[idx][startIdx + i] : [];
              return (horariosArray?.length ?? 0) > 0;
            });
          if (!algumHorarioDisponivel) return null;
          const isAgendarHabilitado =
            !!horariosSelecionados[psicologoKey] &&
            horariosSelecionados[psicologoKey]!.diaIdx >= startIdx &&
            horariosSelecionados[psicologoKey]!.diaIdx < startIdx + diasVisiveis;
          return (
            <>
              {isAgendarHabilitado && (
                <button
                  className="w-[100px] h-[40px] flex items-center justify-center rounded-md px-2 py-1 text-base font-bold transition bg-white text-[#8494E9] border border-[#8494E9] hover:bg-[#e6eefe] mr-2"
                  onClick={limparSelecao}
                >
                  Limpar
                </button>
              )}
              <button
                className={`w-[93px] h-[40px] flex items-center justify-center gap-3 rounded-[12px] px-4 py-2 text-base font-bold transition
                  ${
                    isAgendarHabilitado
                      ? "bg-[#8494E9] text-white hover:bg-[#6B7DD8] cursor-pointer"
                      : "bg-[#EBEDEF] text-[#75838F] cursor-not-allowed"
                  }`}
                disabled={!isAgendarHabilitado}
                onClick={() => {
                  if (!isAgendarHabilitado) return;
                  const horarioSel = horariosSelecionados[psicologoKey];
                  const diaIdx = horarioSel?.diaIdx ?? 0;
                  const horaIdx = horarioSel?.horaIdx ?? 0;
                  const agendaId = horarioSel?.agendaId;
                  const dataISO = datas[diaIdx]?.date?.toISOString().slice(0, 10) || "";
                  const hora =
                    horariosPorData[idx] &&
                    horariosPorData[idx][diaIdx] &&
                    horariosPorData[idx][diaIdx][horaIdx]?.horario
                      ? horariosPorData[idx][diaIdx][horaIdx].horario
                      : "";
                  const agendamento: AgendamentoParams = {
                    psicologoId: psicologoKey,
                    agendaId: String(agendaId ?? ""),
                    nome: p.nome ?? p.Nome ?? "",
                    data: dataISO,
                    horario: hora,
                  };
                  const isUserValid = !!user && !!user.Id;
                  
                  if (isUserValid) {
                    // Usuário logado: segue fluxo normal de agendamento
                    // Verifica saldo e efetiva agendamento direto
                    if (isLoadingSaldo) {
                      // Aguarda carregar o saldo
                      toast.error("Aguarde enquanto verificamos seu saldo...");
                      return;
                    }
                    // Se tem saldo, abre o resumo de agendamento
                    if (saldoConsulta?.temSaldo) {
                      abrirResumoAgenda(agendamento);
                    } else {
                      // Sem saldo, mostra toast de saldo insuficiente com link
                      toast.error(
                        (t) => (
                          <div className="flex flex-col gap-2">
                            <span>Você não possui saldo suficiente ou plano ativo para agendar uma consulta.</span>
                            <Link
                              href="/painel/planos"
                              onClick={() => toast.dismiss(t.id)}
                              className="underline font-semibold text-[#B30000] hover:text-[#8B0000] transition-colors"
                            >
                              Adquira um plano ou consulta avulsa agora
                            </Link>
                          </div>
                        ),
                        {
                          duration: 6000,
                        }
                      );
                    }
                  } else {
                    // Usuário NÃO logado: segue fluxo de primeira sessão
                    // Abre modal de login que cria DraftSession e salva dados para compra
                    setAgendamentoPendente(agendamento);
                    setModalLoginOpen(true);
                  }
                }}
              >
                Agendar
              </button>
            </>
          );
        })()}
      </div>
      
      {/* Modal de Login para Agendamento */}
      <ModalLoginAgendamento
        open={modalLoginOpen}
        onClose={() => {
          setModalLoginOpen(false);
          setAgendamentoPendente(null);
        }}
        agendamento={agendamentoPendente}
        psicologoAvatarUrl={psicologoAvatarUrl}
      />
      
    </div>
  );
};

export default ListPsicologo;
