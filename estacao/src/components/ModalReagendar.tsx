"use client";
import { useReservaSessao } from '@/hooks/reservaSessao';
import toast from "react-hot-toast";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HorarioAgendamento } from '@/types/agendamentoTypes';
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatarDataHora } from "@/utils/formatarDataHora";
import LogoLilas from "@/../public/assets/logo/logo-lilas.svg";
import { useEffect } from "react";
import { agendamentoService } from '@/services/agendamentoService';
import { useQueryClient } from '@tanstack/react-query';
import { useEscapeKey } from "@/hooks/useEscapeKey";


interface PsicologoData {
  nome?: string;
  id?: string;
  Image?: { Url?: string }[];
}

interface ConsultaModalData {
  data?: string;
  horario?: string;
  paciente?: { nome?: string };
  psicologo?: PsicologoData;
}

interface ModalReagendarProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: ConsultaModalData;
  consultaIdAtual: string;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatDateBR(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateToYMD(date: Date) {
  return date.toISOString().split("T")[0];
}

function isPastDate(date: Date) {
  const today = new Date();
  today.setHours(0,0,0,0);
  return date < today;
}



const ModalReagendar: React.FC<ModalReagendarProps> = ({ isOpen, onClose, consulta, consultaIdAtual }) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);
  
  const queryClient = useQueryClient();
  // Hook para reagendar reserva - só executa quando o modal estiver aberto e tiver ID válido
  const { reagendarReservaSessao } = useReservaSessao(
    isOpen && consultaIdAtual && consultaIdAtual.trim() !== '' ? consultaIdAtual : undefined
  );
  // Lógica do calendário igual AgendaConfigPage
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  // Considera o fuso horário de Brasília (GMT-3)
  function getBrasiliaDate() {
    const now = new Date();
    // Ajusta para GMT-3
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brDate = new Date(utc - (3 * 60 * 60 * 1000));
    // Força horário para meia-noite para evitar avanço de dia
    brDate.setHours(0, 0, 0, 0);
    return brDate;
  }
  const todayBrasilia = getBrasiliaDate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const router = useRouter();
  const psicologoId = consulta?.psicologo?.id || "";
  // Removido agendaStore pois não é utilizado
  // Usar hooks da agenda.hook

  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioAgendamento[]>([]);
  const [ultimaDataBuscada, setUltimaDataBuscada] = useState<string | null>(null); // Rastreia última data buscada para evitar duplicatas
  
  // Debug: log quando psicologoId muda
  useEffect(() => {
    console.debug('[ModalReagendar] psicologoId:', psicologoId, 'isOpen:', isOpen);
  }, [psicologoId, isOpen]);

  // Inicializa a data quando o modal abre
  useEffect(() => {
    if (isOpen && psicologoId) {
      const hojeBrasilia = getBrasiliaDate();
      const hojeString = formatDateToYMD(hojeBrasilia);
      console.debug('[ModalReagendar] Modal aberto, definindo data inicial:', hojeString, 'psicologoId:', psicologoId);
      
      // Só atualiza a data se for diferente da atual (evita re-render desnecessário)
      const dataAtualString = selectedDate ? formatDateToYMD(selectedDate) : null;
      if (dataAtualString !== hojeString) {
        setSelectedDate(hojeBrasilia);
        setSelectedHorario(""); // Limpa horário selecionado
      }
    } else if (!isOpen) {
      // Limpa estados quando o modal fecha
      console.debug('[ModalReagendar] Modal fechado - limpando todos os estados');
      setSelectedDate(null);
      setSelectedHorario("");
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      setUltimaDataBuscada(null); // Limpa rastreamento de última busca
    }
  }, [isOpen, psicologoId, selectedDate]);

  // Busca horários disponíveis para o dia selecionado
  async function fetchHorariosParaData(date: Date) {
    console.log('🟡 [ModalReagendar] ===== fetchHorariosParaData CHAMADA =====');
    console.log('🟡 [ModalReagendar] Parâmetro date recebido:', date);
    console.log('🟡 [ModalReagendar] date.toISOString():', date.toISOString());
    console.log('🟡 [ModalReagendar] psicologoId:', psicologoId);
    console.log('🟡 [ModalReagendar] loadingAgenda atual:', loadingAgenda);
    console.log('🟡 [ModalReagendar] ultimaDataBuscada:', ultimaDataBuscada);
    
    if (!psicologoId) {
      console.warn('⚠️ [ModalReagendar] PsicologoId não disponível');
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      return;
    }

    const ymd = formatDateToYMD(date);
    console.log('🟡 [ModalReagendar] Data formatada (YMD):', ymd);
    
    // Evita busca duplicada se já está buscando para a mesma data
    if (ultimaDataBuscada === ymd && loadingAgenda) {
      console.log('ℹ️ [ModalReagendar] Busca já em andamento para esta data:', ymd);
      return;
    }
    
    console.log('🟡 [ModalReagendar] ===== INICIANDO BUSCA DE HORÁRIOS =====');
    console.log('🟡 [ModalReagendar] Data formatada:', ymd);
    console.log('🟡 [ModalReagendar] PsicologoId:', psicologoId);
    
    // Marca que está buscando esta data
    setUltimaDataBuscada(ymd);
    console.log('🟡 [ModalReagendar] ultimaDataBuscada atualizada para:', ymd);
    
    // Garante que o loading está ativo
    setLoadingAgenda(true);
    setHorariosDisponiveis([]); // Limpa horários anteriores imediatamente
    console.log('🟡 [ModalReagendar] Estados limpos e loading ativado');
    
    try {
      // Busca agendas do psicólogo para a data usando o serviço
      // O endpoint retorna: /agenda/psicologo/:psicologoId/data?data=YYYY-MM-DD
      const url = `/agenda/psicologo/${psicologoId}/data?data=${ymd}`;
      console.log('🟡 [ModalReagendar] ===== FAZENDO REQUISIÇÃO =====');
      console.log('🟡 [ModalReagendar] URL da requisição:', url);
      console.log('🟡 [ModalReagendar] PsicologoId:', psicologoId);
      console.log('🟡 [ModalReagendar] Data (YMD):', ymd);
      console.log('🟡 [ModalReagendar] Chamando agendamentoService().listarAgendasPorDataPsicologo...');
      
      if (!psicologoId || psicologoId.trim() === '') {
        throw new Error('PsicologoId não pode ser vazio');
      }
      
      const response = await agendamentoService().listarAgendasPorDataPsicologo(psicologoId, ymd);
      
      console.log('🟡 [ModalReagendar] ===== RESPOSTA RECEBIDA =====');
      console.log('🟡 [ModalReagendar] Response completa:', response);
      console.log('🟡 [ModalReagendar] Response.data:', response.data);
      console.log('🟡 [ModalReagendar] Response.status:', response.status);
      
      const agendas = response.data || [];
      
      console.log('🟡 [ModalReagendar] Total de agendas recebidas:', agendas.length);
      console.log('🟡 [ModalReagendar] Agendas recebidas da API:', JSON.stringify(agendas, null, 2));
      
      // Tipo para agenda retornada pela API
      type AgendaResponse = {
        id?: string;
        Id?: string;
        horario?: string;
        Horario?: string;
        status?: string;
        Status?: string;
        psicologoId?: string;
      };
      
      // O backend retorna: { id, horario, status, psicologoId }
      // Filtra APENAS agendas com status exatamente igual a 'Disponivel' (case-sensitive)
      const horariosDisponiveisArr = Array.isArray(agendas)
        ? agendas
            .filter((h: unknown): h is AgendaResponse => {
              if (!h || typeof h !== 'object') return false;
              const agenda = h as AgendaResponse;
              const status = agenda.status || agenda.Status || '';
              // Filtra apenas disponíveis - comparação exata (case-sensitive)
              const isDisponivel = status === 'Disponivel';
              if (!isDisponivel) {
                console.debug('[ModalReagendar] Horário filtrado (não disponível):', {
                  id: agenda.id || agenda.Id,
                  horario: agenda.horario || agenda.Horario,
                  status: status
                });
              }
              return isDisponivel;
            })
            .map((h: AgendaResponse): HorarioAgendamento => ({
              Id: h.id || h.Id || '',
              Horario: h.horario || h.Horario || '',
              Status: 'Disponivel' // Garante que sempre será 'Disponivel'
            }))
            .sort((a: HorarioAgendamento, b: HorarioAgendamento) => {
              // Ordena por horário (crescente)
              return (a.Horario || '').localeCompare(b.Horario || '');
            })
        : [];
      
      console.log('🟡 [ModalReagendar] Horários disponíveis processados:', horariosDisponiveisArr.length, 'horários');
      console.log('🟡 [ModalReagendar] Horários finais:', JSON.stringify(horariosDisponiveisArr, null, 2));
      console.log('🟡 [ModalReagendar] ===== BUSCA CONCLUÍDA COM SUCESSO =====');
      setHorariosDisponiveis(horariosDisponiveisArr);
    } catch (error: unknown) {
      console.error('❌ [ModalReagendar] ===== ERRO AO BUSCAR HORÁRIOS =====');
      console.error('❌ [ModalReagendar] Tipo do erro:', typeof error);
      console.error('❌ [ModalReagendar] Erro completo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('❌ [ModalReagendar] Erro stringify:', JSON.stringify(error, null, 2));
      console.error('❌ [ModalReagendar] Mensagem:', errorMessage);
      console.error('❌ [ModalReagendar] Stack:', errorStack);
      
      // Type guard para erros do Axios
      type AxiosError = {
        response?: {
          data?: unknown;
          status?: number;
          headers?: unknown;
        };
      };
      const axiosError = error as AxiosError;
      console.error('❌ [ModalReagendar] Response:', axiosError?.response);
      console.error('❌ [ModalReagendar] Response.data:', axiosError?.response?.data);
      console.error('❌ [ModalReagendar] Response.status:', axiosError?.response?.status);
      console.error('❌ [ModalReagendar] Response.headers:', axiosError?.response?.headers);
      setHorariosDisponiveis([]);
      setUltimaDataBuscada(null); // Limpa para permitir nova tentativa
      setLoadingAgenda(false);
      toast.error('Erro ao buscar horários disponíveis');
    } finally {
      setLoadingAgenda(false);
      console.log('🟡 [ModalReagendar] Loading desativado no finally');
    }
  }
  // Atualiza horários sempre que a data for alterada ou quando o modal abre
  // Usa uma string da data como dependência para garantir que detecta mudanças
  const selectedDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
  
  useEffect(() => {
    console.log('🟣 [ModalReagendar] ===== useEffect DE BUSCA DISPARADO =====');
    console.log('🟣 [ModalReagendar] Condições:', {
      isOpen,
      hasSelectedDate: !!selectedDate,
      selectedDateString,
      selectedDateObject: selectedDate,
      hasPsicologoId: !!psicologoId,
      psicologoId
    });
    
    // Só busca horários se o modal estiver aberto, tiver data selecionada e psicologoId
    if (isOpen && selectedDate && psicologoId) {
      console.log('🟣 [ModalReagendar] Condições atendidas - iniciando busca');
      console.log('🟣 [ModalReagendar] selectedDate:', selectedDate);
      console.log('🟣 [ModalReagendar] selectedDate.toISOString():', selectedDate.toISOString());
      console.log('🟣 [ModalReagendar] selectedDateString:', selectedDateString);
      
      // Ativa loading e limpa horários ANTES de buscar
      setLoadingAgenda(true);
      setHorariosDisponiveis([]); // Limpa horários anteriores imediatamente
      setSelectedHorario(""); // Limpa horário selecionado quando muda a data
      console.log('🟣 [ModalReagendar] Estados limpos, chamando fetchHorariosParaData...');
      
      // Busca os horários - a função fetchHorariosParaData gerencia o estado de loading
      fetchHorariosParaData(selectedDate).catch((error) => {
        console.error('❌ [ModalReagendar] Erro no useEffect ao buscar horários:', error);
        setLoadingAgenda(false);
        setHorariosDisponiveis([]);
      });
    } else if (!isOpen) {
      // Limpa horários apenas quando o modal fecha
      console.log('🟣 [ModalReagendar] Modal fechado - limpando estados no useEffect de busca');
      setHorariosDisponiveis([]);
      setSelectedHorario("");
      setLoadingAgenda(false);
      setUltimaDataBuscada(null); // Limpa rastreamento
    } else {
      console.log('🟣 [ModalReagendar] useEffect não executou busca - condições não atendidas:', {
        isOpen,
        hasSelectedDate: !!selectedDate,
        hasPsicologoId: !!psicologoId,
        selectedDateString
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDateString, psicologoId]); // Inclui isOpen para garantir que busca quando o modal abre

  // Dados do psicólogo (nome/avatar)
  const nomePsicologo = consulta?.psicologo?.nome || "";
  const avatarPsicologo = consulta?.psicologo?.Image?.[0]?.Url || "/assets/avatar-placeholder.svg";
  const dataConsulta = consulta?.data || "";
  const horarioConsulta = consulta?.horario || "";

  function handleVerPerfil() {
    if (psicologoId) {
      router.push(`/psicologo/${psicologoId}`);
    }
  }

  // Função separada para reagendamento
  const handleReagendarConsulta = async () => {
    setIsLoading(true);
    try {
      if (typeof reagendarReservaSessao === 'function') {
        await reagendarReservaSessao(consultaIdAtual, selectedHorario);
        toast.success('Reagendamento realizado com sucesso');
        setSuccessMsg('Consulta reagendada com sucesso!');
        
        // Invalida todas as queries relacionadas a consultas para atualizar em tempo real
        // Adiciona um pequeno delay para garantir que a nova consulta foi criada no banco
        await new Promise(resolve => setTimeout(resolve, 300));
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
          queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
          queryClient.invalidateQueries({ queryKey: ['consultas'] }),
          queryClient.invalidateQueries({ queryKey: ['consultas-paciente'] }),
          queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
          queryClient.invalidateQueries({ queryKey: ['ciclos-plano'] }),
          queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
          queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
          queryClient.invalidateQueries({ queryKey: ['userMe'] }),
          queryClient.refetchQueries({ queryKey: ['ciclo-ativo'] }),
          queryClient.refetchQueries({ queryKey: ['userPlano'] }),
        ]);
        
        // Refaz as queries após invalidação
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['consultasFuturas'] }),
          queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
          queryClient.refetchQueries({ queryKey: ['reservas/consultas-agendadas'] }),
        ]);
        
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        toast.error('Função de reagendamento não disponível.');
        setErrorMsg('Função de reagendamento não disponível.');
      }
    } catch {
      toast.error('Erro ao reagendar consulta.');
      setErrorMsg('Erro ao reagendar consulta.');
    }
    setIsLoading(false);
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
            {/* Header mobile ajustado */}
            <div className="w-full h-[64px] flex items-center justify-center px-4 bg-gradient-to-r from-[#8494E9] to-[#6D75C0] shadow-md rounded-t-xl relative">
              <Image src={LogoLilas} alt="Logo" width={44} height={44} className="h-11 w-11 mr-2 sm:hidden" />
              <h2 className="flex-1 text-center fira-sans font-semibold text-[18px] leading-7 text-[#FCFBF6] tracking-normal" style={{ fontFamily: 'var(--font-fira-sans), system-ui, sans-serif', fontWeight: 600 }}>
                Reagendar consulta
              </h2>
              <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-[#FCFBF6] text-[#8494E9] hover:bg-[#E6E9FF] rounded-full shadow transition text-lg font-bold border border-[#8494E9] focus:outline-none focus:ring-2 focus:ring-[#8494E9]">
                <span className="sr-only">Fechar</span>
                ×
              </button>
            </div>
            <div className="px-4 pt-6 pb-2">
              <h2 className="text-center fira-sans font-medium text-[15px] leading-6 text-[#8494E9] mb-4">
                Reagendar consulta
              </h2>
              <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Image
                  src={avatarPsicologo}
                  alt="Avatar"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-800">{nomePsicologo}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDateBR(dataConsulta)} às {horarioConsulta}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleVerPerfil}
                className="px-3 py-1 h-[24px] min-w-[66px] border border-[#6D75C0] rounded-[4px] flex items-center justify-center whitespace-nowrap text-[11px] text-[#6D75C0] font-medium hover:bg-[#F0F2FF] transition"
              >
                Ver perfil
              </button>
            </div>
            <p className="text-gray-700 mb-4">Escolha o melhor dia e horário abaixo para alterar sua sessão</p>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} className="p-2 hover:bg-gray-100 rounded" disabled={currentMonthOffset === 0}>←</button>
                <h4 className="font-semibold">{monthNames[calendarMonth]} — {calendarYear}</h4>
                <button onClick={() => setCurrentMonthOffset((prev) => prev + 1)} className="p-2 hover:bg-gray-100 rounded">→</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500 mb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                  <div key={day} className="py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysOfMonth.map((date: Date, index: number) => {
                  const ymd = formatDateToYMD(date);
                  // Permite clique em todas as datas futuras/atuais, bloqueando apenas retroativas
                  const isDisabled = isPastDate(date);
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  const isToday = ymd === formatDateToYMD(new Date());
                  return (
                    <button
                      key={index}
                      disabled={isDisabled}
                      onClick={async () => {
                        if (!isDisabled) {
                          // Cria um novo objeto Date para garantir que o React detecte a mudança
                          const newDate = new Date(date);
                          const newDateString = formatDateToYMD(newDate);
                          const currentDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
                          
                          // Só atualiza se for uma data diferente
                          if (newDateString !== currentDateString) {
                            console.log('🔵 [ModalReagendar] ===== CLIQUE EM DATA (MOBILE) =====');
                            console.log('🔵 [ModalReagendar] Data clicada (objeto Date):', newDate);
                            console.log('🔵 [ModalReagendar] Data clicada (ISO):', newDate.toISOString());
                            console.log('🔵 [ModalReagendar] Data clicada (formatada YMD):', newDateString);
                            console.log('🔵 [ModalReagendar] Data atual selecionada:', currentDateString);
                            console.log('🔵 [ModalReagendar] PsicologoId disponível:', psicologoId);
                            console.log('🔵 [ModalReagendar] Loading atual:', loadingAgenda);
                            
                            // Limpa estados e ativa loading IMEDIATAMENTE
                            setSelectedHorario("");
                            setHorariosDisponiveis([]);
                            setLoadingAgenda(true);
                            console.log('🔵 [ModalReagendar] Loading ativado');
                            
                            // Atualiza a data - isso vai disparar o useEffect
                            console.log('🔵 [ModalReagendar] Atualizando selectedDate...');
                            setSelectedDate(newDate);
                            
                            // Também busca diretamente como garantia (fallback)
                            if (psicologoId) {
                              console.log('🔵 [ModalReagendar] Chamando fetchHorariosParaData diretamente...');
                              fetchHorariosParaData(newDate).catch((error) => {
                                console.error('❌ [ModalReagendar] Erro ao buscar horários no onClick:', error);
                                setLoadingAgenda(false);
                              });
                            } else {
                              console.warn('⚠️ [ModalReagendar] PsicologoId não disponível para buscar horários');
                            }
                          } else {
                            console.log('ℹ️ [ModalReagendar] Mesma data clicada, ignorando:', newDateString);
                          }
                        }
                      }}
                      className={`w-8 h-8 text-sm rounded transition-all
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
              <h4 className="font-semibold mb-3 mt-6">Escolha um horário</h4>
                <select
                  key={`horario-select-mobile-${selectedDateString || 'no-date'}`}
                  value={selectedHorario}
                  onChange={(e) => setSelectedHorario(e.target.value)}
                  disabled={!selectedDate || loadingAgenda || horariosDisponiveis.length === 0}
                  className={`w-full p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent ${!selectedDate || loadingAgenda || horariosDisponiveis.length === 0 ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white text-gray-700 border-gray-300 hover:border-[#8494E9]"}`}
                >
                  <option value="" disabled>{selectedDate ? (loadingAgenda ? "Carregando horários..." : horariosDisponiveis.length === 0 ? "Nenhum horário disponível" : "Selecione um horário") : "Selecione uma data primeiro"}</option>
                  {horariosDisponiveis.map((horarioObj) => (
                    <option key={horarioObj.Id} value={horarioObj.Id}>{horarioObj.Horario || "Horário não informado"}</option>
                  ))}
                </select>
              {selectedDate && !loadingAgenda && horariosDisponiveis.length === 0 && (
                <div className="mt-2 p-3 text-center text-gray-500 text-sm bg-gray-50 rounded-md">Nenhum horário disponível para esta data</div>
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
            <div className="p-4 border-t bg-white flex-shrink-0">
              <button
                onClick={handleReagendarConsulta}
                disabled={!selectedDate || !selectedHorario || isLoading}
                className={`w-full h-12 font-medium text-base rounded-[6px] transition mb-3 ${selectedDate && selectedHorario && !isLoading ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
              >
                {isLoading ? "Reagendando..." : "Confirmar consulta"}
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 border border-[#6D75C0] text-[#6D75C0] font-medium text-base rounded-[6px] hover:bg-[#E6E9FF] transition"
              >
                Cancelar
              </button>
            </div>
            {successMsg && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-700 px-4 py-2 rounded shadow">{successMsg}</div>
            )}
            {errorMsg && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded shadow">{errorMsg}</div>
            )}
                        </div>

          </motion.div>

          {/* DESKTOP */}
          <motion.div
            className="fixed inset-0 bg-[#E6E9FF]/60 z-[9999] hidden sm:flex items-center justify-center font-sans"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-[792px] h-[560px] flex flex-col p-0 rounded-xl shadow-lg">
              {/* Header desktop ajustado */}
                <div className="w-[792px] h-[110px] flex items-center justify-center px-8 pt-4 pb-4 bg-gradient-to-r from-[#8494E9] to-[#6D75C0] shadow-md rounded-t-xl relative">
                  <h2 className="flex-1 text-center fira-sans font-semibold text-[22px] leading-7 text-[#FCFBF6] tracking-normal">
                    Reagendar consulta
                  </h2>
                  <button onClick={onClose} className="absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white hover:text-[#FCFBF6] transition text-xl font-bold focus:outline-none">
                    <span className="sr-only">Fechar</span>
                    ×
                  </button>
                </div>
              <div className="flex-1 flex flex-col bg-white px-8 pt-8 pb-6 rounded-b-xl w-[792px]">
                {/* Bloco dos dados do psicólogo e consulta */}
                <div className="w-full flex flex-row items-center justify-between mb-4">
                  <div className="flex flex-row items-center gap-3">
                    <Image
                      src={avatarPsicologo}
                      alt="Avatar"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex flex-col justify-center">
                      <h3 className="font-semibold text-gray-800 mb-0.5">{nomePsicologo}</h3>
                      <p className="text-sm text-gray-600 mb-0.5">{formatarDataHora(dataConsulta, horarioConsulta)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleVerPerfil}
                    className="px-3 py-1 h-[32px] min-w-[90px] border border-[#8494E9] rounded-[4px] flex items-center justify-center whitespace-nowrap text-[13px] text-[#8494E9] font-medium bg-white hover:bg-[#F0F2FF] transition"
                  >
                    Ver perfil
                  </button>
                </div>
                <div className="w-full text-left text-sm text-gray-700 mb-6">
                  Escolha o melhor dia e horário abaixo para alterar sua sessão
                </div>
                {/* Layout principal desktop: calendário à esquerda, select/botões à direita */}
                <div className="w-full flex flex-row gap-8">
                  {/* Calendário à esquerda */}
                  <div className="w-[320px] bg-white rounded-lg border border-[#E6E9FF] p-6 flex flex-col items-center justify-start mt-6">
                    <div className="flex items-center justify-between w-full mb-4">
                      <button onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} className="p-2 hover:bg-gray-100 rounded" disabled={currentMonthOffset === 0}>←</button>
                      <h4 className="font-semibold text-[#8494E9]">{monthNames[calendarMonth]} — {calendarYear}</h4>
                      <button onClick={() => setCurrentMonthOffset((prev) => prev + 1)} className="p-2 hover:bg-gray-100 rounded">→</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500 mb-2 w-full">
                      {...["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                        <div key={day} className="py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 w-full">
                      {daysOfMonth.map((date: Date, index: number) => {
                        const ymd = formatDateToYMD(date);
                        // Permite clique em todas as datas futuras/atuais, bloqueando apenas retroativas
                        const isDisabled = isPastDate(date);
                        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                        const isToday = ymd === formatDateToYMD(new Date());
                        return (
                          <button
                            key={index}
                            disabled={isDisabled}
                            onClick={async () => {
                              if (!isDisabled) {
                                // Cria um novo objeto Date para garantir que o React detecte a mudança
                                const newDate = new Date(date);
                                const newDateString = formatDateToYMD(newDate);
                                const currentDateString = selectedDate ? formatDateToYMD(selectedDate) : null;
                                
                                // Só atualiza se for uma data diferente
                                if (newDateString !== currentDateString) {
                                  console.log('🟢 [ModalReagendar] ===== CLIQUE EM DATA (DESKTOP) =====');
                                  console.log('🟢 [ModalReagendar] Data clicada (objeto Date):', newDate);
                                  console.log('🟢 [ModalReagendar] Data clicada (ISO):', newDate.toISOString());
                                  console.log('🟢 [ModalReagendar] Data clicada (formatada YMD):', newDateString);
                                  console.log('🟢 [ModalReagendar] Data atual selecionada:', currentDateString);
                                  console.log('🟢 [ModalReagendar] PsicologoId disponível:', psicologoId);
                                  console.log('🟢 [ModalReagendar] Loading atual:', loadingAgenda);
                                  
                                  // Limpa estados e ativa loading IMEDIATAMENTE
                                  setSelectedHorario("");
                                  setHorariosDisponiveis([]);
                                  setLoadingAgenda(true);
                                  console.log('🟢 [ModalReagendar] Loading ativado');
                                  
                                  // Atualiza a data - isso vai disparar o useEffect
                                  console.log('🟢 [ModalReagendar] Atualizando selectedDate...');
                                  setSelectedDate(newDate);
                                  
                                  // Também busca diretamente como garantia (fallback)
                                  if (psicologoId) {
                                    console.log('🟢 [ModalReagendar] Chamando fetchHorariosParaData diretamente...');
                                    fetchHorariosParaData(newDate).catch((error) => {
                                      console.error('❌ [ModalReagendar] Erro ao buscar horários no onClick:', error);
                                      setLoadingAgenda(false);
                                    });
                                  } else {
                                    console.warn('⚠️ [ModalReagendar] PsicologoId não disponível para buscar horários');
                                  }
                                } else {
                                  console.log('ℹ️ [ModalReagendar] Mesma data clicada, ignorando:', newDateString);
                                }
                              }
                            }}
                            className={`w-8 h-8 text-sm rounded transition-all border
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
                  {/* Select e botões à direita */}
                  <div className="flex-1 flex flex-col justify-start gap-4 items-start">
                    <select
                      key={`horario-select-${selectedDateString || 'no-date'}`}
                      value={selectedHorario}
                      onChange={(e) => setSelectedHorario(e.target.value)}
                      disabled={!selectedDate || loadingAgenda}
                      className={`w-full p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent ${!selectedDate || loadingAgenda ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white text-gray-700 border-gray-300 hover:border-[#8494E9]"}`}
                    >
                      <option value="" disabled>{selectedDate ? (loadingAgenda ? "Carregando horários..." : horariosDisponiveis.length === 0 ? "Nenhum horário disponível" : "Escolha um horário") : "Escolha uma data primeiro"}</option>
                      {horariosDisponiveis.map((horarioObj) => (
                        <option key={horarioObj.Id} value={horarioObj.Id}>{horarioObj.Horario || "Horário não informado"}</option>
                      ))}
                    </select>
                    {selectedDate && !loadingAgenda && horariosDisponiveis.length === 0 && (
                      <div className="p-3 text-center text-gray-500 text-sm bg-gray-50 rounded-md w-full">Nenhum horário disponível para esta data</div>
                    )}
                    {selectedDate && loadingAgenda && (
                      <div className="p-3 text-center text-gray-500 text-sm bg-gray-50 rounded-md w-full flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Carregando horários...</span>
                      </div>
                    )}
                    <button
                      onClick={handleReagendarConsulta}
                      disabled={!selectedDate || !selectedHorario || isLoading}
                      className={`w-full h-12 font-medium text-base rounded-[6px] transition ${selectedDate && selectedHorario && !isLoading ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                    >
                      {isLoading ? "Reagendando..." : "Confirmar consulta"}
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full h-12 border border-[#8494E9] text-[#8494E9] font-medium text-base rounded-[6px] bg-white hover:bg-[#F0F2FF] transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
                {/* Select e botões à direita */}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default  ModalReagendar;