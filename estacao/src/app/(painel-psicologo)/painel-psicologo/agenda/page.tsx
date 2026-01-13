"use client";
import React, { useState } from "react";
import SidebarPsicologo from "../SidebarPsicologo";
import { useUpdateAgendaStatusDisponivel, useListarHorariosPorDia } from '@/hooks/psicologos/configAgenda';
import toast from "react-hot-toast";
import Image from "next/image";

type HorarioSlot = {
  Id: string;
  Horario: string;
  Status: string;
};

export default function AgendaConfigPage() {
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  
  // Calcula a data máxima permitida (60 dias a partir de hoje)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 60);
  
  // Gera os dias do mês selecionado e preenche a primeira e última linha para garantir 7 cards por linha
  const daysOfMonth = (() => {
    const days = [];
    const date = new Date(calendarYear, calendarMonth, 1);
    while (date.getMonth() === calendarMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    // Preencher início da primeira semana com dias do mês anterior
    const firstDayOfWeek = days[0].getDay();
    if (firstDayOfWeek > 0) {
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const prevMonthLastDate = new Date(prevYear, prevMonth + 1, 0).getDate();
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        days.unshift(new Date(prevYear, prevMonth, prevMonthLastDate - i));
      }
    }
    // Preencher fim da última semana com dias do mês seguinte
    const lastDayOfWeek = days[days.length - 1].getDay();
    if (lastDayOfWeek < 6) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const nextDate = new Date(nextYear, nextMonth, 1);
      for (let i = lastDayOfWeek + 1; i <= 6; i++) {
        days.push(new Date(nextDate));
        nextDate.setDate(nextDate.getDate() + 1);
      }
    }
    return days;
  })();
  
  // Funções para navegar entre meses
  const goToPreviousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    // Verifica se pode ir para o próximo mês (não pode ultrapassar 60 dias)
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const firstDayOfNextMonth = new Date(nextYear, nextMonth, 1);
    
    // Permite navegar se o primeiro dia do próximo mês não ultrapassar 60 dias
    if (firstDayOfNextMonth <= maxDate) {
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };
  
  // Verifica se pode ir para o mês anterior (não pode ir para meses passados)
  const canGoToPreviousMonth = () => {
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0);
    return lastDayOfPrevMonth >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };
  
  // Verifica se pode ir para o próximo mês
  const canGoToNextMonth = () => {
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const firstDayOfNextMonth = new Date(nextYear, nextMonth, 1);
    return firstDayOfNextMonth <= maxDate;
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [recorrente, setRecorrente] = useState(false);

  const { horariosPorDia, isLoading: isLoadingHorariosPorDia, isError: isErrorHorariosPorDia, error: errorHorariosPorDia } =
    useListarHorariosPorDia(
      selectedDate
        ? { data: selectedDate.toISOString().slice(0, 10).replace(/\//g, '-') }
        : { data: "" }
    );

  const { updateAgendaStatusDisponivel, isPending } = useUpdateAgendaStatusDisponivel();
  const { refetch: refetchHorariosPorDia } = useListarHorariosPorDia(selectedDate ? { data: selectedDate.toISOString().slice(0, 10).replace(/\//g, '-') }
      : { data: "" }
  );

  function handleSlotClick(slot: { Id: string; Status: string; Horario: string }) {
    if (
      slot.Status === "Reservado" ||
      slot.Status === "Concluído" ||
      slot.Status === "Andamento" ||
      slot.Status === "Indisponivel"
    ) return;
    if (selectedSlots.includes(slot.Id)) {
      setSelectedSlots(prev => prev.filter(id => id !== slot.Id));
    } else {
      setSelectedSlots(prev => [...prev, slot.Id]);
    }
  }

  function handleCalendarDateClick(date: Date) {
    if (
      selectedDate &&
      date.toDateString() === selectedDate.toDateString() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    ) {
      setSelectedDate(null);
      setSelectedSlots([]);
      return;
    }
    setSelectedDate(date);
    setSelectedSlots([]);
  }

  function handleCancelSlots() {
    setSelectedDate(null);
    setSelectedSlots([]);
  }

  function getHorariosSelecionadosPayload(
    horariosSelecionados: Array<{ Id: string; Horario: string; Status: string }>,
    recorrente: boolean,
    data: string
  ) {
    return horariosSelecionados.map(horario => ({
      HorarioId: horario.Id,
      Horario: horario.Horario,
      Status: horario.Status,
      Data: data,
      Recorrente: recorrente
    }));
  }

  async function handleUpdateSlots() {
    const horariosSelecionados = (horariosPorDia ?? []).filter((slot: HorarioSlot) =>
      selectedSlots.includes(slot.Id)
    ).map((slot: HorarioSlot) => ({
      Id: slot.Id,
      Horario: slot.Horario,
      Status: slot.Status
    }));

    const dataSelecionada = selectedDate ? selectedDate.toISOString().slice(0, 10) : "";

    const payload = getHorariosSelecionadosPayload(
      horariosSelecionados,
      recorrente,
      dataSelecionada
    );

    await updateAgendaStatusDisponivel(payload);
    toast.success("Horários atualizados!");

    setSelectedDate(null);
    setSelectedSlots([]);
    await refetchHorariosPorDia();
  }

  function isDayBlocked(date: Date) {
    // Bloqueia datas passadas
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date < todayStart) {
      return true;
    }
    // Bloqueia datas além de 60 dias
    if (date > maxDate) {
      return true;
    }
    return false;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  function getMonthName(month: number) {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return meses[month];
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-7xl mx-auto w-full flex">
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 w-full">
          <h1 className="text-center text-lg sm:text-[22px] fira-sans font-semibold mb-4 sm:mb-6 text-primary">
            Configurar agenda do mês
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-24 sm:mb-8">
            <div className={`bg-white shadow-lg rounded-xl p-4 sm:p-6 ${isMobile ? "mb-12" : ""}`}>
              <div className="mb-4 flex items-center justify-between">
                <span className="fira-sans font-medium text-base sm:text-[18px] leading-[24px] align-middle text-[#26220D]">
                  Selecione uma data
                </span>
                {/* Tooltip alinhado à direita, inline */}
                <div className="relative flex items-center">
                  <div className="group flex items-center">
                    <Image
                      src="/icons/info-azul.svg"
                      alt="Info"
                      width={24}
                      height={24}
                      className="w-6 h-6 ml-2 cursor-pointer"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 group-hover:block hidden z-10">
                      <div className="bg-yellow-200 border border-yellow-400 rounded shadow-lg px-3 py-2 text-xs text-yellow-900 w-[220px] text-left"
                        style={{ left: '-230px', position: 'absolute' }}>
                        Selecione um dia no calendário para visualizar e configurar os horários disponíveis para atendimento. Clique nos horários para desbloquear ou bloquear sua agenda.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  onClick={goToPreviousMonth}
                  disabled={!canGoToPreviousMonth()}
                  className={`flex items-center justify-center w-8 h-8 rounded transition ${
                    canGoToPreviousMonth()
                      ? "bg-[#6366f1] text-white hover:bg-[#4f46e5] cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Mês anterior"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span
                  className="text-[#606C76] text-[12px] font-normal fira-sans"
                  style={{
                    fontWeight: 400,
                    fontStyle: "normal",
                    lineHeight: "16px",
                    letterSpacing: "0%",
                  }}
                >
                  {getMonthName(calendarMonth)} {calendarYear}
                </span>
                <button
                  onClick={goToNextMonth}
                  disabled={!canGoToNextMonth()}
                  className={`flex items-center justify-center w-8 h-8 rounded transition ${
                    canGoToNextMonth()
                      ? "bg-[#6366f1] text-white hover:bg-[#4f46e5] cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  aria-label="Próximo mês"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 sm:gap-[12px]">
                {daysOfMonth.map((date, idx) => {
                  const blocked = isDayBlocked(date) && date.getMonth() === calendarMonth;
                  const isSelected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString() &&
                    calendarMonth === selectedDate.getMonth() &&
                    calendarYear === selectedDate.getFullYear();

                  const isCurrentMonth = date.getMonth() === calendarMonth;

                  // Aumenta um pouco o tamanho dos cards
                  const baseStyle = "w-full h-[40px] sm:h-[48px] rounded-[4px] border text-xs sm:text-[13px] flex flex-col items-center justify-center font-normal px-1 sm:px-[8px] py-[4px] transition";
                  let bgColor = isCurrentMonth ? "bg-white" : "bg-base-100";
                  let borderColor = blocked ? "border-[#ADB6BD]" : "border-[#49525A]";
                  let textColor = isCurrentMonth ? "text-[#606C76]" : "text-base-content/30";

                  if (isSelected) {
                    bgColor = "bg-[#6366f1]";
                    textColor = "text-white";
                    borderColor = "border-[#6366f1]";
                  }
                  if (blocked) {
                    textColor = "text-[#ADB6BD]";
                  }

                  return (
                    <button
                      key={date.toISOString() + idx}
                      className={`${baseStyle} ${bgColor} ${borderColor} ${textColor} ${blocked || !isCurrentMonth ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10 cursor-pointer"}`}
                      onClick={() => isCurrentMonth && !blocked && handleCalendarDateClick(date)}
                      disabled={blocked || !isCurrentMonth}
                      style={isSelected ? { boxShadow: "0 0 0 2px #6366f1" } : {}}
                    >
                      <span>{date.getDate()}</span>
                      <span className="text-xs text-base-content/70">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px] flex flex-col">
              {selectedDate ? (
                <>
                  <h3 className="fira-sans font-medium text-base sm:text-[18px] leading-[24px] align-middle text-[#26220D] mb-2">
                    Horários do dia {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                  </h3>
                  <p
                    className="text-[#606C76] text-[12px] font-normal fira-sans mb-4"
                    style={{
                      fontWeight: 400,
                      fontStyle: "normal",
                      lineHeight: "16px",
                      letterSpacing: "0%",
                    }}
                  >
                    Desbloqueie o(s) horário(s) que deseja atender
                  </p>
                  {isLoadingHorariosPorDia ? (
                    <div className="flex items-center justify-center h-32">
                      <span>Carregando horários...</span>
                    </div>
                  ) : isErrorHorariosPorDia ? (
                    <div className="flex items-center justify-center h-32 text-error">
                      <span>{errorHorariosPorDia || "Erro ao carregar horários."}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-4">
                      {(horariosPorDia ?? [])
                        .slice()
                        .sort((a: HorarioSlot, b: HorarioSlot) => {
                          const [ah, am] = a.Horario.split(":").map(Number);
                          const [bh, bm] = b.Horario.split(":").map(Number);
                          return ah !== bh ? ah - bh : am - bm;
                        })
                        .map((slot: HorarioSlot) => {
                          let bloqueadoPorHorario = false;
                          if (
                            selectedDate &&
                            selectedDate.toDateString() === today.toDateString()
                          ) {
                            const [slotHour, slotMinute] = slot.Horario.split(":").map(Number);
                            const now = new Date();
                            if (
                              slotHour < now.getHours() ||
                              (slotHour === now.getHours() && slotMinute <= now.getMinutes())
                            ) {
                              bloqueadoPorHorario = true;
                            }
                          }

                          const isSelected = !bloqueadoPorHorario && selectedSlots.includes(slot.Id);
                          let bg = "";
                          let border = "";
                          let textColor = "";
                          let cursor = "cursor-pointer";
                          let disabled = false;
                          const text = slot.Status || "Disponível";

                          if (bloqueadoPorHorario) {
                            bg = "bg-gray-200";
                            border = "border-gray-300";
                            textColor = "text-gray-400";
                            cursor = "cursor-not-allowed";
                            disabled = true;
                          } else if (slot.Status === "Disponivel") {
                            bg = "bg-[#F1F6EE]";
                            border = "border-[#5D8744]";
                            textColor = "text-[#5D8744]";
                          } else if (slot.Status === "Indisponivel") {
                            bg = "bg-red-100";
                            border = "border-red-600";
                            textColor = "text-red-800";
                            cursor = "cursor-not-allowed";
                            disabled = true;
                          } else if (slot.Status === "Andamento") {
                            bg = "bg-yellow-100";
                            border = "border-yellow-500";
                            textColor = "text-yellow-800";
                            cursor = "cursor-not-allowed";
                            disabled = true;
                          } else if (slot.Status === "Concluido") {
                            bg = "bg-[#EBEDEF]";
                            border = "border-[#ADB6BD]";
                            textColor = "text-[#ADB6BD]";
                            cursor = "cursor-not-allowed";
                            disabled = true;
                          } else if (slot.Status === "Reservado") {
                            bg = "bg-[#FFF8E0]";
                            border = "border-[#CD9C00]";
                            textColor = "text-[#CD9C00]";
                            cursor = "cursor-not-allowed";
                            disabled = true;
                          } else if (slot.Status === "Bloqueado") {
                            bg = "bg-base-200";
                            border = "border-[#75838F]";
                            textColor = isSelected ? "text-white" : "text-[#75838F]";
                            disabled = false;
                          } else {
                            bg = "bg-base-100";
                            border = "border-base-300";
                            textColor = "text-base-content";
                          }

                          if (isSelected) {
                            bg = "bg-blue-600";
                            border = "border-blue-600";
                            textColor = slot.Status === "Bloqueado" ? "text-white" : "text-white";
                          }

                          return (
                            <button
                              key={slot.Id}
                              className={`flex flex-col items-center justify-center rounded-[4px] shadow p-1 border text-xs font-semibold ${bg} ${border} transition ${cursor} w-full h-[48px]`}
                              disabled={disabled}
                              onClick={() => !disabled && handleSlotClick(slot)}
                              style={isSelected ? { boxShadow: "0 0 0 2px #2563eb" } : {}}
                            >
                              <span className={textColor}>{slot.Horario}</span>
                              <span className={`text-[10px] mt-1 ${isSelected && slot.Status === "Bloqueado" ? "text-white" : textColor}`}>
                                {text}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  <div className="flex items-center gap-[12px] mb-4">
                    <label className="swap swap-rotate order-1">
                      <input
                        type="checkbox"
                        id="recorrente"
                        checked={recorrente}
                        onChange={() => setRecorrente((v) => !v)}
                        className="sr-only"
                      />
                      <span
                        className="block w-[42px] h-[24px] rounded-full transition-colors duration-200 bg-[#6366f1] relative cursor-pointer opacity-100"
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                            recorrente ? "translate-x-5" : ""
                          }`}
                        />
                      </span>
                    </label>
                    <label htmlFor="recorrente" className="font-medium text-sm sm:text-base text-base-content order-2 cursor-pointer select-none">
                      Repetir estes horários escolhidos em todos os dias da semana durante este mês
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-auto">
                    <button
                      className="w-full sm:w-auto px-4 py-2 rounded bg-base-200 text-sm sm:text-base"
                      onClick={handleCancelSlots}
                    >
                      Cancelar
                    </button>
                    <button
                      className="w-full sm:w-[97px] h-[40px] rounded-[6px] opacity-100 px-4 bg-[#8494E9] flex items-center justify-center gap-[12px] text-white text-sm sm:text-base"
                      style={{ paddingRight: 16, paddingLeft: 16 }}
                      onClick={handleUpdateSlots}
                      disabled={selectedSlots.length === 0 || isPending}
                    >
                      {isPending ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-base-content/60">
                  <span>Selecione uma data no calendário</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}