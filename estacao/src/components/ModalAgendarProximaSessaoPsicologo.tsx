"use client";
import toast from "react-hot-toast";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HorarioAgendamento } from '@/types/agendamentoTypes';
import { agendamentoService } from '@/services/agendamentoService';
import { useQueryClient } from '@tanstack/react-query';
import VideoPIP from './VideoPIP';
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import { useConsultaById } from '@/hooks/consulta';
import BreadcrumbsVoltar from './BreadcrumbsVoltar';
import { useAuthStore } from '@/store/authStore';
import { useEscapeKey } from "@/hooks/useEscapeKey";

interface ModalAgendarProximaSessaoPsicologoProps {
  isOpen: boolean;
  onClose: () => void;
  psicologoId: string;
  pacienteId: string;
  remoteVideoTrack?: IRemoteVideoTrack | null;
  consultationId?: string;
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

const ModalAgendarProximaSessaoPsicologo: React.FC<ModalAgendarProximaSessaoPsicologoProps> = ({ 
  isOpen, 
  onClose, 
  psicologoId,
  pacienteId: pacienteIdProp,
  remoteVideoTrack,
  consultationId
}) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(isOpen, onClose);
  
  // Hooks devem sempre ser chamados na mesma ordem
  const [pacienteId, setPacienteId] = useState(pacienteIdProp);
  const queryClient = useQueryClient();
  
  // Obtém o ID do psicólogo logado diretamente do authStore (não depende do backend)
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";
  
  // SEMPRE usa o ID do usuário logado, ignora o prop se necessário
  const psicologoIdFinal = loggedUserId || psicologoId || "";
  
  // Log para debug
  console.log('🔵 [ModalAgendarProximaSessao] Props recebidas:', {
    isOpen,
    psicologoId,
    loggedUserId,
    psicologoIdFinal,
    pacienteIdProp,
    consultationId,
    hasRemoteVideoTrack: !!remoteVideoTrack,
    loggedUser: loggedUser ? { Id: loggedUser.Id, Nome: loggedUser.Nome, Role: loggedUser.Role } : null
  });
  
  if (!psicologoIdFinal) {
    console.error('❌ [ModalAgendarProximaSessao] ERRO: ID do psicólogo não disponível!');
    console.error('  - loggedUserId:', loggedUserId);
    console.error('  - psicologoId prop:', psicologoId);
    console.error('  - loggedUser:', loggedUser);
  }
  
  // Valida se deve buscar consulta - só se não tiver pacienteId e tiver consultationId válido
  // IMPORTANTE: A validação deve ser feita ANTES de chamar o hook, mas o hook sempre é chamado
  const shouldFetchConsulta = !pacienteIdProp && 
                               consultationId && 
                               typeof consultationId === 'string' &&
                               consultationId.trim() !== '' && 
                               isOpen;
  
  // Busca dados da consulta para obter o pacienteId se não foi fornecido
  // IMPORTANTE: O hook sempre é chamado, mas com undefined se não deve buscar
  // Isso garante que os hooks sejam sempre chamados na mesma ordem
  const { consulta: consultaData } = useConsultaById(
    shouldFetchConsulta ? consultationId : undefined
  );
  
  // Atualiza pacienteId quando os dados da consulta são carregados
  useEffect(() => {
    if (consultaData) {
      // Pode ser Reserva (pacienteId) ou ConsultaApi (PacienteId)
      const consulta = consultaData as { PacienteId?: string; pacienteId?: string; Paciente?: { Id?: string } };
      const id = consulta?.PacienteId || consulta?.pacienteId || consulta?.Paciente?.Id;
      if (id) {
        setPacienteId(String(id));
      }
    }
  }, [consultaData]);
  
  // Usa o pacienteId prop se disponível, senão usa o da consulta
  const consulta = consultaData as { PacienteId?: string; pacienteId?: string; Paciente?: { Id?: string } } | undefined;
  const pacienteIdFinal = pacienteIdProp || pacienteId || consulta?.PacienteId || consulta?.pacienteId || consulta?.Paciente?.Id || "";

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

  // Busca horários disponíveis para o dia selecionado
  const fetchHorariosParaData = useCallback(async (date: Date) => {
    console.log('🔵 [ModalAgendarProximaSessao] ===== fetchHorariosParaData INICIADA =====');
    console.log('🔵 [ModalAgendarProximaSessao] Parâmetros recebidos:');
    console.log('  - date:', date);
    console.log('  - psicologoId:', psicologoId);
    console.log('  - psicologoId type:', typeof psicologoId);
    console.log('  - psicologoId length:', psicologoId?.length);
    console.log('  - ultimaDataBuscada:', ultimaDataBuscada);
    console.log('  - loadingAgenda:', loadingAgenda);
    
    if (!psicologoId || psicologoId.trim() === '') {
      console.error('❌ [ModalAgendarProximaSessao] PsicologoId não disponível ou vazio, abortando busca');
      console.error('  - psicologoId recebido:', psicologoId);
      console.error('  - Props do modal:', { psicologoId, consultationId, pacienteIdProp });
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      toast.error('Erro: ID do psicólogo não disponível. Por favor, recarregue a página.');
      return;
    }

    const ymd = formatDateToYMD(date);
    console.log('🔵 [ModalAgendarProximaSessao] Data formatada (YMD):', ymd);
    
    // Evita busca duplicada se já está buscando para a mesma data
    if (ultimaDataBuscada === ymd && loadingAgenda) {
      console.log('ℹ️ [ModalAgendarProximaSessao] Busca já em andamento para esta data:', ymd);
      return;
    }
    
    console.log('🟡 [ModalAgendarProximaSessao] Iniciando busca de horários...');
    setUltimaDataBuscada(ymd);
    setLoadingAgenda(true);
    setHorariosDisponiveis([]);
    
    try {
      console.log('🟡 [ModalAgendarProximaSessao] Chamando agendamentoService().listarAgendasPorDataPsicologo');
      console.log('  - URL esperada: /agenda/psicologo/' + psicologoIdFinal + '/data?data=' + ymd);
      console.log('  - Usando psicologoIdFinal:', psicologoIdFinal);
      
      const response = await agendamentoService().listarAgendasPorDataPsicologo(psicologoIdFinal, ymd);
      
      console.log('🟢 [ModalAgendarProximaSessao] Resposta recebida do servidor:');
      console.log('  - Status:', response.status);
      console.log('  - Headers:', response.headers);
      console.log('  - Data completa:', response.data);
      console.log('  - Tipo de data:', typeof response.data);
      console.log('  - É array?', Array.isArray(response.data));
      
      const agendas = response.data || [];
      console.log('🟢 [ModalAgendarProximaSessao] Agendas extraídas:', agendas);
      console.log('🟢 [ModalAgendarProximaSessao] Total de agendas recebidas:', agendas.length);
      
      if (agendas.length > 0) {
        console.log('🟢 [ModalAgendarProximaSessao] Primeira agenda (exemplo):', JSON.stringify(agendas[0], null, 2));
      }
      
      type AgendaResponse = {
        id?: string;
        Id?: string;
        horario?: string;
        Horario?: string;
        status?: string;
        Status?: string;
        psicologoId?: string;
        PsicologoId?: string;
      };
      
      console.log('🟡 [ModalAgendarProximaSessao] Processando agendas...');
      console.log('🟡 [ModalAgendarProximaSessao] Tipo de dados recebidos:', typeof agendas);
      console.log('🟡 [ModalAgendarProximaSessao] É array?', Array.isArray(agendas));
      
      const horariosDisponiveisArr = Array.isArray(agendas)
        ? agendas
            .map((h: unknown, index: number) => {
              console.log(`  [${index}] Processando agenda:`, JSON.stringify(h, null, 2));
              return h;
            })
            .filter((h: unknown): h is AgendaResponse => {
              if (!h || typeof h !== 'object') {
                console.log('  ❌ Agenda inválida (não é objeto):', h);
                return false;
              }
              const agenda = h as AgendaResponse;
              // Aceita tanto minúsculas quanto maiúsculas
              const id = agenda.id || agenda.Id || '';
              const horario = agenda.horario || agenda.Horario || '';
              const status = agenda.status || agenda.Status || '';
              
              console.log('  - ID encontrado:', id);
              console.log('  - Horário encontrado:', horario);
              console.log('  - Status encontrado:', status);
              
              // Valida se tem ID e horário (obrigatórios)
              if (!id || !horario) {
                console.log('  ❌ Agenda sem ID ou horário, descartando');
                return false;
              }
              
              // Filtra APENAS agendas com status exatamente igual a 'Disponivel' (case-sensitive)
              const isDisponivel = status === 'Disponivel';
              console.log('  - É disponível?', isDisponivel);
              if (!isDisponivel) {
                console.log('  ❌ Agenda filtrada (status não é Disponivel):', { id, horario, status });
              }
              
              return isDisponivel;
            })
            .map((h: AgendaResponse): HorarioAgendamento => {
              const horario = {
                Id: h.id || h.Id || '',
                Horario: h.horario || h.Horario || '',
                Status: 'Disponivel'
              };
              console.log('  ✅ Horário processado:', horario);
              return horario;
            })
            .sort((a: HorarioAgendamento, b: HorarioAgendamento) => {
              return (a.Horario || '').localeCompare(b.Horario || '');
            })
        : [];
      
      console.log('🟢 [ModalAgendarProximaSessao] ===== RESULTADO FINAL =====');
      console.log('  - Total de horários disponíveis:', horariosDisponiveisArr.length);
      console.log('  - Horários:', JSON.stringify(horariosDisponiveisArr, null, 2));
      
      setHorariosDisponiveis(horariosDisponiveisArr);
      console.log('✅ [ModalAgendarProximaSessao] Estado atualizado com horários disponíveis');
    } catch (error: unknown) {
      console.error('🔴 [ModalAgendarProximaSessao] ===== ERRO AO BUSCAR HORÁRIOS =====');
      console.error('  - Tipo de erro:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('  - Mensagem:', error instanceof Error ? error.message : String(error));
      
      if (error && typeof error === 'object' && 'response' in error) {
        interface AxiosErrorResponse {
          status?: number;
          data?: unknown;
          config?: {
            url?: string;
            method?: string;
            params?: unknown;
          };
        }
        const axiosError = error as { response?: AxiosErrorResponse };
        console.error('  - Status HTTP:', axiosError.response?.status);
        console.error('  - Dados da resposta:', axiosError.response?.data);
        console.error('  - URL da requisição:', axiosError.response?.config?.url);
        console.error('  - Método:', axiosError.response?.config?.method);
        console.error('  - Parâmetros:', axiosError.response?.config?.params);
      }
      
      console.error('  - Stack:', error instanceof Error ? error.stack : 'N/A');
      setHorariosDisponiveis([]);
      setUltimaDataBuscada(null);
      setLoadingAgenda(false);
      toast.error('Erro ao buscar horários disponíveis');
    } finally {
      console.log('🔵 [ModalAgendarProximaSessao] Finalizando busca, desativando loading');
      setLoadingAgenda(false);
      console.log('🔵 [ModalAgendarProximaSessao] ===== fetchHorariosParaData FINALIZADA =====');
    }
  }, [psicologoId, psicologoIdFinal, ultimaDataBuscada, loadingAgenda, consultationId, pacienteIdProp]);

  // Inicializa a data quando o modal abre
  useEffect(() => {
    console.log('🔵 [ModalAgendarProximaSessao] useEffect de inicialização executado');
    console.log('  - isOpen:', isOpen);
    console.log('  - psicologoId:', psicologoId);
    console.log('  - selectedDate atual:', selectedDate);
    
    if (isOpen && psicologoIdFinal) {
      const hojeBrasilia = getBrasiliaDate();
      const hojeString = formatDateToYMD(hojeBrasilia);
      const dataAtualString = selectedDate ? formatDateToYMD(selectedDate) : null;
      
      console.log('  - Hoje (Brasília):', hojeBrasilia);
      console.log('  - Hoje (string):', hojeString);
      console.log('  - Data atual selecionada (string):', dataAtualString);
      
      if (dataAtualString !== hojeString) {
        console.log('🟡 [ModalAgendarProximaSessao] Inicializando data para hoje');
        setSelectedDate(hojeBrasilia);
        setSelectedHorario("");
        setHorariosDisponiveis([]);
        setUltimaDataBuscada(null);
      } else {
        console.log('ℹ️ [ModalAgendarProximaSessao] Data já está inicializada para hoje');
      }
    } else if (!isOpen) {
      console.log('🟡 [ModalAgendarProximaSessao] Modal fechado, limpando estado');
      setSelectedDate(null);
      setSelectedHorario("");
      setHorariosDisponiveis([]);
      setLoadingAgenda(false);
      setUltimaDataBuscada(null);
    }
  }, [isOpen, psicologoIdFinal, psicologoId, selectedDate]);

  const selectedDateString = selectedDate ? formatDateToYMD(selectedDate) : null;

  // Busca horários quando uma data é selecionada
  useEffect(() => {
    console.log('🔵 [ModalAgendarProximaSessao] useEffect de busca de horários executado');
    console.log('  - isOpen:', isOpen);
    console.log('  - selectedDate:', selectedDate);
    console.log('  - psicologoId:', psicologoId);
    console.log('  - ultimaDataBuscada:', ultimaDataBuscada);
    
    if (isOpen && selectedDate && psicologoIdFinal) {
      const ymd = formatDateToYMD(selectedDate);
      console.log('  - Data formatada (YMD):', ymd);
      console.log('  - Comparação com ultimaDataBuscada:', ymd !== ultimaDataBuscada);
      
      // Só busca se não for a mesma data que já foi buscada
      if (ymd !== ultimaDataBuscada) {
        console.log('🟡 [ModalAgendarProximaSessao] Data selecionada mudou, buscando horários...');
        fetchHorariosParaData(selectedDate);
      } else {
        console.log('ℹ️ [ModalAgendarProximaSessao] Data já foi buscada anteriormente, pulando busca');
      }
    } else {
      console.log('⚠️ [ModalAgendarProximaSessao] Condições não atendidas para buscar horários:');
      console.log('  - isOpen:', isOpen);
      console.log('  - selectedDate:', selectedDate);
      console.log('  - psicologoIdFinal:', psicologoIdFinal);
    }
  }, [selectedDate, isOpen, psicologoIdFinal, psicologoId, ultimaDataBuscada, fetchHorariosParaData]);

  const handleAgendarConsulta = async () => {
    // 🔒 PROTEÇÃO: Evita múltiplos cliques simultâneos
    if (isLoading) {
      console.warn('[ModalAgendarProximaSessaoPsicologo] Tentativa de agendar enquanto já está em processamento');
      return;
    }
    
    if (!selectedDate || !selectedHorario) {
      toast.error('Por favor, selecione uma data e horário');
      return;
    }
    
    if (!pacienteIdFinal || pacienteIdFinal.trim() === '') {
      toast.error('Não foi possível identificar o paciente. Por favor, tente novamente.');
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const agendaId = selectedHorario;
      
      console.log('[ModalAgendarProximaSessaoPsicologo] Agendando consulta:', {
        agendaId,
        pacienteId: pacienteIdFinal
      });
      
      // IMPORTANTE: O backend deve debitar APENAS 1 consulta por reserva
      // Se o backend estiver debitando todas as consultas, isso é um bug no backend
      await agendamentoService().agendarProximaSessao(agendaId, pacienteIdFinal);

      console.log('[ModalAgendarProximaSessaoPsicologo] Consulta agendada com sucesso');
      setSuccessMsg("Consulta agendada com sucesso!");
      
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
      // Tenta extrair mensagem de erro do backend
      const errObj = error as { response?: { data?: { message?: string; error?: string }; status?: number } };
      const msg = errObj?.response?.data?.message || errObj?.response?.data?.error;
      const status = errObj?.response?.status;
      
      // Verifica se é erro de saldo insuficiente
      if (msg && (/saldo|saldo de consultas|não possui consultas disponíveis|não possui saldo/i.test(String(msg)) || status === 400)) {
        const mensagemSaldo = errObj?.response?.data?.message || 
          "O paciente não possui saldo de consultas disponível. Por favor, oriente o paciente a adquirir um plano ou consultas avulsas para continuar.";
        setErrorMsg(mensagemSaldo);
        toast.error(mensagemSaldo);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao agendar consulta';
        setErrorMsg(errorMessage);
        toast.error(errorMessage);
      }
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
              {/* BreadcrumbsVoltar - agora fecha o modal */}
              <div className="mb-1">
                <BreadcrumbsVoltar onClick={onClose} />
              </div>
              
              {/* Título e subtítulo ainda mais compactos */}
              <h1 className="text-base font-bold text-gray-900 mb-0.5 fira-sans">
                Agendar próxima sessão
              </h1>
              <p className="text-gray-700 mb-2 text-xs fira-sans">
                Escolha o melhor dia e horário para agendar a próxima sessão com o(a) paciente
              </p>
              
              {/* PIP do paciente - canto inferior direito (mobile) */}
              {remoteVideoTrack && (
                <div className="absolute bottom-4 right-4 w-[140px] h-[105px] z-10">
                  <VideoPIP videoTrack={remoteVideoTrack} label="Paciente" />
                </div>
              )}
              
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <button 
                    onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} 
                    className="p-1 hover:bg-gray-100 rounded text-xs" 
                    disabled={currentMonthOffset === 0}
                  >
                    ←
                  </button>
                  <h4 className="font-semibold text-xs">{monthNames[calendarMonth]} — {calendarYear}</h4>
                  <button 
                    onClick={() => setCurrentMonthOffset((prev) => prev + 1)} 
                    className="p-1 hover:bg-gray-100 rounded text-xs"
                  >
                    →
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500 mb-0.5 w-full max-w-[210px]">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="py-0.5">{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-0.5 w-full max-w-[210px]">
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
                        className={`w-6 h-6 text-[10px] rounded transition-all font-medium
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
              
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Escolha um horário
                </label>
                <select
                  key={`horario-select-mobile-${selectedDateString || 'no-date'}`}
                  value={selectedHorario}
                  onChange={(e) => setSelectedHorario(e.target.value)}
                  disabled={!selectedDate || loadingAgenda || horariosDisponiveis.length === 0}
                  className={`w-full p-2 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#8494E9] ${
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
                  <div className="mt-1 p-2 text-center text-gray-500 text-xs bg-gray-50 rounded-md">
                    Nenhum horário disponível para esta data
                  </div>
                )}
                
                {selectedDate && loadingAgenda && (
                  <div className="mt-1 p-2 text-center text-gray-500 text-xs bg-gray-50 rounded-md flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Carregando horários...</span>
                  </div>
                )}
              </div>
            
              <div className="p-2 border-t bg-white flex-shrink-0">
                <button
                  onClick={handleAgendarConsulta}
                  disabled={!selectedDate || !selectedHorario || isLoading}
                  className={`w-full h-9 font-semibold text-xs rounded-lg transition mb-1 ${
                    selectedDate && selectedHorario && !isLoading 
                      ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? "Agendando..." : "Agendar"}
                </button>
                <button
                  onClick={onClose}
                  className="w-full h-9 border-2 border-[#6D75C0] text-[#6D75C0] font-semibold text-xs rounded-lg hover:bg-[#E6E9FF] transition"
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
            </div>
            
            <div className="p-4 border-t bg-white flex-shrink-0">
              <button
                onClick={handleAgendarConsulta}
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
            
            {/* PIP do paciente - em cima do modal (z-index maior) */}
            {remoteVideoTrack && (
              <div className="fixed bottom-8 right-8 w-[280px] h-[200px] z-[10001]">
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
                      {/* BreadcrumbsVoltar - agora fecha o modal */}
                      <div className="mb-1">
                        <BreadcrumbsVoltar onClick={onClose} />
                      </div>
                      
                      {/* Título e subtítulo ainda mais compactos */}
                      <h1 className="text-base font-bold text-gray-900 mb-0.5">
                        Agendar próxima sessão
                      </h1>
                      <p className="text-gray-700 mb-2 text-xs">
                        Escolha o melhor dia e horário para agendar a próxima sessão com o(a) paciente
                      </p>
                      
                      <div className="flex flex-row gap-8">
                      {/* Calendário à esquerda - um pouco maior */}
                      <div className="w-[360px] bg-white rounded-lg border border-[#E6E9FF] p-5 flex flex-col items-center justify-start shadow-sm">
                      <div className="flex items-center justify-between w-full mb-4">
                        <button 
                          onClick={() => setCurrentMonthOffset((prev) => Math.max(prev - 1, 0))} 
                          className="p-2 hover:bg-gray-100 rounded text-base" 
                          disabled={currentMonthOffset === 0}
                        >
                          ←
                        </button>
                        <h4 className="font-semibold text-base text-[#8494E9]">{monthNames[calendarMonth]} — {calendarYear}</h4>
                        <button 
                          onClick={() => setCurrentMonthOffset((prev) => prev + 1)} 
                          className="p-2 hover:bg-gray-100 rounded text-base"
                        >
                          →
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-gray-500 mb-2 w-full max-w-[320px]">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                          <div key={day} className="py-1.5">{day}</div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1.5 w-full max-w-[320px]">
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
                              className={`w-10 h-10 text-sm rounded transition-all border font-medium
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
                    
                    {/* Select e botões à direita - reduzidos pela metade */}
                    <div className="flex-1 flex flex-col justify-start gap-2 items-start max-w-[400px]">
                      <div className="w-full">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Escolha um horário
                        </label>
                        <select
                          key={`horario-select-${selectedDateString || 'no-date'}`}
                          value={selectedHorario}
                          onChange={(e) => setSelectedHorario(e.target.value)}
                          disabled={!selectedDate || loadingAgenda}
                          className={`w-full p-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#8494E9] ${
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
                          <div className="mt-1 p-1.5 text-center text-gray-500 text-xs bg-gray-50 rounded-md w-full">
                            Nenhum horário disponível para esta data
                          </div>
                        )}
                        
                        {selectedDate && loadingAgenda && (
                          <div className="mt-1 p-1.5 text-center text-gray-500 text-xs bg-gray-50 rounded-md w-full flex items-center justify-center gap-1.5">
                            <svg className="animate-spin h-3 w-3 text-[#8494E9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Carregando horários...</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={handleAgendarConsulta}
                        disabled={!selectedDate || !selectedHorario || isLoading}
                        className={`w-full h-6 font-semibold text-xs rounded transition ${
                          selectedDate && selectedHorario && !isLoading 
                            ? "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer" 
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isLoading ? "Agendando..." : "Agendar"}
                      </button>
                      
                      <button
                        onClick={onClose}
                        className="w-full h-6 border border-[#8494E9] text-[#8494E9] font-semibold text-xs rounded bg-white hover:bg-[#F0F2FF] transition"
                      >
                        Cancelar
                      </button>
                    </div>
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ModalAgendarProximaSessaoPsicologo;
