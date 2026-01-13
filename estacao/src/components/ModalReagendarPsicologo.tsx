"use client";
import { useReservaSessao } from '@/hooks/reservaSessao';
import toast from "react-hot-toast";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HorarioAgendamento } from '@/types/agendamentoTypes';
import { agendamentoService } from '@/services/agendamentoService';
import { useQueryClient } from '@tanstack/react-query';
import VideoPIP from './VideoPIP';
import { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import BreadcrumbsVoltar from './BreadcrumbsVoltar';
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalReagendarPsicologoProps {
  isOpen: boolean;
  onClose: () => void;
  consultaIdAtual: string;
  psicologoId: string;
  pacienteId?: string;
  remoteVideoTrack?: IRemoteVideoTrack | null;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatDateToYMD(date: Date) {
  return date.toISOString().split("T")[0];
}

function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function getBrasiliaDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const brDate = new Date(utc - (3 * 60 * 60 * 1000));
  brDate.setHours(0, 0, 0, 0);
  return brDate;
}

const ModalReagendarPsicologo: React.FC<ModalReagendarPsicologoProps> = ({ 
  isOpen, 
  onClose, 
  consultaIdAtual,
  psicologoId,
  remoteVideoTrack
}) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);
  
  const queryClient = useQueryClient();
  const { reagendarReservaSessao } = useReservaSessao(
    isOpen && consultaIdAtual && consultaIdAtual.trim() !== '' ? consultaIdAtual : undefined
  );

  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const todayBrasilia = getBrasiliaDate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioAgendamento[]>([]);
  const [ultimaDataBuscada, setUltimaDataBuscada] = useState<string | null>(null);

  const calendarYear = todayBrasilia.getFullYear();
  const calendarMonth = todayBrasilia.getMonth() + currentMonthOffset;
  
  const daysOfMonth = (() => {
    const days: Date[] = [];
    const date = new Date(calendarYear, calendarMonth, 1);
    while (date.getMonth() === calendarMonth) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    if (days.length === 0) return days;
    const firstDayOfWeek = days[0]?.getDay?.() ?? 0;
    if (firstDayOfWeek > 0) {
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const prevMonthLastDate = new Date(prevYear, prevMonth + 1, 0).getDate();
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        days.unshift(new Date(prevYear, prevMonth, prevMonthLastDate - i));
      }
    }
    const lastDayOfWeek = days[days.length - 1]?.getDay?.() ?? 0;
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

  // Inicializa a data quando o modal abre
  useEffect(() => {
    if (isOpen && psicologoId) {
      const hojeBrasilia = getBrasiliaDate();
      const hojeString = formatDateToYMD(hojeBrasilia);
      const dataAtualString = selectedDate ? formatDateToYMD(selectedDate) : null;
      if (dataAtualString !== hojeString) {
        setSelectedDate(hojeBrasilia);
        setSelectedHorario("");
      }
    } else if (!isOpen) {
      setSelectedDate(null);
      setSelectedHorario("");
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      setUltimaDataBuscada(null);
    }
  }, [isOpen, psicologoId, selectedDate]);

  // Busca horários disponíveis para o dia selecionado
  const fetchHorariosParaData = useCallback(async (date: Date) => {
    if (!psicologoId) {
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      return;
    }

    const ymd = formatDateToYMD(date);
    
    if (ultimaDataBuscada === ymd && loadingAgenda) {
      return;
    }
    
    setUltimaDataBuscada(ymd);
    setLoadingAgenda(true);
    setHorariosDisponiveis([]);
    
    try {
      const response = await agendamentoService().listarAgendasPorDataPsicologo(psicologoId, ymd);
      const agendas = response.data || [];
      
      type AgendaResponse = {
        id?: string;
        Id?: string;
        horario?: string;
        Horario?: string;
        status?: string;
        Status?: string;
      };
      
      const horariosDisponiveisArr = Array.isArray(agendas)
        ? agendas
            .filter((h: unknown): h is AgendaResponse => {
              if (!h || typeof h !== 'object') return false;
              const agenda = h as AgendaResponse;
              const status = agenda.status || agenda.Status || '';
              return status === 'Disponivel';
            })
            .map((h: AgendaResponse): HorarioAgendamento => ({
              Id: h.id || h.Id || '',
              Horario: h.horario || h.Horario || '',
              Status: 'Disponivel'
            }))
            .sort((a: HorarioAgendamento, b: HorarioAgendamento) => {
              return (a.Horario || '').localeCompare(b.Horario || '');
            })
        : [];
      
      setHorariosDisponiveis(horariosDisponiveisArr);
    } catch (error: unknown) {
      console.error('Erro ao buscar horários disponíveis:', error);
      setHorariosDisponiveis([]);
      setUltimaDataBuscada(null);
      setLoadingAgenda(false);
      toast.error('Erro ao buscar horários disponíveis');
    } finally {
      setLoadingAgenda(false);
    }
  }, [psicologoId, ultimaDataBuscada, loadingAgenda]);

  const selectedDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
  
  useEffect(() => {
    if (isOpen && selectedDate && psicologoId && selectedDateString !== ultimaDataBuscada) {
      fetchHorariosParaData(selectedDate);
    }
  }, [selectedDate, isOpen, psicologoId, selectedDateString, ultimaDataBuscada, fetchHorariosParaData]);

  const handleReagendarConsulta = async () => {
    if (!selectedDate || !selectedHorario || !consultaIdAtual) {
      toast.error('Por favor, selecione uma data e horário');
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const agendaIdNova = selectedHorario;
      
      if (typeof reagendarReservaSessao === 'function') {
        await reagendarReservaSessao(consultaIdAtual, agendaIdNova);
      } else {
        throw new Error('Função de reagendamento não disponível');
      }

      setSuccessMsg("Consulta reagendada com sucesso!");
      
      // Invalida queries relacionadas incluindo ciclo plano para atualizar consultas disponíveis
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
        queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['consultas'] }),
        queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
        queryClient.invalidateQueries({ queryKey: ['ciclos-plano'] }),
        queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
        queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
        queryClient.invalidateQueries({ queryKey: ['userMe'] }),
        queryClient.refetchQueries({ queryKey: ['ciclo-ativo'] }),
        queryClient.refetchQueries({ queryKey: ['userPlano'] }),
      ]);

      setTimeout(() => {
        onClose();
        setSuccessMsg("");
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao reagendar consulta';
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* MOBILE */}
          <motion.div
            className="fixed inset-0 bg-white z-[9999] sm:hidden flex flex-col font-sans"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3 }}
          >
            {/* Botão X no topo direito - acima de tudo */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition z-[10000]"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="px-4 pt-12 pb-2 flex-1 overflow-y-auto relative">
              {/* BreadcrumbsVoltar */}
              <div className="mb-4">
                <BreadcrumbsVoltar />
              </div>
              
              {/* Título maior */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Reagendar sessão
              </h1>
              
              {/* Subtítulo maior */}
              <p className="text-gray-700 mb-8 text-lg">
                Escolha o melhor dia e horário para agendar a próxima sessão com o(a) paciente
              </p>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} 
                    className="p-3 hover:bg-gray-100 rounded text-lg" 
                    disabled={currentMonthOffset === 0}
                  >
                    ←
                  </button>
                  <h4 className="font-semibold text-lg">{monthNames[calendarMonth]} — {calendarYear}</h4>
                  <button 
                    onClick={() => setCurrentMonthOffset((prev) => prev + 1)} 
                    className="p-3 hover:bg-gray-100 rounded text-lg"
                  >
                    →
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-base font-medium text-gray-500 mb-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {daysOfMonth.map((date: Date, index: number) => {
                    const ymd = formatDateToYMD(date);
                    const isDisabled = isPastDate(date);
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                    const isToday = ymd === formatDateToYMD(new Date());
                    
                    return (
                      <button
                        key={index}
                        disabled={isDisabled}
                        onClick={async () => {
                          if (!isDisabled) {
                            const newDate = new Date(date);
                            const newDateString = formatDateToYMD(newDate);
                            const currentDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
                            
                            if (newDateString !== currentDateString) {
                              setSelectedHorario("");
                              setHorariosDisponiveis([]);
                              setLoadingAgenda(true);
                              setSelectedDate(newDate);
                              
                              if (psicologoId) {
                                fetchHorariosParaData(newDate).catch((error) => {
                                  console.error('Erro ao buscar horários:', error);
                                  setLoadingAgenda(false);
                                });
                              }
                            }
                          }
                        }}
                        className={`w-10 h-10 text-base rounded transition-all font-medium
                          ${isDisabled ? "text-gray-300 cursor-not-allowed" : ""}
                          ${isSelected ? "bg-[#8494E9] text-white" : ""}
                          ${isToday && (!isSelected) && !isDisabled ? "bg-blue-100 text-blue-700" : ""}
                          ${!isSelected && !isToday && !isDisabled ? "hover:bg-gray-100" : ""}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Escolha um horário
                </label>
                <select
                  key={`horario-select-mobile-${selectedDateString || 'no-date'}`}
                  value={selectedHorario}
                  onChange={(e) => setSelectedHorario(e.target.value)}
                  disabled={!selectedDate || loadingAgenda || horariosDisponiveis.length === 0}
                  className={`w-full p-4 border-2 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-[#8494E9] ${
                    !selectedDate || loadingAgenda || horariosDisponiveis.length === 0 
                      ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" 
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#8494E9]"
                  }`}
                >
                  <option value="" disabled>
                    {selectedDate 
                      ? (loadingAgenda 
                          ? "Carregando horários..." 
                          : horariosDisponiveis.length === 0 
                            ? "Nenhum horário disponível" 
                            : "Selecione um horário") 
                      : "Selecione uma data primeiro"}
                  </option>
                  {horariosDisponiveis.map((horarioObj) => (
                    <option key={horarioObj.Id} value={horarioObj.Id}>
                      {horarioObj.Horario || "Horário não informado"}
                    </option>
                  ))}
                </select>
                
                {selectedDate && !loadingAgenda && horariosDisponiveis.length === 0 && (
                  <div className="mt-2 p-3 text-center text-gray-500 text-sm bg-gray-50 rounded-md">
                    Nenhum horário disponível para esta data
                  </div>
                )}
                
                {selectedDate && loadingAgenda && (
                  <div className="mt-2 p-3 text-center text-gray-500 text-sm bg-gray-50 rounded-md flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Carregando horários...</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-white flex-shrink-0">
              <button
                onClick={handleReagendarConsulta}
                disabled={!selectedDate || !selectedHorario || isLoading}
                className={`w-full h-14 font-semibold text-lg rounded-lg transition mb-3 ${
                  selectedDate && selectedHorario && !isLoading 
                    ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isLoading ? "Agendando..." : "Agendar"}
              </button>
              <button
                onClick={onClose}
                className="w-full h-14 border-2 border-[#6D75C0] text-[#6D75C0] font-semibold text-lg rounded-lg hover:bg-[#E6E9FF] transition"
              >
                Cancelar
              </button>
            </div>
            
            {/* PIP do paciente - em cima do modal mobile (z-index maior) */}
            {remoteVideoTrack && (
              <div className="fixed bottom-4 right-4 w-[180px] h-[135px] z-[10001]">
                <VideoPIP videoTrack={remoteVideoTrack} label="Paciente" />
              </div>
            )}
            
            {successMsg && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-700 px-4 py-2 rounded shadow z-[10002]">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded shadow z-[10002]">
                {errorMsg}
              </div>
            )}
          </motion.div>

          {/* DESKTOP - Full Screen */}
          <motion.div
            className="fixed inset-0 bg-white z-[9999] hidden sm:flex flex-col font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Botão X no topo direito - acima de tudo */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 sm:right-6 xl:right-24 2xl:right-48 w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition z-[10000]"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="w-full h-full flex flex-col p-0 bg-white">
              {/* Header fixo com altura do header real */}
              <div className="h-[70px] flex-shrink-0"></div>
              
              <div className="flex-1 flex flex-col bg-white pt-8 pb-6 overflow-y-auto relative">
                <div className="px-4 sm:px-6 xl:px-24 2xl:px-48">
                  {/* Container em bloco alinhado */}
                  <div className="w-full">
                    <div className="max-w-[1200px] mx-auto">
                      {/* BreadcrumbsVoltar */}
                      <div className="mb-4">
                        <BreadcrumbsVoltar />
                      </div>
                      
                      {/* Título maior */}
                      <h1 className="w-full text-left text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                        Reagendar sessão
                      </h1>
                      
                      {/* Subtítulo maior */}
                      <p className="w-full text-left text-lg sm:text-xl text-gray-700 mb-8">
                        Escolha o melhor dia e horário para agendar a próxima sessão com o(a) paciente
                      </p>
                      
                      <div className="flex flex-row gap-12">
                    {/* Calendário à esquerda - maior */}
                    <div className="w-[480px] bg-white rounded-lg border border-[#E6E9FF] p-8 flex flex-col items-center justify-start shadow-sm">
                      <div className="flex items-center justify-between w-full mb-6">
                        <button 
                          onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} 
                          className="p-3 hover:bg-gray-100 rounded text-lg" 
                          disabled={currentMonthOffset === 0}
                        >
                          ←
                        </button>
                        <h4 className="font-semibold text-xl text-[#8494E9]">{monthNames[calendarMonth]} — {calendarYear}</h4>
                        <button 
                          onClick={() => setCurrentMonthOffset((prev) => prev + 1)} 
                          className="p-3 hover:bg-gray-100 rounded text-lg"
                        >
                          →
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2 text-center text-base font-medium text-gray-500 mb-3 w-full">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                          <div key={day} className="py-2">{day}</div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-2 w-full">
                        {daysOfMonth.map((date: Date, index: number) => {
                          const ymd = formatDateToYMD(date);
                          const isDisabled = isPastDate(date);
                          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                          const isToday = ymd === formatDateToYMD(new Date());
                          
                          return (
                            <button
                              key={index}
                              disabled={isDisabled}
                              onClick={async () => {
                                if (!isDisabled) {
                                  const newDate = new Date(date);
                                  const newDateString = formatDateToYMD(newDate);
                                  const currentDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
                                  
                                  if (newDateString !== currentDateString) {
                                    setSelectedHorario("");
                                    setHorariosDisponiveis([]);
                                    setLoadingAgenda(true);
                                    setSelectedDate(newDate);
                                    
                                    if (psicologoId) {
                                      fetchHorariosParaData(newDate).catch((error) => {
                                        console.error('Erro ao buscar horários:', error);
                                        setLoadingAgenda(false);
                                      });
                                    }
                                  }
                                }
                              }}
                              className={`w-12 h-12 text-base rounded transition-all border font-medium
                                ${isDisabled ? "text-gray-300 cursor-not-allowed" : ""}
                                ${isSelected ? "bg-[#8494E9] text-white border-[#8494E9]" : "border-gray-200"}
                                ${isToday && !isSelected && !isDisabled ? "bg-blue-100 text-blue-700" : ""}
                                ${!isSelected && !isToday && !isDisabled ? "hover:bg-gray-100" : ""}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Select e botões à direita - maior */}
                    <div className="flex-1 flex flex-col justify-start gap-6 items-start max-w-[500px]">
                      <div className="w-full">
                        <label className="block text-lg font-medium text-gray-700 mb-3">
                          Escolha um horário
                        </label>
                        <select
                          key={`horario-select-${selectedDateString || 'no-date'}`}
                          value={selectedHorario}
                          onChange={(e) => setSelectedHorario(e.target.value)}
                          disabled={!selectedDate || loadingAgenda}
                          className={`w-full p-4 border-2 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-[#8494E9] ${
                            !selectedDate || loadingAgenda 
                              ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" 
                              : "bg-white text-gray-700 border-gray-300 hover:border-[#8494E9]"
                          }`}
                        >
                        <option value="" disabled>
                          {selectedDate 
                            ? (loadingAgenda 
                                ? "Carregando horários..." 
                                : horariosDisponiveis.length === 0 
                                  ? "Nenhum horário disponível" 
                                  : "Escolha um horário") 
                            : "Escolha uma data primeiro"}
                        </option>
                        {horariosDisponiveis.map((horarioObj) => (
                          <option key={horarioObj.Id} value={horarioObj.Id}>
                            {horarioObj.Horario || "Horário não informado"}
                          </option>
                        ))}
                      </select>
                      
                        {selectedDate && !loadingAgenda && horariosDisponiveis.length === 0 && (
                          <div className="mt-3 p-4 text-center text-gray-500 text-base bg-gray-50 rounded-md w-full">
                            Nenhum horário disponível para esta data
                          </div>
                        )}
                        
                        {selectedDate && loadingAgenda && (
                          <div className="mt-3 p-4 text-center text-gray-500 text-base bg-gray-50 rounded-md w-full flex items-center justify-center gap-3">
                            <svg className="animate-spin h-5 w-5 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Carregando horários...</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={handleReagendarConsulta}
                        disabled={!selectedDate || !selectedHorario || isLoading}
                        className={`w-full h-14 font-semibold text-lg rounded-lg transition ${
                          selectedDate && selectedHorario && !isLoading 
                            ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" 
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isLoading ? "Agendando..." : "Agendar"}
                      </button>
                      
                      <button
                        onClick={onClose}
                        className="w-full h-14 border-2 border-[#8494E9] text-[#8494E9] font-semibold text-lg rounded-lg bg-white hover:bg-[#F0F2FF] transition"
                      >
                        Cancelar
                      </button>
                    </div>
                    </div>
                    </div>
                  </div>
                </div>
                
                {/* PIP do paciente - em cima do modal (z-index maior) */}
                {remoteVideoTrack && (
                  <div className="fixed bottom-8 right-8 w-[280px] h-[200px] z-[10001]">
                    <VideoPIP videoTrack={remoteVideoTrack} label="Paciente" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModalReagendarPsicologo;
