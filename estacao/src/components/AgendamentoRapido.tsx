"use client";
import ModalPerfilPsicologo from "./ModalPerfilPsicologo";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalCadastroAgendamento from "./ModalCadastroAgendamento";
import Image from "next/image";
import { Psicologo } from "@/types/psicologoTypes";
import { fetchAgendasPorDataHorario, fetchAgendasPorPeriodo } from "@/hooks/agenda.hook";
import { psicologoService } from "@/services/psicologo";
import { usePsicologoById } from "@/hooks/psicologoHook";

type Agenda = {
  Id: string;
  id: string;
  Data: string;
  Horario: string;
  horario: string;
  DiaDaSemana: string;
  Status: string;
  status: string;
  PsicologoId: string;
  psicologoId: string;
  PacienteId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
};

type HorarioDisponivel = {
  id: string;
  horario: string;
  status?: string;
  agendaId?: string;
};

type PsicologoDisponivel = Psicologo & {
  agendaId: string;
  horarios: HorarioDisponivel[];
  horario?: string;
  Abordagens?: string[];
  AreasAtuacao?: string;
};

type ModalData = {
  psicologo: PsicologoDisponivel;
  data: string;
  hora: string;
} | null;


const horasDisponiveis = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00',
];


function getTodayISO() {
  const now = new Date();
  // Força para o início do dia no fuso local
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


export default function AgendamentoRapido() {
  // Estados principais
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  // Remove listener para fechar por evento externo
  React.useEffect(() => {
    const closeListener = () => setOpen(false);
    window.addEventListener("close-agendamento-rapido", closeListener);
    return () => window.removeEventListener("close-agendamento-rapido", closeListener);
  }, []);

  // Seleciona o dia atual ao navegar para o mês/ano do dia atual, se não houver seleção
  // Seleciona o dia atual apenas na primeira abertura do calendário
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  React.useEffect(() => {
    if (!calendarInitialized) {
      setSelectedDate(getTodayISO());
      setCalendarInitialized(true);
    }
  }, [calendarInitialized]);
  const [step, setStep] = useState<"calendario" | "horarios" | "psicologos">("calendario");
  const [tab, setTab] = useState<"hora" | "periodo">("hora");
  const [selectedHora, setSelectedHora] = useState<string | null>(null);
  // Removido agendaSelecionada pois nunca é lido
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState<number | null>(null);
  const [loadingPsicologos, setLoadingPsicologos] = useState(false);
  const [horaSelecionadaIdx, setHoraSelecionadaIdx] = useState<number | null>(null);
  const [modalPerfilOpen, setModalPerfilOpen] = useState(false);
  const [modalPerfilPsicologo, setModalPerfilPsicologo] = useState<PsicologoDisponivel | null>(null);
  const [modalPerfilPsicologoId, setModalPerfilPsicologoId] = useState<string | null>(null);
  // Hook para buscar dados completos do psicólogo
  const { psicologo: psicologoCompleto } = usePsicologoById(modalPerfilPsicologoId ?? undefined);
  const [tagSelecionada, setTagSelecionada] = useState<{ psicologoIdx: number | null, horarioIdx: number | null } | null>(null);
  const [psicologosLista, setPsicologosLista] = useState<PsicologoDisponivel[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<ModalData>(null);
  const [error, setError] = useState<string>("");
  const todayISO = getTodayISO();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const calendarDays = (() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = [];
    const currentDate = new Date(startDate);
    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  })();

  // Utilitário: verifica se a data é passada
  const isPastDate = (date: Date): boolean => date < new Date(todayISO);

  // Sincroniza o mês/ano visualizado com a data selecionada
  React.useEffect(() => {
    if (selectedDate && open && step === "calendario") {
      const [yyyy, mm, dd] = selectedDate.split("-");
      const selectedDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const currentMonth = selectedDateObj.getMonth();
      const currentYear = selectedDateObj.getFullYear();
      if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
        setSelectedMonth(currentMonth);
        setSelectedYear(currentYear);
      }
    }
  }, [selectedDate, open, step, selectedMonth, selectedYear]);

  // Listener para fechar popup via evento customizado
  React.useEffect(() => {
    const closeListener = () => setOpen(false);
    window.addEventListener("close-agendamento-rapido", closeListener);
    return () => window.removeEventListener("close-agendamento-rapido", closeListener);
  }, []);

  // Handler para clique em data do calendário
  const handleDateClick = (date: Date) => {
    // Corrige para usar o fuso local, não UTC
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;
    if (date >= new Date(todayISO)) {
      setSelectedDate(dateString);
      setStep("horarios");
    }
  };


  async function buscarAgendaEProfissional() {
    if (selectedDate && selectedHora) {
      setLoadingPsicologos(true);
      setError("");
      try {
        const response = await fetchAgendasPorDataHorario(selectedDate, selectedHora);
        const agendasResp: Agenda[] = response || [];
        // setAgendas(agendasResp); // Removido pois não é utilizada
        // Filtra agendas disponíveis para o horário
        const agendasDisponiveis = agendasResp.filter((a) => (a.Horario || a.horario) === selectedHora && (a.Status || a.status) === "Disponivel");
        console.log('[DEBUG][agendasDisponiveis]', agendasDisponiveis);
        const psicologoIds = agendasDisponiveis
          .map((a) => a['psicologoId'] || a['PsicologoId'])
          .filter((id) => !!id); // Remove undefined ou null
        console.log('[DEBUG][agendasDisponiveis]', agendasDisponiveis);
        console.log('[DEBUG][psicologoIds]', psicologoIds);
        const psicologoPromises = psicologoIds.map((id: string) => psicologoService().getPsicologoId(id));
        const psicologos = await Promise.all(psicologoPromises);
        // Extrai os dados dos psicólogos (ajuste conforme retorno da API)
        const psicologosData: PsicologoDisponivel[] = psicologos
          .map((resp, idx: number) => {
            if (!resp || !resp.data) return null;
            return {
              ...resp.data,
              horario: agendasDisponiveis[idx].Horario || agendasDisponiveis[idx].horario,
              agendaId: agendasDisponiveis[idx].Id || agendasDisponiveis[idx].id
            };
          })
          .filter(Boolean); // Remove nulos
        setPsicologosLista(psicologosData);
        setStep("psicologos");
      } catch {
        setError("Erro ao buscar agendas/psicólogos.");
        // Removido setAgendaSelecionada pois nunca é lido
        setPsicologosLista([]);
      } finally {
        setLoadingPsicologos(false);
      }
    } else {
      // Removido setAgendaSelecionada pois nunca é lido
      setPsicologosLista([]);
    }
  }

  const psicologosDisponiveis = tab === "periodo"
    ? psicologosLista.filter(p => Array.isArray(p.horarios) && p.horarios.length > 0)
    : psicologosLista;

  // Função para buscar agendas por período
  async function buscarAgendasPorPeriodo() {
    if (selectedDate && selectedPeriodo) {
      setLoadingPsicologos(true);
      setError("");
      try {
        // Buscar agendas por período
        const response = await fetchAgendasPorPeriodo(selectedDate, selectedPeriodo);
        // Ajusta apenas para período, mantendo o formato original para hora
        const psicologosData: PsicologoDisponivel[] = (response || []).map((item: { psicologo: PsicologoDisponivel; horarios: { horario: string; agendaId: string }[] }) => ({
          ...item.psicologo,
          horarios: item.horarios,
          agendaId: "",
        }));
        setPsicologosLista(psicologosData);
        setStep("psicologos");
      } catch {
        setError("Erro ao buscar agendas/psicólogos.");
        setPsicologosLista([]);
      } finally {
        setLoadingPsicologos(false);
      }
    } else {
      setPsicologosLista([]);
    }
  }

  // Função para obter horários disponíveis conforme seleção
  // Função getHorariosParaExibir removida pois não é utilizada

  return (
  <div className="fixed left-4 z-50 p-0 md:p-0 md:left-[max(32px,calc((100vw-1280px)/2+32px))] bottom-28 md:bottom-8">
      <div className="relative">
        <button id="agendamento-rapido"
          onClick={() => {
            setOpen(!open);
            setStep("calendario");
          }}
          aria-label="Agendamento rápido"
          className="z-[9999] flex items-center justify-center bg-[#6D75C0] text-white rounded-full md:rounded-lg shadow-lg hover:bg-[#4b51a2] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#262B58] w-12 h-12 md:w-auto md:h-14 cursor-pointer"
        >
          <span className="flex md:hidden w-12 h-12 items-center justify-center">
            <Image src="/assets/agendamento-rapido-button.svg" alt="Agendar" width={48} height={48} className="w-12 h-12" />
          </span>
          <span className="hidden md:flex items-center h-14 px-4 gap-2">
            <Image src="/assets/icons/calendar-white.svg" alt="Agendar" width={24} height={24} className="w-6 h-6" />
            <span className="fira-sans color-[#FCFBF6] text-[16px] font-semibold">Agendamento rápido</span>
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full mb-2 left-0 z-50 w-[320px] rounded-xl bg-white shadow-lg border border-gray-200"
            >
              {step === "calendario" ? (
                <div className="p-4 rounded-xl shadow-lg border border-gray-200 bg-white min-w-[280px]">
                  {/* Título e ícone de fechar */}
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-base font-bold text-[#6D75C0]">Agendamento rápido</h2>
                    <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-[#6D75C0] hover:text-[#262B58] text-lg font-bold cursor-pointer">×</button>
                      {/* Botão X para fechar no topo direito */}
                      <button
                        className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-800 font-bold z-10"
                        aria-label="Fechar agendamento"
                        onClick={() => setOpen(false)}
                      >
                        ×
                      </button>
                  </div>

                  {/* Navegação de mês centralizada */}
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <button
                      className="text-[#6D75C0] text-xl px-2 py-1 rounded hover:bg-[#E0E3FF] transition"
                      aria-label="Mês anterior"
                      onClick={() => {
                        if (selectedMonth === 0) {
                          setSelectedMonth(11);
                          setSelectedYear(selectedYear - 1);
                        } else {
                          setSelectedMonth(selectedMonth - 1);
                        }
                      }}
                    >
                      <span>&lt;</span>
                    </button>
                    <span className="text-base font-semibold text-[#262B58]">
                      {new Date(selectedYear, selectedMonth).toLocaleString('pt-BR', { month: 'long' })} — {selectedYear}
                    </span>
                    <button
                      className="text-[#6D75C0] text-xl px-2 py-1 rounded hover:bg-[#E0E3FF] transition"
                      aria-label="Próximo mês"
                      onClick={() => {
                        if (selectedMonth === 11) {
                          setSelectedMonth(0);
                          setSelectedYear(selectedYear + 1);
                        } else {
                          setSelectedMonth(selectedMonth + 1);
                        }
                      }}
                    >
                      <span>&gt;</span>
                    </button>
                  </div>

                  {/* Dias da semana */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-light text-gray-500 mb-1">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  {/* Dias do mês */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((date, index) => {
                      const isCurrentMonth = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
                      // Corrige a comparação de datas para usar o mesmo formato local
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      const dateString = `${yyyy}-${mm}-${dd}`;
                      const isSelected = selectedDate === dateString;
                      const isPast = isPastDate(date);
                      const isDisabled = isPast || !isCurrentMonth;

                      // Classes para o botão do dia - prioridade para seleção
                      let dayClass = "w-8 h-8 text-xs rounded-lg border flex items-center justify-center transition-all";
                      
                      if (isSelected) {
                        // Dia selecionado: fundo lilás e texto branco destacado (sempre tem prioridade)
                        dayClass = "w-8 h-8 text-xs rounded-lg border-2 flex items-center justify-center transition-all !bg-[#A28EF5] !text-white !border-[#A28EF5] font-bold cursor-pointer shadow-md";
                      } else if (isDisabled) {
                        // Dias desabilitados (passados ou de outros meses)
                        if (!isCurrentMonth) {
                          dayClass += " bg-[#F5F5F5] text-gray-300 border-gray-300 cursor-not-allowed";
                        } else {
                          dayClass += " bg-white text-gray-300 border-gray-300 cursor-not-allowed";
                        }
                      } else {
                        // Dias normais disponíveis do mês atual
                        dayClass += " bg-white border-[#606C76] text-[#606C76] hover:bg-[#DAD3FF] hover:text-[#262B58] cursor-pointer";
                      }

                      return (
                        <button
                          key={index}
                          disabled={isDisabled && !isSelected}
                          onClick={() => handleDateClick(date)}
                          className={dayClass}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : step === "horarios" ? (
                <div className="p-4">
                    <button
                      className="text-sm text-[#262B58] font-semibold flex items-center gap-2 mb-2 cursor-pointer"
                      onClick={() => {
                        setStep("calendario");
                        // Sincroniza o mês/ano com a data selecionada
                        if (selectedDate) {
                          const [yyyy, mm, dd] = selectedDate.split("-");
                          const selectedDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                          setSelectedMonth(selectedDateObj.getMonth());
                          setSelectedYear(selectedDateObj.getFullYear());
                        }
                      }}
                    >
                    ← {(() => {
                      if (!selectedDate) return "";
                      const [ano, mes, dia] = selectedDate.split("-");
                      const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
                      return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(dataLocal);
                    })()}
                  </button>

                  <h3 className="text-sm font-semibold text-[#262B58] mb-2">Buscar agendas por:</h3>

                  <div className="flex border-b mb-3">
                    <button
                      onClick={() => setTab("hora")}
                      className={`w-1/2 text-center py-2 text-sm font-semibold cursor-pointer ${tab === "hora" ? "text-[#262B58] border-b-2 border-[#262B58]" : "text-gray-400"}`}
                    >
                      Hora
                    </button>
                    <button
                      onClick={() => setTab("periodo")}
                      className={`w-1/2 text-center py-2 text-sm font-semibold cursor-pointer ${tab === "periodo" ? "text-[#262B58] border-b-2 border-[#262B58]" : "text-gray-400"}`}
                    >
                      Período
                    </button>
                  </div>

                  {tab === "hora" ? (
                    <>
                      <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto mb-2">
                        {horasDisponiveis.map((horaStr, idx) => (
                          <button
                            key={horaStr}
                            className={
                              `w-[53px] h-[32px] rounded-[4px] px-[4px] flex items-center justify-center relative font-normal text-[14px] leading-[24px] text-[#49525A] font-[fira-sans] border-none transition-all duration-200 cursor-pointer ` +
                              (horaSelecionadaIdx === idx ? 'bg-[#6A994E] text-white' : 'bg-[#EBEDEF] hover:bg-[#E0E3FF]') +
                              (horaSelecionadaIdx !== null && horaSelecionadaIdx !== idx ? ' opacity-60' : '')
                            }
                            style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}
                            onClick={() => {
                              if (horaSelecionadaIdx === idx) {
                                setHoraSelecionadaIdx(null);
                                setSelectedHora(null);
                              } else {
                                setHoraSelecionadaIdx(idx);
                                setSelectedHora(horaStr);
                              }
                            }}
                            disabled={false}
                          >
                            <span className="w-full text-center">{horaStr}</span>
                            {horaSelecionadaIdx !== null && horaSelecionadaIdx !== idx && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-black text-lg font-bold">×</span>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {/* Botão/link para limpar seleção, aparece se houver seleção */}
                      {horaSelecionadaIdx !== null && (
                        <div className="flex justify-end mb-2">
                          <button
                            className="text-xs text-[#262B58] underline hover:text-[#4b51a2] font-semibold cursor-pointer"
                            onClick={() => {
                              setHoraSelecionadaIdx(null);
                              setSelectedHora(null);
                            }}
                          >
                            Limpar seleção
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mb-2">
                      <button
                        className={`w-full h-8 rounded-[4px] px-1 py-1 flex items-center justify-center bg-[#D8DCDF] text-[#262B58] font-medium text-sm hover:bg-[#E0E3FF] transition cursor-pointer ${selectedPeriodo === "manha" ? "ring-2 ring-[#262B58]" : ""}`}
                        onClick={() => setSelectedPeriodo("manha")}
                        type="button"
                      >
                        Manhã - 00:00 às 11:00
                      </button>
                      <button
                        className={`w-full h-8 rounded-[4px] px-1 py-1 flex items-center justify-center bg-[#D8DCDF] text-[#262B58] font-medium text-sm hover:bg-[#E0E3FF] transition cursor-pointer ${selectedPeriodo === "tarde" ? "ring-2 ring-[#262B58]" : ""}`}
                        onClick={() => setSelectedPeriodo("tarde")}
                        type="button"
                      >
                        Tarde - 12:00 às 17:00
                      </button>
                      <button
                        className={`w-full h-8 rounded-[4px] px-1 py-1 flex items-center justify-center bg-[#D8DCDF] text-[#262B58] font-medium text-sm hover:bg-[#E0E3FF] transition cursor-pointer ${selectedPeriodo === "noite" ? "ring-2 ring-[#262B58]" : ""}`}
                        onClick={() => setSelectedPeriodo("noite")}
                        type="button"
                      >
                        Noite - 18:00 às 23:00
                      </button>
                    </div>
                  )}

                  <button
                    className="mt-2 w-full bg-[#262B58] text-white py-2.5 rounded-lg font-semibold hover:bg-[#4b51a2] transition-colors disabled:opacity-50 cursor-pointer"
                    onClick={async () => {
                      if (tab === "hora" && selectedHora && selectedDate) {
                        await buscarAgendaEProfissional();
                      } else if (tab === "periodo" && selectedPeriodo && selectedDate) {
                        await buscarAgendasPorPeriodo();
                      }
                    }}
                    disabled={
                      (tab === "hora" && !selectedHora) ||
                      (tab === "periodo" && !selectedPeriodo)
                    }
                  >
                    Buscar
                  </button>
                </div>
              ) : step === "psicologos" ? (
                <div className="p-4">
                  <button
                    className="text-sm text-[#262B58] font-semibold flex items-center gap-2 mb-3 cursor-pointer"
                    onClick={() => setStep("horarios")}
                  >
                    ← {tab === "hora" && selectedHora ? `${selectedHora} — ` : ""}
                    {tab === "periodo" && selectedPeriodo ? periodoLabels[selectedPeriodo] + " — " : ""}
                    {selectedDate ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(selectedDate)) : ""}
                  </button>
                  <h2 className="text-lg font-semibold text-[#262B58] mb-2">Selecione um psicólogo</h2>
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                    {loadingPsicologos && <div className="text-center text-xs text-gray-400">Carregando psicólogos...</div>}
                    {error && <div className="text-center text-xs text-red-500">{error}</div>}
                    {!loadingPsicologos && !error && Array.isArray(psicologosDisponiveis) && psicologosDisponiveis.length === 0 && (
                      <div className="text-center text-xs text-gray-400">Nenhum psicólogo disponível para o filtro selecionado.</div>
                    )}
                    {Array.isArray(psicologosDisponiveis) && psicologosDisponiveis.map((psicologo: PsicologoDisponivel, idx: number) => {
                      // Mapeia os campos conforme o objeto retornado da API, priorizando os campos minúsculos
                      const nome = psicologo.nome ?? psicologo.Nome ?? "";
                      const id = psicologo.id ?? psicologo.Id ?? "";
                      // Busca AreasAtuacao dentro de ProfessionalProfiles
                      let areaAtuacao: string | null = null;
                      if (Array.isArray(psicologo.ProfessionalProfiles) && psicologo.ProfessionalProfiles.length > 0) {
                        // Pega o primeiro perfil profissional válido
                        const profile = psicologo.ProfessionalProfiles[0];
                        areaAtuacao = profile?.AreasAtuacao ?? null;
                      } else {
                        areaAtuacao = psicologo.areasAtuacao ?? psicologo.AreasAtuacao ?? null;
                      }
                      if (tab === "hora") {
                        console.log('[DEBUG][psicologo por hora]', psicologo);
                      }
                      const imageUrl = psicologo.Image && psicologo.Image[0] && psicologo.Image[0].Url ? psicologo.Image[0].Url : "/assets/avatar-placeholder.svg";
                      const horarios = Array.isArray(psicologo.horarios) ? psicologo.horarios : [];
                      if (horarios.length === 0 && !psicologo.horario) return null;
                      // Evita duplicidade de psicólogos por data (hora)
                      if (
                        tab === "hora" &&
                        psicologosDisponiveis.findIndex(p => (p.id ?? p.Id) === id && (p.nome ?? p.Nome) === nome) !== idx
                      ) {
                        return null;
                      }
                      return (
                        <motion.div
                          key={id + nome + idx}
                          layout
                          initial={false}
                          className="bg-[#AEB8FF] rounded-lg mb-2"
                        >
                          <button
                            className="flex items-center w-full min-h-[44px] px-3 py-2 gap-3 focus:outline-none cursor-pointer"
                            onClick={() => {
                              setAccordionOpen(accordionOpen === idx ? null : idx);
                            }}
                            aria-expanded={accordionOpen === idx}
                            aria-controls={`accordion-content-${idx}`}
                          >
                            <Image
                              src={imageUrl}
                              alt={nome}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 text-left flex flex-col">
                              <div className="font-semibold text-white">{nome}</div>
                              <div className="text-xs text-white mt-1">{areaAtuacao ? areaAtuacao : "Área de atuação não informada"}</div>
                            </div>
                            <span className="text-white text-xl font-bold">
                              {accordionOpen === idx ? "−" : "+"}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {accordionOpen === idx && (
                              <motion.div
                                key="content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden px-3 pb-3"
                              >
                                <hr className="border-t border-[#E0E3FF] my-2" />
                                <div className="flex justify-between items-center mb-2 mt-2">
                                  <button
                                    className="w-full md:w-[300px] h-6 rounded-lg px-2 flex items-center justify-center gap-1 bg-[#F2F4FD] opacity-100 text-xs text-[#262B58] font-semibold transition-colors hover:bg-[#e0e3ff] active:bg-[#d1d5fa] cursor-pointer"
                                    onClick={() => {
                                      setModalPerfilPsicologoId(id ?? null);
                                      setModalPerfilPsicologo(psicologo);
                                      setModalPerfilOpen(true);
                                    }}
                                    type="button"
                                  >
                                    Ver perfil completo
                                  </button>
                                  <ModalPerfilPsicologo
                                    open={modalPerfilOpen}
                                    onClose={() => setModalPerfilOpen(false)}
                                    psicologo={psicologoCompleto ?? modalPerfilPsicologo}
                                  />
                                </div>
                                {/* Tags de horários lado a lado (exibe todos os horários disponíveis) */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {horarios.length > 0
                                    ? horarios.map((h, hIdx) => (
                                        <button
                                          key={h.horario + hIdx}
                                          className={
                                            `w-[53px] h-[32px] rounded-[4px] px-[4px] flex items-center justify-center relative bg-[#EBEDEF] font-normal text-[14px] leading-[24px] text-[#49525A] font-[fira-sans] border-none transition-all duration-200 cursor-pointer` +
                                            (tagSelecionada && (tagSelecionada.psicologoIdx !== idx || tagSelecionada.horarioIdx !== hIdx) ? ' opacity-60' : ' hover:bg-[#E0E3FF]') +
                                            (tagSelecionada && tagSelecionada.psicologoIdx === idx && tagSelecionada.horarioIdx === hIdx ? ' bg-[#6A994E] text-white' : '')
                                          }
                                          style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}
                                          onClick={() => {
                                            if (tagSelecionada && tagSelecionada.psicologoIdx === idx && tagSelecionada.horarioIdx === hIdx) {
                                              setTagSelecionada(null);
                                            } else {
                                              console.log('[DEBUG][CLICK HORARIO]', { h, psicologo });
                                              setTagSelecionada({ psicologoIdx: idx, horarioIdx: hIdx });
                                              setModalData({
                                                psicologo: {
                                                  ...psicologo,
                                                  agendaId: h.id || '' // agendaId do horário selecionado
                                                },
                                                data: (() => {
                                                  if (!selectedDate) return '';
                                                  const [yyyy, mm, dd] = selectedDate.split('-');
                                                  return `${yyyy}-${mm}-${dd}`;
                                                })(),
                                                hora: h.horario || '',
                                              });
                                              setModalOpen(true);
                                            }
                                          }}
                                          disabled={false}
                                        >
                                          <span className="w-full text-center">{h.horario}</span>
                                          {tagSelecionada && (tagSelecionada.psicologoIdx !== idx || tagSelecionada.horarioIdx !== hIdx) && (
                                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <span className="text-black text-lg font-bold">×</span>
                                            </span>
                                          )}
                                        </button>
                                      ))
                                    : (
                                        <button
                                          key={psicologo.horario}
                                          className={
                                            `w-[53px] h-[32px] rounded-[4px] px-[4px] flex items-center justify-center relative bg-[#EBEDEF] font-normal text-[14px] leading-[24px] text-[#49525A] font-[fira-sans] border-none transition-all duration-200 cursor-pointer` +
                                            (tagSelecionada && tagSelecionada.psicologoIdx !== idx ? ' opacity-60' : ' hover:bg-[#E0E3FF]') +
                                            (tagSelecionada && tagSelecionada.psicologoIdx === idx ? ' bg-[#6A994E] text-white' : '')
                                          }
                                          style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif' }}
                                          onClick={() => {
                                            if (tagSelecionada && tagSelecionada.psicologoIdx === idx) {
                                              setTagSelecionada(null);
                                            } else {
                                              setTagSelecionada({ psicologoIdx: idx, horarioIdx: 0 });
                                              setModalData({
                                                psicologo: {
                                                  ...psicologo,
                                                  agendaId: psicologo.agendaId || psicologo.id || psicologo.Id || '' // agendaId do único horário, fallback para id
                                                },
                                                data: (() => {
                                                  if (!selectedDate) return '';
                                                  const [yyyy, mm, dd] = selectedDate.split('-');
                                                  return `${yyyy}-${mm}-${dd}`;
                                                })(),
                                                hora: psicologo.horario || '',
                                              });
                                              setModalOpen(true);
                                            }
                                          }}
                                          disabled={false}
                                        >
                                          <span className="w-full text-center">{psicologo.horario}</span>
                                          {tagSelecionada && tagSelecionada.psicologoIdx !== idx && (
                                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                              <span className="text-black text-lg font-bold">×</span>
                                            </span>
                                          )}
                                        </button>
                                    )}
                                  {/* Botão para limpar seleção, aparece se houver seleção */}
                                  {tagSelecionada && tagSelecionada.psicologoIdx === idx && (
                                    <button
                                      className="text-xs text-[#262B58] underline hover:text-[#4b51a2] font-semibold cursor-pointer ml-2"
                                      onClick={() => setTagSelecionada(null)}
                                    >
                                      Limpar seleção
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                  <ModalCadastroAgendamento
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onConfirm={() => {
                      // Garante que agendaId, pacienteId e psicologoId estão presentes
                      const agendaId = modalData?.psicologo?.agendaId;
                      const psicologoId = modalData?.psicologo?.Id || modalData?.psicologo?.id;
                      // pacienteId deve ser obtido do contexto/autenticação do usuário logado
                      const payload = {
                        agendaId,
                        psicologoId,
                        data: modalData?.data,
                        hora: modalData?.hora
                      };
                      console.log('[AGENDAMENTO][CONFIRM][PAYLOAD]', payload);
                      // Aqui você pode disparar a requisição de reserva usando o payload
                      setModalOpen(false);
                    }}
                    psicologo={{
                      Nome: modalData?.psicologo?.Nome || '',
                      AvatarUrl: (modalData?.psicologo?.Image && modalData?.psicologo?.Image[0]?.Url)  || '',
                      Data: modalData?.data || '',
                      Horario: modalData?.hora || '',
                      Id: modalData?.psicologo?.Id || ''
                    }}
                    psicologoAgendaId={modalData?.psicologo?.agendaId || ''}
                    source="agendamento-rapido"
                  />
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const periodoLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite"
};
