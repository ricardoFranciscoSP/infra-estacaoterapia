"use client";
import { useState, useEffect, useMemo } from "react";
import { useConsultasList } from "@/hooks/useConsultasList";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import ConsultaModal from "./ConsultaModal";
import ModalReagendar from "./ModalReagendar";
import ModalCancelarSessao from "./ModalCancelarSessao";
import ModalCancelarSessaoDentroPrazo from "./ModalCancelarSessaoDentroPrazo";
import ModalReagendarAposCancelamento from "./ModalReagendarAposCancelamento";
import { isCancelamentoDentroPrazo } from "@/utils/cancelamentoUtils";
import { useSessaoConsulta, type ConsultaSessao } from "../hooks/useSessaoConsulta";
import { formatarDataHora } from "../utils/formatarDataHora";
import { getContextualAvatar, isPsicologoPanel } from "@/utils/avatarUtils";
import { ConsultaApi, ConsultasAgendadasResponse } from "@/types/consultasTypes";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import { extractScheduledAtFromNormalized, scheduledAtToTimestamp } from "@/utils/reservaSessaoUtils";
import { useReservaSessaoData } from "@/hooks/useReservaSessaoData";
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import {
  onConsultationStarted,
  onConsultationEnded,
  onConsultationStartingSoon,
  onConsultationEndingSoon,
  onConsultationCancelled,
  onConsultationCancelledByPatient,
  onConsultationCancelledByPsychologist,
  onConsultationStatusChanged,
  offConsultationStatusChanged,
  ensureSocketConnection,
  getSocket,
  joinConsultation,
} from "../lib/socket";
import { useAuthStore } from "@/store/authStore";


type Role = "paciente" | "psicologo";
type ConsultationStatus = 
  | "startingSoon" 
  | "started" 
  | "endingSoon" 
  | "Concluido"
  | "Cancelado"
  | "cancelled_by_patient"
  | "cancelled_by_psychologist"
  | "cancelled_no_show"
  | "EmAnalise"
  | "Deferido"
  | "Indeferido";


export interface ProximasConsultasProps {
  consultas: ConsultaApi[] | ConsultaApi | import("@/types/consultasTypes").Futuras | null;
  role?: Role;
  hidePerfil?: boolean;
}

interface ButtonState {
  mostrarBotaoEntrar: boolean;
  mostrarBotaoCancelar: boolean;
  mostrarBotaoReagendar: boolean;
  mostrarBotaoSuporte: boolean;
  botaoEntrarDesabilitado: boolean;
}

interface SessionState {
  fraseSessao: string;
  mostrarContador: boolean;
  contadorSessao: string;
  buttons: ButtonState;
}

const ANIMATION_VARIANTS = {
  container: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
  text: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  },
  card: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} as const;

 

export default function ProximasConsultas({ consultas: consultasProp = null, role = "paciente", hidePerfil = false }: ProximasConsultasProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showModalReagendar, setShowModalReagendar] = useState<boolean>(false);
  const [showModalCancelar, setShowModalCancelar] = useState<boolean>(false);
  const [showModalCancelarDentroPrazo, setShowModalCancelarDentroPrazo] = useState<boolean>(false);
  const [showModalReagendarAposCancelamento, setShowModalReagendarAposCancelamento] = useState<boolean>(false);
  const [consultaIdReagendar, setConsultaIdReagendar] = useState<string>("");
  const [socketStatus, setSocketStatus] = useState<ConsultationStatus | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(3); // Mostra 3 consultas inicialmente
  const { consultas } = useConsultasList();
  const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  
  // Obtém o ID do usuário logado para registrar presença
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";

  // Estado para dados da consulta selecionada para o modal
  interface ConsultaModalData {
    data?: string;
    horario?: string;
    psicologo?: {
      nome?: string;
      id?: string;
      avatarUrl?: string;
      Image?: { Url?: string }[];
    };
    paciente?: {
      nome?: string;
      id?: string;
      avatarUrl?: string;
      Image?: { Url?: string }[];
    };
  }
  const [consultaSelecionada, setConsultaSelecionada] = useState<ConsultaModalData | null>(null);
  // Estado para armazenar a consulta normalizada selecionada (para usar no cancelamento)
  const [consultaNormalizadaSelecionada, setConsultaNormalizadaSelecionada] = useState<typeof normalizedList[0] | null>(null);

  // Função para abrir o modal de reagendamento
  const handleReagendarConsulta = () => {
    if (normalized?.id) {
      setConsultaIdReagendar(String(normalized.id));
      const avatarPsicologo = getContextualAvatar(isInPsicologoPanel, normalized.psicologo, normalized.paciente);
      // Prepara dados da consulta para o modal de reagendamento
      const consultaData: ConsultaModalData = {
        data: normalized.date,
        horario: normalized.time,
        psicologo: normalized.psicologo ? {
          nome: normalized.psicologo.nome,
          id: String(normalized.psicologoId || normalized.psicologo.id || ""),
          Image: normalized.psicologo.imageUrl ? [{ Url: normalized.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
        paciente: normalized.paciente ? {
          nome: normalized.paciente.nome,
        } : undefined,
      };
      setConsultaSelecionada(consultaData);
      setConsultaNormalizadaSelecionada(normalized); // Armazena a consulta normalizada
    } else {
      setConsultaIdReagendar("");
      setConsultaSelecionada(null);
      setConsultaNormalizadaSelecionada(null);
    }
    setShowModalReagendar(true);
  };

  // Processa as consultas recebidas, incluindo consulta atual E futuras
  // IMPORTANTE: Retorna TODAS as consultas válidas (atual + próximas) para exibir abaixo
  const listaConsultas = useMemo(() => {
    const consultasResult: ConsultaApi[] = [];
    
    // PRIORIDADE 1: Se recebeu nextReservation via consultasProp, usa ele como primeira
    if (consultasProp && typeof consultasProp === 'object' && 'success' in consultasProp) {
      const apiResponse = consultasProp as unknown as ConsultasAgendadasResponse;
      if (apiResponse.success) {
        // Adiciona nextReservation como primeira (consulta atual)
        if (apiResponse.nextReservation) {
          console.log('[ProximasConsultas] nextReservation do backend:', apiResponse.nextReservation);
          consultasResult.push(apiResponse.nextReservation);
        }
        
        // IMPORTANTE: Adiciona também as futuras para mostrar abaixo da atual
        if (apiResponse.futuras && Array.isArray(apiResponse.futuras) && apiResponse.futuras.length > 0) {
          console.log('[ProximasConsultas] Adicionando', apiResponse.futuras.length, 'consultas futuras');
          // Filtra para não duplicar a nextReservation
          const futurasSemDuplicata = apiResponse.futuras.filter(f => {
            if (apiResponse.nextReservation) {
              return f.Id !== apiResponse.nextReservation.Id;
            }
            return true;
          });
          consultasResult.push(...futurasSemDuplicata);
        }
        
        // Se tiver consultaAtual e não for a mesma que nextReservation, adiciona também
        if (apiResponse.consultaAtual) {
          const jaIncluida = consultasResult.some(c => c.Id === apiResponse.consultaAtual?.Id);
          if (!jaIncluida) {
            consultasResult.push(apiResponse.consultaAtual);
          }
        }
        
        if (consultasResult.length > 0) {
          return consultasResult;
        }
      }
    }
    
    // PRIORIDADE 2: Se recebeu dados do hook useConsultasList
    if (consultas && consultas.length > 0) {
      return consultas;
    }
    
    // PRIORIDADE 3: Se recebeu a estrutura da API { success, consultaAtual, futuras, total } sem nextReservation
    if (consultasProp && typeof consultasProp === 'object' && 'success' in consultasProp) {
      const apiResponse = consultasProp as unknown as ConsultasAgendadasResponse;
      if (apiResponse.success) {
        // Adiciona consultaAtual se existir
        if (apiResponse.consultaAtual) {
          consultasResult.push(apiResponse.consultaAtual);
        }
        
        // Adiciona futuras
        if (apiResponse.futuras && Array.isArray(apiResponse.futuras) && apiResponse.futuras.length > 0) {
          // Filtra para não duplicar consultaAtual
          const futurasSemDuplicata = apiResponse.futuras.filter(f => {
            if (apiResponse.consultaAtual) {
              return f.Id !== apiResponse.consultaAtual.Id;
            }
            return true;
          });
          consultasResult.push(...futurasSemDuplicata);
        }
        
        if (consultasResult.length > 0) {
          return consultasResult;
        }
      }
    }
    
    // Se recebeu array de ConsultaApi
    if (Array.isArray(consultasProp)) {
      if (consultasProp.length === 0) return [];
      // Retorna todas as consultas do array (não apenas a primeira)
      return consultasProp;
    }
    
    // Se recebeu uma única ConsultaApi
    if (consultasProp && typeof consultasProp === 'object' && 'Id' in consultasProp && 'Date' in consultasProp && 'Time' in consultasProp) {
      return [consultasProp as ConsultaApi];
    }
    
    return [];
  }, [consultas, consultasProp]);

  // Função para extrair apenas a data no formato yyyy-mm-dd
  function extractDateOnly(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    // Extrai apenas yyyy-mm-dd, removendo qualquer parte de horário
    const dateOnly = dateStr.split('T')[0].split(' ')[0];
    // Valida formato yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    return null;
  }

  // Função para criar data/hora local da consulta

  // Normaliza a lista de consultas e aplica filtro adicional para garantir que nunca mostre datas retroativas
  // Inclui consultas em andamento que estão dentro da janela de 1 hora
  const normalizedList = useMemo(() => {
    const agora = dayjs().tz("America/Sao_Paulo");
    const dataAtual = agora.format('YYYY-MM-DD');
    const horaAtual = agora.format('HH:mm');
    const agoraTimestamp = agora.valueOf(); // Timestamp em milissegundos
    
    return listaConsultas
      .map((c: ConsultaApi) => normalizeConsulta(c as unknown as GenericObject))
      .filter((c) => {
        // Validação adicional: garante que tem data e hora válidas
        if (!c.date || !c.time) return false;
        
        // Extrai apenas a data no formato yyyy-mm-dd
        const dateOnly = extractDateOnly(c.date);
        if (!dateOnly) return false;
        
        const [ano, mes, dia] = dateOnly.split('-');
        const [hora, minuto] = c.time.split(':');
        if (!ano || !mes || !dia || !hora || !minuto) return false;
        
        // Status considerados como "não exibir": cancelado, concluído, todos os status de cancelamento normalizados, Agendada
        // IMPORTANTE: 'Agendada' não deve aparecer na lista - apenas 'Reservado' ou 'Andamento'
        const statusInativos = [
          // Status legados
          'Cancelado', 'Concluido', 'Concluído', 'cancelled_by_patient', 'cancelled_by_psychologist', 'cancelled_no_show',
          'Agendada', 'agendada', 'Agendado', 'agendado',
          // Status normalizados - Canceladas
          'CanceladaPacienteNoPrazo', 'Cancelada Paciente no Prazo',
          'CanceladaPsicologoNoPrazo', 'Cancelada Psicólogo no Prazo',
          'CanceladaPacienteForaDoPrazo', 'Cancelada Paciente Fora do Prazo',
          'CanceladaPsicologoForaDoPrazo', 'Cancelada Psicólogo Fora do Prazo',
          'CanceladaForcaMaior', 'Cancelada Força Maior',
          'CanceladaNaoCumprimentoContratualPaciente', 'Cancelada Não Cumprimento Contratual Paciente',
          'CanceladaNaoCumprimentoContratualPsicologo', 'Cancelada Não Cumprimento Contratual Psicólogo',
          'CanceladoAdministrador', 'Cancelado Administrador',
          // Status normalizados - Não compareceu
          'PacienteNaoCompareceu', 'Paciente Não Compareceu',
          'PsicologoNaoCompareceu', 'Psicólogo Não Compareceu',
          // Status normalizados - Outros
          'PsicologoDescredenciado', 'Psicólogo Descredenciado',
          // Status normalizados - Realizada
          'Realizada'
        ];
        const statusConsultaLower = (c.status || '').toString().toLowerCase();
        if (statusInativos.some(s => statusConsultaLower === s.toLowerCase())) return false;
        
        // Verifica também no raw.Status
        const statusRawLower = (c.raw?.Status || c.raw?.status || '').toString().toLowerCase();
        if (statusInativos.some(s => statusRawLower === s.toLowerCase())) return false;
        
        // 🎯 REGRA: Se a consulta está em andamento, verifica se está dentro da janela de 50 minutos do ScheduledAt
        const statusConsulta = c.raw?.Status || c.raw?.status || c.status;
        console.log('[ProximasConsultas] Filtro - Status:', statusConsulta, 'c.raw?.Status:', c.raw?.Status, 'c.status:', c.status);
        if (statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento') {
          let inicioConsulta: number | null = null;
          
          // Prioriza ScheduledAt da ReservaSessao usando função helper type-safe
          const scheduledAt = extractScheduledAtFromNormalized(c);
          if (scheduledAt) {
            inicioConsulta = scheduledAtToTimestamp(scheduledAt);
          }
          
          // Fallback: usa date/time se ScheduledAt não estiver disponível
          if (!inicioConsulta && c.time) {
            const [hh, mm] = c.time.split(':').map(Number);
            inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
          }
          
          if (inicioConsulta) {
            const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
            console.log('[ProximasConsultas] Consulta em andamento detectada - Início:', new Date(inicioConsulta), 'Fim:', new Date(fimConsulta), 'Agora:', new Date(agoraTimestamp));
            
            // Inclui se estiver dentro da janela de 50 minutos
            if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
              console.log('[ProximasConsultas] Consulta em andamento incluída no filtro (dentro de 50 minutos)');
              return true;
            } else {
              // Passou de 50 minutos, não inclui
              console.log('[ProximasConsultas] Consulta em andamento passou de 50 minutos - excluída do filtro');
              return false;
            }
          }
        }
        
        // FILTRO CRÍTICO: NUNCA mostra datas retroativas para consultas não em andamento
        // Compara primeiro a data
        if (dateOnly < dataAtual) {
          // Se a data da consulta é passada, não é válida (exceto se estiver em andamento, já tratado acima)
          return false;
        } else if (dateOnly > dataAtual) {
          // Se a data da consulta é futura, é válida - SEMPRE mostra
          return true;
        } else {
          // Se é o mesmo dia, compara o horário
          // IMPORTANTE: Mostra se o horário ainda não passou OU se está em andamento
          // Isso garante que consultas futuras no mesmo dia apareçam abaixo da atual
          const horaConsulta = c.time || '';
          return horaConsulta >= horaAtual; // >= para incluir consultas que começam agora
        }
      })
      .sort((a, b) => {
        // Consultas em andamento têm prioridade (aparecem primeiro)
        const statusA = a.raw?.Status || a.status;
        const statusB = b.raw?.Status || b.status;
        const aEmAndamento = statusA === 'Andamento';
        const bEmAndamento = statusB === 'Andamento';
        
        if (aEmAndamento && !bEmAndamento) return -1;
        if (!aEmAndamento && bEmAndamento) return 1;
        
        // Ordena por data e horário, retornando a mais próxima
        const dateA = extractDateOnly(a.date || '');
        const dateB = extractDateOnly(b.date || '');
        if (!dateA || !dateB) return 0;
        
        // Compara primeiro a data
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        
        // Se é o mesmo dia, compara o horário
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [listaConsultas]);

  // A primeira é a consulta atual (hoje) ou a próxima consulta futura
  const normalized = normalizedList[0];
  
  // Usa hook centralizado para acessar ReservaSessao (deve vir antes do useMemo que o usa)
  const { scheduledAt: scheduledAtFromReserva } = useReservaSessaoData({
    normalized,
    consultationId: normalized?.id ? String(normalized.id) : undefined
  });
  
  // Prepara os dados para useSessaoConsulta no formato esperado
  // IMPORTANTE: Inclui ReservaSessao com ScheduledAt como fonte da verdade
  const consultaSessaoData: ConsultaSessao = useMemo(() => {
    if (!normalized) return {};
    
    return {
      Date: normalized.date,
      Time: normalized.time,
      Agenda: (() => {
        const agendaRaw = normalized.raw?.Agenda;
        if (agendaRaw && typeof agendaRaw === 'object' && agendaRaw !== null && 'Data' in agendaRaw && 'Horario' in agendaRaw) {
          const agenda = agendaRaw as { Data?: string; Horario?: string };
          return {
            Data: typeof agenda.Data === 'string' ? agenda.Data : normalized.date,
            Horario: typeof agenda.Horario === 'string' ? agenda.Horario : normalized.time
          };
        }
        return {
          Data: normalized.date,
          Horario: normalized.time
        };
      })(),
      ReservaSessao: scheduledAtFromReserva ? {
        ScheduledAt: scheduledAtFromReserva
      } : undefined
    };
  }, [normalized, scheduledAtFromReserva]);
  
  const sessaoConsulta = useSessaoConsulta(consultaSessaoData);
  const { contador, mostrarSessao, sessaoAtiva, sessaoEncerrada } = sessaoConsulta;

  const basePrefix: string = role === "psicologo" ? "/painel-psicologo" : "/painel";
  
  // Detecta se está no painel do psicólogo
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isInPsicologoPanel = role === "psicologo" || isPsicologoPanel(pathname);
  

  // Função helper para verificar se uma consulta deve ser exibida
  const deveMostrarConsulta = (consulta: typeof normalizedList[0]): boolean => {
    if (!consulta) return false;
    
    const agora = dayjs().tz("America/Sao_Paulo");
    const dataAtual = agora.format('YYYY-MM-DD');
    const horaAtual = agora.format('HH:mm');
    const agoraTimestamp = agora.valueOf();
    
    const dateOnly = extractDateOnly(consulta.date || '');
    if (!dateOnly) return false;
    
    // Verifica o status da consulta (tenta várias formas de acesso)
    const statusConsulta = consulta.raw?.Status || consulta.raw?.status || consulta.status;
    
    // 🎯 REGRA: Se a consulta está em andamento, verifica se está dentro da janela de 50 minutos do ScheduledAt
    if ((statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento') && consulta.time) {
      let inicioConsulta: number | null = null;
      
      // Prioriza ScheduledAt da ReservaSessao
      const reservaSessaoRaw = consulta.raw?.ReservaSessao;
      const reservaSessao = reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw)
        ? reservaSessaoRaw as { ScheduledAt?: string }
        : null;
      
      if (reservaSessao?.ScheduledAt) {
        try {
          // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
          const scheduledAtStr = reservaSessao.ScheduledAt;
          const [datePart, timePart] = scheduledAtStr.split(' ');
          if (datePart && timePart) {
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second = 0] = timePart.split(':').map(Number);
            const inicioConsultaDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`, 'America/Sao_Paulo');
            inicioConsulta = inicioConsultaDate.valueOf();
          }
        } catch (error) {
          console.error('[ProximasConsultas] Erro ao parsear ScheduledAt:', error);
        }
      }
      
      // Fallback: usa date/time se ScheduledAt não estiver disponível
      if (!inicioConsulta) {
        const [hh, mm] = consulta.time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
      
      if (inicioConsulta) {
        const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
        
        // Mostra se estiver dentro da janela de 50 minutos
        if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
          return true;
        } else {
          return false;
        }
      }
    }
    
    // FILTRO FINAL: NUNCA mostra datas retroativas para consultas não em andamento
    if (dateOnly < dataAtual) {
      return false;
    } else if (dateOnly > dataAtual) {
      // Data futura - SEMPRE mostra
      return true;
    } else {
      // Mesmo dia - verifica horário
      // IMPORTANTE: Mostra se o horário ainda não passou OU se está em andamento
      // Isso garante que consultas futuras no mesmo dia apareçam abaixo da atual
      const horaConsulta = consulta.time || '';
      return horaConsulta >= horaAtual; // >= para incluir consultas que começam agora
    }
  };

  // Filtra consultas que devem ser exibidas e limita pelo visibleCount
  // IMPORTANTE: Garante que sempre mostra a atual (primeira) + próximas abaixo
  const consultasParaExibir = useMemo(() => {
    const consultasFiltradas = normalizedList.filter(deveMostrarConsulta);
    
    console.log('[ProximasConsultas] Consultas filtradas:', {
      total: consultasFiltradas.length,
      primeira: consultasFiltradas[0] ? `${consultasFiltradas[0].date} ${consultasFiltradas[0].time}` : 'nenhuma',
      segunda: consultasFiltradas[1] ? `${consultasFiltradas[1].date} ${consultasFiltradas[1].time}` : 'nenhuma',
      visibleCount
    });
    
    // Sempre mostra pelo menos a primeira (consulta atual) + próximas
    // Garante que a próxima consulta apareça abaixo da atual
    return consultasFiltradas.slice(0, Math.max(visibleCount, 2)); // Mínimo 2 para garantir atual + próxima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedList, visibleCount]);

  // Verifica se há mais consultas para mostrar
  const temMaisConsultas = normalizedList.filter(deveMostrarConsulta).length > visibleCount;
  
  const perfilHref: string | undefined = isInPsicologoPanel
    ? (normalized?.pacienteId ? `${basePrefix}/paciente/${normalized.pacienteId}` : undefined)
    : (normalized?.psicologoId ? `${basePrefix}/psicologo/${normalized.psicologoId}` : undefined);

  const shouldShowPerfil: boolean = !hidePerfil && Boolean(perfilHref);
  
  // Função para carregar mais consultas
  const handleVerMais = () => {
    setVisibleCount(prev => prev + 3);
  };

  // 🎯 REGRA: Força atualização quando consulta em andamento passar de 50 minutos do ScheduledAt
  useEffect(() => {
    if (!normalized) return;
    
    const statusConsulta = normalized.raw?.Status || normalized.raw?.status || normalized.status;
    if ((statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento')) {
      let inicioConsulta: number | null = null;
      
      // Prioriza ScheduledAt da ReservaSessao usando função helper type-safe
      if (scheduledAtFromReserva) {
        inicioConsulta = scheduledAtToTimestamp(scheduledAtFromReserva);
      }
      
      // Fallback: usa date/time se ScheduledAt não estiver disponível
      if (!inicioConsulta && normalized.date && normalized.time) {
        const dateOnly = extractDateOnly(normalized.date);
        if (!dateOnly) return;
        
        const [hh, mm] = normalized.time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
      
      if (inicioConsulta) {
        const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
        const agoraTimestamp = dayjs().tz("America/Sao_Paulo").valueOf();
        
        // Calcula quanto tempo falta para passar de 50 minutos
        const tempoRestante = fimConsulta - agoraTimestamp;
        
        if (tempoRestante > 0) {
          // Agenda um timeout para forçar refetch quando passar de 50 minutos
          const timeout = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
          }, tempoRestante);
          
          return () => clearTimeout(timeout);
        }
      }
    }
  }, [normalized, scheduledAtFromReserva, queryClient]);

  useEffect(() => {
    if (!normalized?.id) return;
    const consultaId: string | undefined = normalized.id ? String(normalized.id) : undefined;
    ensureSocketConnection();
    if (!consultaId) return;
    
    // Função para mapear status do backend para status do frontend
    const mapStatusToFrontend = (status: string): ConsultationStatus | null => {
      const statusMap: Record<string, ConsultationStatus> = {
        "Andamento": "started",
        "Concluido": "Concluido",
        "Cancelado": "Cancelado",
        "cancelled_by_patient": "cancelled_by_patient",
        "cancelled_by_psychologist": "cancelled_by_psychologist",
      };
      return statusMap[status] || null;
    };

    // Listeners para eventos específicos da consulta
    onConsultationStartingSoon(() => setSocketStatus("startingSoon"), consultaId);
    onConsultationStarted(() => setSocketStatus("started"), consultaId);
    onConsultationEndingSoon(() => setSocketStatus("endingSoon"), consultaId);
    onConsultationEnded(() => setSocketStatus("Concluido"), consultaId);
    onConsultationCancelled(() => setSocketStatus("Cancelado"), consultaId);
    onConsultationCancelledByPatient(() => setSocketStatus("cancelled_by_patient"), consultaId);
    onConsultationCancelledByPsychologist(() => setSocketStatus("cancelled_by_psychologist"), consultaId);
    
    // Listener para mudanças de status gerais (ex: cancelamento automático)
    onConsultationStatusChanged((data) => {
      const mappedStatus = mapStatusToFrontend(data.status);
      if (mappedStatus) {
        setSocketStatus(mappedStatus);
        // Força refetch para atualizar dados do backend (incluindo ReservaSessao.Status)
        queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] });
        queryClient.invalidateQueries({ queryKey: ['consultaAtualEmAndamento'] });
        queryClient.invalidateQueries({ queryKey: ['reserva-sessao', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consulta', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] });
        queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] });
      }
    }, consultaId);

    return () => {
      const socket = getSocket();
      if (!socket) return;
      socket.off(`consultation:${consultaId}`);
      offConsultationStatusChanged(consultaId);
    };
  }, [normalized?.id, queryClient]);

  const calculateSessionState = (): SessionState => {
    const defaultState: SessionState = {
      fraseSessao: "",
      mostrarContador: false,
      contadorSessao: "",
      buttons: {
        mostrarBotaoEntrar: false,
        mostrarBotaoCancelar: false,
        mostrarBotaoReagendar: false,
        mostrarBotaoSuporte: false,
        botaoEntrarDesabilitado: true,
      },
    };

    // 🎯 Verifica se está no horário do ScheduledAt para habilitar o botão (declarado uma vez no início)
    const estaNoHorarioScheduledAt = podeEntrarNaSessao;
    
    // Se está no horário do ScheduledAt, sempre mostra o botão habilitado
    if (estaNoHorarioScheduledAt) {
      return {
        fraseSessao: socketStatus === "started" ? "Sua sessão já começou há" : "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }
    
    if (socketStatus === "startingSoon") {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true },
      };
    }

    if (socketStatus === "started") {
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (socketStatus === "endingSoon") {
      return {
        fraseSessao: "Sua sessão está encerrando em breve.",
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (["Concluido", "Cancelado", "cancelled_by_patient", "cancelled_by_psychologist"].includes(socketStatus || "")) {
      const frases: Record<string, string> = {
        Concluido: "Sua sessão foi encerrada.",
        Cancelado: "Sua sessão foi cancelada.",
        cancelled_by_patient: "Consulta cancelada por ausência do paciente.",
        cancelled_by_psychologist: "Psicólogo ausente. Consulta recreditada.",
      };

      return {
        fraseSessao: frases[socketStatus || ""],
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoSuporte: true },
      };
    }

    // Se está no horário do ScheduledAt, sempre mostra o botão habilitado
    // (usa a variável já declarada no início da função)
    if (estaNoHorarioScheduledAt) {
      return {
        fraseSessao: mostrarSessao && sessaoAtiva ? "Sua sessão já começou há" : "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }
    
    if (mostrarSessao && !sessaoAtiva && !sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true },
      };
    }

    if (mostrarSessao && sessaoAtiva && !sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: true,
        contadorSessao: contador,
        buttons: { ...defaultState.buttons, mostrarBotaoEntrar: true, botaoEntrarDesabilitado: false },
      };
    }

    if (mostrarSessao && sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão foi encerrada por inatividade.",
        mostrarContador: false,
        contadorSessao: "",
        buttons: { ...defaultState.buttons, mostrarBotaoSuporte: true },
      };
    }

    if (normalized?.date && normalized?.time) {
      const dataObj = new Date(normalized.date);
      const [hora, minuto] = String(normalized.time).split(":");
      dataObj.setHours(Number(hora), Number(minuto), 0, 0);
      const diffMs: number = dataObj.getTime() - new Date().getTime();
      const HOUR_24_MS = 24 * 60 * 60 * 1000;

      // Regra: paciente pode cancelar até 24h antes
      if (role === "paciente") {
        if (diffMs > HOUR_24_MS) {
          // Pode cancelar, mas não pode entrar
          return { ...defaultState, buttons: { ...defaultState.buttons, mostrarBotaoCancelar: true, botaoEntrarDesabilitado: true } };
        } else if (diffMs > 0 && diffMs <= HOUR_24_MS) {
          // Não pode cancelar, mas pode entrar se for o horário
          return { ...defaultState, buttons: { ...defaultState.buttons, mostrarBotaoCancelar: false, botaoEntrarDesabilitado: false } };
        } else if (diffMs <= 0) {
          // Consulta já começou ou passou, não pode cancelar
          return { ...defaultState, buttons: { ...defaultState.buttons, mostrarBotaoCancelar: false, botaoEntrarDesabilitado: false } };
        }
      }
    }

    return defaultState;
  };

  const sessionState = calculateSessionState();
  const { fraseSessao, mostrarContador, contadorSessao, buttons } = sessionState;

  // Verifica se pode reagendar (mais de 24h antes da consulta)
  const podeReagendar = (() => {
    if (!normalized?.date || !normalized?.time) return false;
    const dataObj = new Date(normalized.date);
    const [hora, minuto] = String(normalized.time).split(":");
    dataObj.setHours(Number(hora), Number(minuto), 0, 0);
    const diffMs = dataObj.getTime() - new Date().getTime();
    const HOUR_24_MS = 24 * 60 * 60 * 1000;
    return diffMs > HOUR_24_MS;
  })();

  const handleNavigateToPerfil = (): void => {
    if (shouldShowPerfil && perfilHref) {
      router.push(perfilHref);
    } 
  };

  const handleSuporte = (): void => {
    const mensagem = encodeURIComponent("Olá, preciso de suporte técnico na Estação Terapia. Tenho dúvidas ou estou com problemas na plataforma.");
    window.open(`https://wa.me/5511960892131?text=${mensagem}`, "_blank");
  };

  // 🎯 Handler para entrar na sessão diretamente (sem abrir modal)
  async function handleEntrarNaSessao() {
    if (!normalized?.id || isProcessingEntry || isCheckingTokens) return;
    
    setIsProcessingEntry(true);
    
    try {
      const consultaId = String(normalized.id);
      
      // 🎯 REGISTRA PRESENÇA ANTES DE REDIRECIONAR
      // Cada usuário (paciente ou psicólogo) registra sua própria presença
      if (loggedUserId) {
        try {
          console.log('📹 [ProximasConsultas] Registrando presença do paciente:', {
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Patient'
          });
          
          await joinConsultation({
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Patient'
          });
          
          console.log('✅ [ProximasConsultas] Presença do paciente registrada com sucesso');
        } catch (presencaError) {
          console.error('⚠️ [ProximasConsultas] Erro ao registrar presença (não bloqueante):', presencaError);
          // Não bloqueia o fluxo se houver erro ao registrar presença
        }
      } else {
        console.warn('⚠️ [ProximasConsultas] loggedUserId não disponível, pulando registro de presença');
      }
      
      // Verifica/gera tokens antes de entrar
      const tokensResult = await checkAndGenerateTokens(consultaId);
      
      if (tokensResult && tokensResult.success) {
        // Redireciona para a sala
        const reservaSessao = normalized.raw?.ReservaSessao as { AgoraChannel?: string } | undefined;
        const channel = reservaSessao?.AgoraChannel || `sala_${consultaId}`;
        router.push(`${basePrefix}/room/${consultaId}/${channel}`);
      } else {
        console.error('[ProximasConsultas] Falha ao gerar tokens');
      }
    } catch (error) {
      console.error('[ProximasConsultas] Erro ao entrar na sessão:', error);
    } finally {
      setIsProcessingEntry(false);
    }
  }

  // 🎯 Verifica se pode entrar na sessão baseado no ScheduledAt
  const podeEntrarNaSessao = useMemo(() => {
    if (!normalized?.date || !normalized?.time) return false;
    
    try {
      let inicioConsulta: number | null = null;
      
      // Prioriza ScheduledAt da ReservaSessao usando função helper type-safe
      if (scheduledAtFromReserva) {
        inicioConsulta = scheduledAtToTimestamp(scheduledAtFromReserva);
      }
      
      // Fallback: usa date/time se ScheduledAt não estiver disponível
      if (!inicioConsulta) {
        const dateOnly = extractDateOnly(normalized.date);
        if (!dateOnly) return false;
        
        const [hh, mm] = normalized.time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
      
      if (inicioConsulta) {
        const agoraBr = dayjs().tz('America/Sao_Paulo');
        const agoraTimestamp = agoraBr.valueOf();
        const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
        
        // 🎯 Habilita exatamente no ScheduledAt até 50 minutos depois
        return agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta;
      }
    } catch {
      return false;
    }
    
    return false;
  }, [normalized?.date, normalized?.time, scheduledAtFromReserva]);

  // Função para obter tag de status
  const obterTagStatus = (consulta: typeof normalizedList[0]) => {
    if (!consulta) return null;
    
    const cancelamentoSessao = consulta.raw?.CancelamentoSessao;
    const cancelamento = Array.isArray(cancelamentoSessao) && cancelamentoSessao.length > 0 
      ? cancelamentoSessao[0] 
      : cancelamentoSessao;
    
    const tipoCancelamentoMap: Record<string, string> = {
      'PACIENTE': 'Cancelada pelo paciente',
      'PSICOLOGO': 'Cancelada pelo psicólogo',
      'SISTEMA': 'Cancelada pelo sistema',
    };
    
    const statusCancelamentoMap: Record<string, string> = {
      'EmAnalise': 'Em análise',
      'Deferido': 'Cancelada',
      'Indeferido': 'Cancelamento indeferido',
      'Cancelado': 'Cancelada',
    };
    
    let dataObj: Date | null = null;
    const dataStr = String(consulta.date);
    const horarioStr = String(consulta.time);
    if (dataStr && horarioStr) {
      if (dataStr.includes("T") || dataStr.length > 10) {
        dataObj = new Date(dataStr);
        const [hora, minuto] = horarioStr.split(":");
        if (hora && minuto) dataObj.setHours(Number(hora), Number(minuto), 0, 0);
      } else {
        const [ano, mes, dia] = dataStr.split("-");
        const [hora, minuto] = horarioStr.split(":");
        if (ano && mes && dia && hora && minuto) {
          dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
        }
      }
    }
    const agora = new Date();
    
    const reservaSessaoRaw = consulta.raw?.ReservaSessao;
    const reservaSessao = reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw) 
      ? reservaSessaoRaw as { Status?: string; status?: string }
      : null;
    const statusReservaSessao = reservaSessao?.Status || reservaSessao?.status;
    const statusConsulta = statusReservaSessao || consulta.raw?.Status || consulta.raw?.status || consulta.status;
    
    // Verifica se a consulta é futura (ainda não aconteceu)
    let isConsultaFutura = false;
    if (dataObj) {
      const inicioConsulta = dataObj.getTime();
      const agoraTimestamp = agora.getTime();
      // Consulta é futura se ainda não começou
      isConsultaFutura = inicioConsulta > agoraTimestamp;
    }
    
    // Verifica se está em andamento (dentro da janela de 1 hora)
    if ((statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento') && dataObj) {
      const inicioConsulta = dataObj.getTime();
      const fimConsulta = inicioConsulta + (60 * 60 * 1000);
      const agoraTimestamp = agora.getTime();
      
      if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#2E7D32] shadow">Em Andamento</span>;
      }
    }
    
    // Usa função centralizada para obter informações do status
    const statusFinal = statusReservaSessao || statusConsulta;
    const statusFinalString: string | null | undefined = typeof statusFinal === 'string' 
      ? statusFinal 
      : statusFinal != null 
        ? String(statusFinal) 
        : null;
    
    // Se a consulta é futura, não mostra status de "não compareceu" ou outros status que só fazem sentido após a consulta
    // Para consultas futuras, mostra apenas "Reservado" ou "Agendada"
    if (isConsultaFutura && statusFinalString) {
      const statusInvalidosParaFuturas = [
        'PacienteNaoCompareceu',
        'Paciente Não Compareceu',
        'PsicologoNaoCompareceu',
        'Psicólogo Não Compareceu',
        'Cancelled_no_show',
        'cancelled_no_show',
        'Ausente',
        'Realizada',
        'Concluido',
        'Concluído'
      ];
      
      const statusLower = statusFinalString.toLowerCase();
      const isStatusInvalido = statusInvalidosParaFuturas.some(invalido => 
        statusLower.includes(invalido.toLowerCase()) || 
        statusFinalString === invalido
      );
      
      if (isStatusInvalido) {
        // Para consultas futuras com status inválido, força "Reservado"
        const tagInfo = getStatusTagInfo('Reservado');
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow`}>{tagInfo.texto}</span>;
      }
    }
    
    const tagInfo = getStatusTagInfo(statusFinalString);
    
    if (statusReservaSessao || statusConsulta) {
      return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow`}>{tagInfo.texto}</span>;
    }
    
    if (cancelamento && cancelamento.Status) {
      const statusCancelamento = cancelamento.Status;
      const tipoCancelamento = cancelamento.Tipo;
      
      if (statusCancelamento === 'Deferido' || statusCancelamento === 'Cancelado') {
        const textoCancelamento = tipoCancelamento && tipoCancelamentoMap[tipoCancelamento]
          ? tipoCancelamentoMap[tipoCancelamento]
          : statusCancelamentoMap[statusCancelamento] || 'Cancelada';
        
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE5E5] text-[#C53030] shadow">{textoCancelamento}</span>;
      }
      
      if (statusCancelamento === 'EmAnalise') {
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E6] text-[#E65100] shadow">Cancelamento em análise</span>;
      }
    }
    
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6E9FF] text-[#6D75C0] shadow">Reservado</span>;
  };

  // Função para verificar se pode reagendar
  const podeReagendarConsulta = (consulta: typeof normalizedList[0]): boolean => {
    if (!consulta?.date || !consulta?.time) return false;
    const dataObj = new Date(consulta.date);
    const [hora, minuto] = String(consulta.time).split(":");
    dataObj.setHours(Number(hora), Number(minuto), 0, 0);
    const diffMs = dataObj.getTime() - new Date().getTime();
    const HOUR_24_MS = 24 * 60 * 60 * 1000;
    return diffMs > HOUR_24_MS;
  };

  // Função para renderizar card simples de consulta (para consultas após a primeira)
  const renderConsultaCardSimples = (consulta: typeof normalizedList[0], index: number) => {
    if (!consulta) return null;
    
    const perfilHrefItem = isInPsicologoPanel
      ? (consulta.pacienteId ? `${basePrefix}/paciente/${consulta.pacienteId}` : undefined)
      : (consulta.psicologoId ? `${basePrefix}/psicologo/${consulta.psicologoId}` : undefined);
    
    const shouldShowPerfilItem = !hidePerfil && Boolean(perfilHrefItem);
    const podeReagendarItem = podeReagendarConsulta(consulta);
    
    const handleAbrirModalConsultaItem = () => {
      const avatarPsicologo = getContextualAvatar(isInPsicologoPanel, consulta.psicologo, consulta.paciente);
      const rawData = consulta.raw && typeof consulta.raw === 'object' && consulta.raw !== null 
        ? consulta.raw as { Date?: string; Time?: string; Agenda?: { Data?: string; Horario?: string } }
        : null;
      const dataParaModal = consulta.date || rawData?.Date || rawData?.Agenda?.Data || "";
      const horarioParaModal = consulta.time || rawData?.Time || rawData?.Agenda?.Horario || "";
      
      const consultaData: ConsultaModalData = {
        data: dataParaModal,
        horario: horarioParaModal,
        psicologo: consulta.psicologo ? {
          nome: consulta.psicologo.nome || "",
          id: String(consulta.psicologoId || consulta.psicologo.id || ""),
          avatarUrl: consulta.psicologo.imageUrl || avatarPsicologo,
          Image: consulta.psicologo.imageUrl ? [{ Url: consulta.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
        paciente: consulta.paciente ? {
          nome: consulta.paciente.nome || "",
          id: String(consulta.pacienteId || consulta.paciente.id || ""),
          avatarUrl: consulta.paciente.imageUrl || avatarPsicologo,
          Image: consulta.paciente.imageUrl ? [{ Url: consulta.paciente.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
      };
      setConsultaSelecionada(consultaData);
      setConsultaNormalizadaSelecionada(consulta); // Armazena a consulta normalizada para usar no cancelamento
      setConsultaIdReagendar(consulta.id ? String(consulta.id) : "");
      setShowModal(true);
    };

    const handleReagendarConsultaItem = () => {
      if (consulta.id) {
        setConsultaIdReagendar(String(consulta.id));
        const avatarPsicologo = getContextualAvatar(isInPsicologoPanel, consulta.psicologo, consulta.paciente);
        const consultaData: ConsultaModalData = {
          data: consulta.date,
          horario: consulta.time,
          psicologo: consulta.psicologo ? {
            nome: consulta.psicologo.nome,
            id: String(consulta.psicologoId || consulta.psicologo.id || ""),
            Image: consulta.psicologo.imageUrl ? [{ Url: consulta.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
          } : undefined,
          paciente: consulta.paciente ? {
            nome: consulta.paciente.nome,
          } : undefined,
        };
        setConsultaSelecionada(consultaData);
      }
      setShowModalReagendar(true);
    };

    return (
      <motion.div
        key={consulta.id || index}
        className="relative bg-[#F5F7FF] shadow rounded-xl w-full max-w-full sm:max-w-[640px] p-4 mb-6 min-h-[180px] sm:min-h-[160px]"
        style={{ opacity: 1, borderRadius: 12 }}
        {...ANIMATION_VARIANTS.card}
      >
        {/* Mobile Layout */}
        <div className="flex flex-row items-start gap-4 w-full sm:hidden">
          <div className="relative shrink-0">
            <Image
              src={getContextualAvatar(isInPsicologoPanel, consulta.psicologo, consulta.paciente) || "/assets/avatar-placeholder.svg"}
              alt={role === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
              width={64}
              height={64}
              className="w-14 h-14 rounded-full object-cover border border-[#E6E9FF]"
            />
          </div>
          <div className="flex flex-col flex-1 gap-1 min-w-0">
            <span className="text-[#232A5C] font-semibold text-sm leading-5 truncate">
              {isInPsicologoPanel ? obterPrimeiroUltimoNome(consulta.paciente?.nome) : obterPrimeiroUltimoNome(consulta.psicologo?.nome)}
            </span>
            <span className="text-[#6B7280] text-xs">
              {consulta.date && consulta.time ? `${formatarDataHora(consulta.date, consulta.time)}` : ""}
            </span>
          </div>
          <div className="flex flex-col items-end gap-2 min-w-fit pt-8 sm:pt-0">
            {shouldShowPerfilItem && (
              <button
                onClick={() => perfilHrefItem && router.push(perfilHrefItem)}
                className="text-[#232A5C] hover:underline text-sm fira-sans"
              >
                Ver perfil
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-[4px] mt-2 sm:hidden w-full">
          {role === "paciente" && podeReagendarItem && (
            <button
              onClick={handleReagendarConsultaItem}
              className="flex-1 min-h-[44px] h-11 px-2 rounded-[3px] text-xs font-semibold fira-sans border border-[#6D75C0] text-[#6D75C0] bg-transparent hover:bg-[#E6E9FF] transition-shadow"
            >
              Reagendar
            </button>
          )}
          <button
            onClick={handleAbrirModalConsultaItem}
            className={`${role === "paciente" && podeReagendarItem ? 'flex-1' : 'w-full'} min-h-[44px] h-11 px-2 rounded-[3px] text-white text-xs font-semibold fira-sans bg-[#8494E9] hover:bg-[#6D75C0] transition-shadow`}
          >
            Ver detalhes
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex flex-row items-start gap-4 w-full">
          <div className="flex flex-row items-start gap-4 flex-1">
            <div className="relative shrink-0">
              <Image
                src={getContextualAvatar(isInPsicologoPanel, consulta.psicologo, consulta.paciente) || "/assets/avatar-placeholder.svg"}
                alt={role === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border border-[#E6E9FF]"
              />
            </div>
            <div className="flex flex-col flex-1 gap-1">
              <span className="text-[#232A5C] font-semibold text-base leading-5">
                {isInPsicologoPanel ? obterPrimeiroUltimoNome(consulta.paciente?.nome) : obterPrimeiroUltimoNome(consulta.psicologo?.nome)}
              </span>
              <span className="text-[#6B7280] text-sm fira-sans">
                {consulta.date && consulta.time ? `${formatarDataHora(consulta.date, consulta.time)}` : ""}
              </span>
              {shouldShowPerfilItem && (
                <button
                  onClick={() => perfilHrefItem && router.push(perfilHrefItem)}
                  className="text-left text-[#6D75C0] hover:underline text-sm font-medium fira-sans cursor-pointer mt-1"
                >
                  Ver perfil
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            {obterTagStatus(consulta)}
            
            <div className="flex flex-row gap-3">
              {role === "paciente" && podeReagendarItem && (
                <button
                  onClick={handleReagendarConsultaItem}
                  className="min-h-[44px] h-11 border border-[#6D75C0] text-[#6D75C0] fira-sans font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#E6E9FF] hover:text-[#232A5C] whitespace-nowrap cursor-pointer"
                >
                  Reagendar
                </button>
              )}
              <button
                onClick={handleAbrirModalConsultaItem}
                className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
              >
                Ver detalhes
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Verifica se não há consultas para exibir
  if (consultasParaExibir.length === 0) {
    return (
      <motion.section className="p-4 w-full" initial={ANIMATION_VARIANTS.container.initial} animate={ANIMATION_VARIANTS.container.animate} transition={ANIMATION_VARIANTS.container.transition}>
        <h2 className="text-base font-bold md:text-lg mb-4 fira-sans text-gray-800 px-2">
          Próximas consultas
        </h2>
        <motion.p className="text-gray-500 font-sans text-left px-2" initial={ANIMATION_VARIANTS.text.initial} animate={ANIMATION_VARIANTS.text.animate} transition={ANIMATION_VARIANTS.text.transition}>
          Você ainda não possui nenhuma consulta agendada.
        </motion.p>
      </motion.section>
    );
  }

  // Função para abrir o modal de detalhes da consulta
  const handleAbrirModalConsulta = () => {
    if (normalized) {
      const avatarPsicologo = getContextualAvatar(isInPsicologoPanel, normalized.psicologo, normalized.paciente);
      // Garante que usa a mesma data que está sendo exibida no card
      // Usa a data original do normalized (que já foi normalizada corretamente)
      const rawData = normalized.raw && typeof normalized.raw === 'object' && normalized.raw !== null 
        ? normalized.raw as { Date?: string; Time?: string; Agenda?: { Data?: string; Horario?: string } }
        : null;
      const dataParaModal = normalized.date || rawData?.Date || rawData?.Agenda?.Data || "";
      const horarioParaModal = normalized.time || rawData?.Time || rawData?.Agenda?.Horario || "";
      
      const consultaData: ConsultaModalData = {
        data: dataParaModal,
        horario: horarioParaModal,
        psicologo: normalized.psicologo ? {
          nome: normalized.psicologo.nome || "",
          id: String(normalized.psicologoId || normalized.psicologo.id || ""),
          avatarUrl: normalized.psicologo.imageUrl || avatarPsicologo,
          Image: normalized.psicologo.imageUrl ? [{ Url: normalized.psicologo.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
        paciente: normalized.paciente ? {
          nome: normalized.paciente.nome || "",
          id: String(normalized.pacienteId || normalized.paciente.id || ""),
          avatarUrl: normalized.paciente.imageUrl || avatarPsicologo,
          Image: normalized.paciente.imageUrl ? [{ Url: normalized.paciente.imageUrl }] : (avatarPsicologo ? [{ Url: avatarPsicologo }] : undefined),
        } : undefined,
      };
      setConsultaSelecionada(consultaData);
      setConsultaNormalizadaSelecionada(normalized); // Armazena a consulta normalizada para usar no cancelamento
    }
    setShowModal(true);
  };

  return (
    <motion.section
      className="w-full flex flex-col items-start"
      {...ANIMATION_VARIANTS.container}
    >
      <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">Próximas consultas</h3>
      
      {/* Primeira consulta (com toda a lógica de sessão e socket) */}
      {/* IMPORTANTE: consultasParaExibir já foi filtrado por deveMostrarConsulta, então não precisa verificar novamente */}
      {consultasParaExibir.length > 0 && consultasParaExibir[0] && (
        <motion.div
          {...ANIMATION_VARIANTS.card}
        >
          <Card className={`relative bg-white shadow rounded-xl w-full max-w-full sm:max-w-[520px] sm:w-[520px] sm:h-[160px] mb-6 min-h-[180px] sm:min-h-[160px] border-0`}
            style={{ opacity: 1, borderRadius: 12 }}
          >
            <CardContent className="p-4 sm:p-6 sm:h-full sm:flex sm:flex-col sm:justify-between">
          {/* Mobile: Layout igual a Consultas Agendadas */}
          {/* Linha superior: avatar + info + link perfil no canto direito */}
          <div className="flex flex-row items-start gap-4 w-full sm:hidden">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Image
                src={getContextualAvatar(isInPsicologoPanel, normalized.psicologo, normalized.paciente) || "/assets/avatar-placeholder.svg"}
                alt={role === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
                width={64}
                height={64}
                className="w-14 h-14 rounded-full object-cover border border-[#E6E9FF]"
              />
            </div>
            {/* Informações: nome, data/hora */}
            <div className="flex flex-col flex-1 gap-1 min-w-0">
              <span className="text-[#232A5C] font-semibold text-sm leading-5 truncate flex items-center gap-1.5">
                <Image src="/icons/avatar.svg" alt="Usuário" width={16} height={16} className="shrink-0" />
                {isInPsicologoPanel ? obterPrimeiroUltimoNome(normalized.paciente?.nome) : obterPrimeiroUltimoNome(normalized.psicologo?.nome)}
              </span>
              <span className="text-[#6B7280] text-xs flex items-center gap-1.5">
                <Image src="/icons/calendar.svg" alt="Calendário" width={16} height={16} className="shrink-0" />
                {normalized.date && normalized.time ? `${formatarDataHora(normalized.date, normalized.time)}` : ""}
              </span>
            </div>
            {/* Link Ver perfil abaixo da tag de status (mobile) */}
            <div className="flex flex-col items-end gap-2 min-w-fit pt-8 sm:pt-0">
              {shouldShowPerfil && (
                <button
                  onClick={handleNavigateToPerfil}
                  className="text-[#232A5C] hover:underline text-sm fira-sans"
                >
                  Ver perfil
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile: Botões abaixo do avatar, lado a lado ocupando toda largura */}
          <div className="flex gap-[4px] mt-2 sm:hidden w-full">
            {role === "paciente" && podeReagendar && (
              <button
                onClick={handleReagendarConsulta}
                className="flex-1 min-h-[44px] h-11 px-2 rounded-[3px] text-xs font-semibold fira-sans border border-[#6D75C0] text-[#6D75C0] bg-transparent hover:bg-[#E6E9FF] transition-shadow"
                style={{ opacity: 1 }}
              >
                Reagendar
              </button>
            )}
            {buttons.mostrarBotaoEntrar ? (
              <button
                disabled={!podeEntrarNaSessao || isProcessingEntry || isCheckingTokens}
                onClick={handleEntrarNaSessao}
                className={`${role === "paciente" && podeReagendar ? 'flex-1' : 'w-full'} min-h-[44px] h-11 px-2 rounded-[3px] text-xs font-semibold fira-sans transition-shadow ${
                  podeEntrarNaSessao && !isProcessingEntry && !isCheckingTokens
                    ? 'bg-[#232A5C] hover:bg-[#232A5C]/90 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{ opacity: 1 }}
              >
                {isProcessingEntry || isCheckingTokens ? 'Aguarde...' : 'Acessar consulta'}
              </button>
            ) : (
              <button
                onClick={handleAbrirModalConsulta}
                className={`${role === "paciente" && podeReagendar ? 'flex-1' : 'w-full'} min-h-[44px] h-11 px-2 rounded-[3px] text-white text-xs font-semibold fira-sans bg-[#8494E9] hover:bg-[#6D75C0] transition-shadow`}
                style={{ opacity: 1 }}
              >
                Ver detalhes
              </button>
            )}
            {/* Botão de suporte do WhatsApp para status especiais após o horário ou sessão encerrada por inatividade */}
            {(() => {
              const status6h = ["cancelled_by_patient", "cancelled_by_psychologist", "cancelled_no_show"];
              let dataObj: Date | null = null;
              const dataStr = String(normalized.date);
              const horarioStr = String(normalized.time);
              if (dataStr && horarioStr) {
                if (dataStr.includes("T") || dataStr.length > 10) {
                  dataObj = new Date(dataStr);
                  const [hora, minuto] = horarioStr.split(":");
                  if (hora && minuto) dataObj.setHours(Number(hora), Number(minuto), 0, 0);
                } else {
                  const [ano, mes, dia] = dataStr.split("-");
                  const [hora, minuto] = horarioStr.split(":");
                  if (ano && mes && dia && hora && minuto) {
                    dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
                  }
                }
              }
              const agora = new Date();
              if (
                (dataObj && agora.getTime() > dataObj.getTime() && status6h.includes(socketStatus || "")) ||
                fraseSessao === "Sua sessão foi encerrada por inatividade."
              ) {
                return (
                  <button onClick={handleSuporte} className="flex-1 min-h-[44px] h-11 px-2 rounded-[3px] text-white text-xs font-semibold fira-sans bg-[#25D366] hover:bg-[#128C7E] transition-shadow">
                    Fale com o Suporte
                  </button>
                );
              }
              return null;
            })()}
          </div>

          {/* Desktop: Layout original */}
          <div className="hidden sm:flex flex-row items-start gap-4 w-full">
            {/* Lado Esquerdo: Avatar + Informações */}
            <div className="flex flex-row items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Image
                  src={getContextualAvatar(isInPsicologoPanel, normalized.psicologo, normalized.paciente) || "/assets/avatar-placeholder.svg"}
                  alt={role === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border border-[#E6E9FF]"
                />
              </div>
              {/* Informações: nome, data/hora, link perfil */}
              <div className="flex flex-col flex-1 gap-1">
                <span className="text-[#232A5C] font-semibold text-base leading-5 flex items-center gap-1.5">
                  <Image src="/icons/avatar.svg" alt="Usuário" width={16} height={16} className="shrink-0" />
                  {isInPsicologoPanel ? obterPrimeiroUltimoNome(normalized.paciente?.nome) : obterPrimeiroUltimoNome(normalized.psicologo?.nome)}
                </span>
                <span className="text-[#6B7280] text-sm fira-sans flex items-center gap-1.5">
                  <Image src="/icons/calendar.svg" alt="Calendário" width={16} height={16} className="shrink-0" />
                  {normalized.date && normalized.time ? `${formatarDataHora(normalized.date, normalized.time)}` : ""}
                </span>
                {/* Link Ver perfil */}
                {shouldShowPerfil && (
                  <button
                    onClick={handleNavigateToPerfil}
                    className="text-left text-[#6D75C0] hover:underline text-sm font-medium fira-sans cursor-pointer mt-1"
                  >
                    Ver perfil
                  </button>
                )}
              </div>
            </div>
            
            {/* Lado Direito: Tag (topo) + Contador (meio) + Botão (embaixo) */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Tag de status no topo direito - removida da posição absoluta, agora no fluxo normal */}
              {(() => {
                // Busca informações de cancelamento da tabela CancelamentoSessao
                const cancelamentoSessao = normalized.raw?.CancelamentoSessao;
                const cancelamento = Array.isArray(cancelamentoSessao) && cancelamentoSessao.length > 0 
                  ? cancelamentoSessao[0] 
                  : cancelamentoSessao;
                
                // Mapeia tipo de cancelamento para texto
                const tipoCancelamentoMap: Record<string, string> = {
                  'PACIENTE': 'Cancelada pelo paciente',
                  'PSICOLOGO': 'Cancelada pelo psicólogo',
                  'SISTEMA': 'Cancelada pelo sistema',
                };
                
                // Mapeia status de cancelamento para texto
                const statusCancelamentoMap: Record<string, string> = {
                  'EmAnalise': 'Em análise',
                  'Deferido': 'Cancelada',
                  'Indeferido': 'Cancelamento indeferido',
                  'Cancelado': 'Cancelada',
                };
                
                let dataObj: Date | null = null;
                const dataStr = String(normalized.date);
                const horarioStr = String(normalized.time);
                if (dataStr && horarioStr) {
                  if (dataStr.includes("T") || dataStr.length > 10) {
                    dataObj = new Date(dataStr);
                    const [hora, minuto] = horarioStr.split(":");
                    if (hora && minuto) dataObj.setHours(Number(hora), Number(minuto), 0, 0);
                  } else {
                    const [ano, mes, dia] = dataStr.split("-");
                    const [hora, minuto] = horarioStr.split(":");
                    if (ano && mes && dia && hora && minuto) {
                      dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
                    }
                  }
                }
                const agora = new Date();
                
                // Prioriza ReservaSessao.Status, depois Consulta.Status    
                const reservaSessaoRaw = normalized.raw?.ReservaSessao;
                const reservaSessao = reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw) 
                  ? reservaSessaoRaw as { Status?: string; status?: string; ScheduledAt?: string }
                  : null;
                const statusReservaSessao = reservaSessao?.Status || reservaSessao?.status;
                const statusConsulta = statusReservaSessao || normalized.raw?.Status || normalized.raw?.status || normalized.status;
                
                // 🎯 REGRA: Verifica se está em andamento usando ScheduledAt da ReservaSessao (50 minutos)
                // Se status for EmAndamento/Andamento e dentro de 50 minutos do ScheduledAt, mostra "Ao vivo"
                if ((statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento')) {
                  let inicioConsulta: number | null = null;
                  
                  // Prioriza ScheduledAt da ReservaSessao usando função helper type-safe
                  const scheduledAt = extractScheduledAtFromNormalized(normalized);
                  if (scheduledAt) {
                    inicioConsulta = scheduledAtToTimestamp(scheduledAt);
                  }
                  
                  // Fallback: usa dataObj se ScheduledAt não estiver disponível
                  if (!inicioConsulta && dataObj) {
                    inicioConsulta = dataObj.getTime();
                  }
                  
                  if (inicioConsulta) {
                    const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
                    const agoraTimestamp = agora.getTime();
                    
                    if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
                      // 🎯 Mostra tag "Ao vivo" quando consulta está em andamento
                      // Mantém status "Agendada" conforme solicitado
                      return (
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6E9FF] text-[#6D75C0] shadow">
                            Agendada
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F4EA] text-[#2E7D32] shadow">
                            Ao vivo
                          </span>
                        </div>
                      );
                    }
                  }
                }
                
                // Usa função centralizada para obter informações do status
                const statusFinal = statusReservaSessao || statusConsulta;
                const statusStr = typeof statusFinal === 'string' ? statusFinal : (typeof statusFinal === 'number' || typeof statusFinal === 'boolean' ? String(statusFinal) : undefined);
                const tagInfo = getStatusTagInfo(statusStr);
                
                // Verifica status de ReservaSessao primeiro
                if (statusReservaSessao || statusConsulta) {
                  return (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow`}>
                      {tagInfo.texto}
                    </span>
                  );
                }
                
                // Verifica se há cancelamento na tabela CancelamentoSessao
                // 🎯 REGRA: Para cancelamento por inatividade, mostra status de acordo com quem não compareceu
                if (cancelamento && cancelamento.Status) {
                  const statusCancelamento = cancelamento.Status;
                  const tipoCancelamento = cancelamento.Tipo;
                  
                  // Mostra tag de cancelada se o status for Deferido ou Cancelado
                  if (statusCancelamento === 'Deferido' || statusCancelamento === 'Cancelado') {
                    // 🎯 Determina o texto baseado no Tipo de cancelamento (Paciente, Psicologo ou Sistema/ambos)
                    let textoCancelamento = 'Cancelada';
                    
                    if (tipoCancelamento === 'Paciente') {
                      textoCancelamento = 'Paciente não compareceu';
                    } else if (tipoCancelamento === 'Psicologo') {
                      textoCancelamento = 'Psicólogo não compareceu';
                    } else if (tipoCancelamento === 'Sistema') {
                      // Sistema = ambos não compareceram
                      textoCancelamento = 'Consulta cancelada';
                    } else if (tipoCancelamento && tipoCancelamentoMap[tipoCancelamento]) {
                      textoCancelamento = tipoCancelamentoMap[tipoCancelamento];
                    } else {
                      textoCancelamento = statusCancelamentoMap[statusCancelamento] || 'Cancelada';
                    }
                    
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE5E5] text-[#C53030] shadow">
                        {textoCancelamento}
                      </span>
                    );
                  }
                  
                  // Mostra tag de em análise se o status for EmAnalise
                  if (statusCancelamento === 'EmAnalise') {
                    return (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E6] text-[#E65100] shadow">
                        Cancelamento em análise
                      </span>
                    );
                  }
                }
                
                // Fallback: Tags de cancelamento via socketStatus (mantém compatibilidade)
                const statusMap: Record<string, string> = {
                  cancelled_by_patient: 'Cancelada pelo paciente',
                  cancelled_by_psychologist: 'Cancelada pelo psicólogo',
                  cancelled_no_show: 'Não compareceu',
                };
                const status6h = ["cancelled_by_patient", "cancelled_by_psychologist", "cancelled_no_show"];
                
                if (
                  dataObj &&
                  agora.getTime() > dataObj.getTime() &&  
                  status6h.includes(socketStatus || "")
                ) {
                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE5E5] text-[#C53030] shadow">
                      {statusMap[socketStatus || ""]}
                    </span>
                  );
                }
                
                // Status padrão: Reservado
                return (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E6E9FF] text-[#6D75C0] shadow">
                    Reservado
                  </span>
                );
              })()}
              
              {/* Contador inline com frase e relógio - abaixo da tag */}
              {(fraseSessao || mostrarContador) && (
                <div className="flex items-center gap-2 bg-[#E6E9FF] rounded-lg px-3 py-1.5">
                  {mostrarContador && (
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#8494E9" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  {fraseSessao && <span className="text-[#232A5C] text-sm font-medium fira-sans">{fraseSessao}</span>}
                  {mostrarContador && <span className="text-[#8494E9] text-base font-bold fira-sans">{contadorSessao}</span>}
                </div>
              )}
              
              {/* Botão - abaixo do contador */}
              <div className="flex flex-row gap-3 justify-end">
                {role === "paciente" && podeReagendar && (
                  <button
                    onClick={handleReagendarConsulta}
                    className="min-h-[44px] h-11 border border-[#6D75C0] text-[#6D75C0] fira-sans font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#E6E9FF] hover:text-[#232A5C] whitespace-nowrap cursor-pointer"
                  >
                    Reagendar
                  </button>
                )}
                {buttons.mostrarBotaoEntrar ? (
                  <button
                    disabled={!podeEntrarNaSessao || isProcessingEntry || isCheckingTokens}
                    onClick={handleEntrarNaSessao}
                    className={`min-h-[44px] h-11 rounded-[6px] px-4 text-sm font-medium transition whitespace-nowrap ${
                      podeEntrarNaSessao && !isProcessingEntry && !isCheckingTokens
                        ? 'bg-[#232A5C] hover:bg-[#232A5C]/90 text-white cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isProcessingEntry || isCheckingTokens ? 'Aguarde...' : 'Acessar consulta'}
                  </button>
                ) : (
                  <button
                    onClick={handleAbrirModalConsulta}
                    className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
                  >
                    Ver detalhes
                  </button>
                )}
                {/* Botão de suporte do WhatsApp para status especiais após o horário ou sessão encerrada por inatividade */}
                {(() => {
                  const status6h = ["cancelled_by_patient", "cancelled_by_psychologist", "cancelled_no_show"];
                  let dataObj: Date | null = null;
                  const dataStr = String(normalized.date);
                  const horarioStr = String(normalized.time);
                  if (dataStr && horarioStr) {
                    if (dataStr.includes("T") || dataStr.length > 10) {
                      dataObj = new Date(dataStr);
                      const [hora, minuto] = horarioStr.split(":");
                      if (hora && minuto) dataObj.setHours(Number(hora), Number(minuto), 0, 0);
                    } else {
                      const [ano, mes, dia] = dataStr.split("-");
                      const [hora, minuto] = horarioStr.split(":");
                      if (ano && mes && dia && hora && minuto) {
                        dataObj = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
                      }
                    }
                  }
                  const agora = new Date();
                  if (
                    (dataObj && agora.getTime() > dataObj.getTime() && status6h.includes(socketStatus || "")) ||
                    fraseSessao === "Sua sessão foi encerrada por inatividade."
                  ) {
                    return (
                      <button onClick={handleSuporte} className="min-h-[44px] h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold fira-sans text-sm rounded-[6px] px-4 transition cursor-pointer">
                        Fale com o Suporte
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Outras consultas (sem lógica de sessão) */}
      {consultasParaExibir.slice(1).map((consulta, index) => renderConsultaCardSimples(consulta, index + 1))}

      {/* Botão Ver mais */}
      {temMaisConsultas && (
        <div className="w-full max-w-full sm:max-w-[588px] flex justify-center mb-6">
          <button
            onClick={handleVerMais}
            className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-6 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
          >
            Ver mais
          </button>
        </div>
      )}

      {/* Modal de detalhes da consulta */}
      {consultaSelecionada && consultaSelecionada.data && consultaSelecionada.horario && (
        <ConsultaModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            // Não limpa consultaNormalizadaSelecionada imediatamente para permitir que o modal de cancelamento use os dados
            // Só limpa se não houver modais de cancelamento abertos
            if (!showModalCancelar && !showModalCancelarDentroPrazo) {
              setTimeout(() => {
                setConsultaSelecionada(null);
                setConsultaNormalizadaSelecionada(null);
              }, 300);
            }
          }}
          consulta={{
            data: consultaSelecionada.data || "",
            horario: consultaSelecionada.horario || "",
            psicologo: {
              nome: consultaSelecionada.psicologo?.nome || "Psicólogo",
              avatarUrl: consultaSelecionada.psicologo?.avatarUrl,
            },
            paciente: consultaSelecionada.paciente ? {
              nome: consultaSelecionada.paciente.nome || "Paciente",
              avatarUrl: consultaSelecionada.paciente.avatarUrl,
            } : undefined,
          }}
          botaoEntrarDesabilitado={buttons.botaoEntrarDesabilitado}
          consultaId={consultaNormalizadaSelecionada?.id ? String(consultaNormalizadaSelecionada.id) : undefined}
          sessaoAtiva={sessaoConsulta.sessaoAtiva}
          statusCancelamento={socketStatus ? String(socketStatus) : null}
          status={typeof consultaNormalizadaSelecionada?.raw?.Status === 'string' ? consultaNormalizadaSelecionada.raw.Status : (typeof consultaNormalizadaSelecionada?.raw?.status === 'string' ? consultaNormalizadaSelecionada.raw.status : (typeof consultaNormalizadaSelecionada?.status === 'string' ? consultaNormalizadaSelecionada.status : null))}
          onAbrirCancelar={(consultaIdParam) => {
            console.log('[ProximasConsultas] onAbrirCancelar chamado', {
              consultaIdParam,
              consultaNormalizadaSelecionada: !!consultaNormalizadaSelecionada,
              role,
              consultaData: consultaNormalizadaSelecionada?.date,
              consultaTime: consultaNormalizadaSelecionada?.time
            });
            
            // Verifica se está dentro ou fora do prazo de 24h usando a consulta selecionada ANTES de fechar o modal
            const consultaParaCancelar = consultaNormalizadaSelecionada;
            if (!consultaParaCancelar) {
              console.error('[ProximasConsultas] Consulta normalizada selecionada não encontrada');
              alert('Erro: dados da consulta não encontrados. Por favor, tente novamente.');
              return;
            }
            
            console.log('[ProximasConsultas] Dados da consulta para cancelar', {
              date: consultaParaCancelar.date,
              time: consultaParaCancelar.time,
              id: consultaParaCancelar.id
            });
            
            const dentroPrazo = isCancelamentoDentroPrazo(consultaParaCancelar.date, consultaParaCancelar.time);
            
            console.log('[ProximasConsultas] Verificação de prazo', {
              dentroPrazo,
              role,
              date: consultaParaCancelar.date,
              time: consultaParaCancelar.time
            });
            
            // Fecha o modal de detalhes primeiro com animação de saída
            setShowModal(false);
            
            // Aguarda a animação de saída do modal (300ms) antes de abrir o de cancelamento
            // Usa requestAnimationFrame para garantir que o estado seja atualizado
            requestAnimationFrame(() => {
              setTimeout(() => {
                if (dentroPrazo) {
                  // Dentro do prazo (>=24h): usa modal simples sem motivo (para paciente e psicólogo)
                  console.log('[ProximasConsultas] Abrindo modal de cancelamento dentro do prazo (>=24h)');
                  setShowModalCancelarDentroPrazo(true);
                } else {
                  // Fora do prazo (<24h): usa modal com motivo obrigatório e upload (para paciente e psicólogo)
                  console.log('[ProximasConsultas] Abrindo modal de cancelamento fora do prazo (<24h)');
                  setShowModalCancelar(true);
                }
              }, 300); // Tempo para a animação de saída do modal (300ms)
            });
          }}
        />
      )}

      {/* Modal de cancelamento dentro do prazo (>24h) - para pacientes e psicólogos */}
      {showModalCancelarDentroPrazo && consultaNormalizadaSelecionada && (
        <ModalCancelarSessaoDentroPrazo
          open={showModalCancelarDentroPrazo}
          onClose={() => {
            setShowModalCancelarDentroPrazo(false);
            // Limpa os dados quando o modal de cancelamento fecha
            setTimeout(() => {
              setConsultaSelecionada(null);
              setConsultaNormalizadaSelecionada(null);
            }, 300);
          }}
          consulta={{
            id: consultaNormalizadaSelecionada.id !== undefined ? String(consultaNormalizadaSelecionada.id) : undefined,
            date: consultaNormalizadaSelecionada.date,
            time: consultaNormalizadaSelecionada.time,
            pacienteId: consultaNormalizadaSelecionada.pacienteId !== undefined ? String(consultaNormalizadaSelecionada.pacienteId) : undefined,
            psicologoId: consultaNormalizadaSelecionada.psicologoId !== undefined ? String(consultaNormalizadaSelecionada.psicologoId) : undefined,
            linkDock: undefined,
            status: "Deferido", // Cancelamento dentro do prazo é automaticamente deferido
            tipo: role === "psicologo" ? "Psicologo" : "Paciente"
          }}
          onConfirm={async () => {
            setShowModalCancelarDentroPrazo(false);
            setSocketStatus("Cancelado");
            // Invalida e refaz as queries relacionadas a consultas e ciclo plano para atualizar em tempo real
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultas'] }),
              queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['ciclos-plano'] }),
              queryClient.invalidateQueries({ queryKey: ['ciclo-ativo'] }),
              queryClient.invalidateQueries({ queryKey: ['userPlano'] }),
              queryClient.invalidateQueries({ queryKey: ['userMe'] }),
              queryClient.refetchQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.refetchQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.refetchQueries({ queryKey: ['ciclo-ativo'] }),
              queryClient.refetchQueries({ queryKey: ['userPlano'] }),
            ]);
            // Após cancelar, pergunta se quer reagendar
            setTimeout(() => {
              setShowModalReagendarAposCancelamento(true);
            }, 300);
          }}
        />
      )}

      {/* Modal de reagendamento após cancelamento dentro do prazo */}
      {showModalReagendarAposCancelamento && consultaNormalizadaSelecionada && (
        <ModalReagendarAposCancelamento
          open={showModalReagendarAposCancelamento}
          onClose={() => setShowModalReagendarAposCancelamento(false)}
          consultaOriginal={consultaNormalizadaSelecionada ? {
            Id: consultaNormalizadaSelecionada.id ? String(consultaNormalizadaSelecionada.id) : "",
            Date: consultaNormalizadaSelecionada.date || "",
            Time: consultaNormalizadaSelecionada.time || "",
            Status: consultaNormalizadaSelecionada.status || "Reservado",
            PacienteId: consultaNormalizadaSelecionada.pacienteId ? String(consultaNormalizadaSelecionada.pacienteId) : "",
            PsicologoId: consultaNormalizadaSelecionada.psicologoId ? String(consultaNormalizadaSelecionada.psicologoId) : "",
            AgendaId: (consultaNormalizadaSelecionada.raw?.AgendaId || consultaNormalizadaSelecionada.raw?.agendaId) ? String(consultaNormalizadaSelecionada.raw.AgendaId || consultaNormalizadaSelecionada.raw.agendaId) : "",
            CreatedAt: consultaNormalizadaSelecionada.raw?.CreatedAt ? String(consultaNormalizadaSelecionada.raw.CreatedAt) : new Date().toISOString(),
            UpdatedAt: consultaNormalizadaSelecionada.raw?.UpdatedAt ? String(consultaNormalizadaSelecionada.raw.UpdatedAt) : new Date().toISOString(),
            Psicologo: consultaNormalizadaSelecionada.psicologo ? {
              Id: consultaNormalizadaSelecionada.psicologo.id ? String(consultaNormalizadaSelecionada.psicologo.id) : "",
              Nome: consultaNormalizadaSelecionada.psicologo.nome || "",
              Images: consultaNormalizadaSelecionada.psicologo.imageUrl ? [{ Url: consultaNormalizadaSelecionada.psicologo.imageUrl }] : undefined
            } : undefined
          } as ConsultaApi : null}
        />
      )}

      {/* Modal de cancelamento fora do prazo (<24h) - com motivo obrigatório e upload */}
      {showModalCancelar && consultaNormalizadaSelecionada && (
        <ModalCancelarSessao
          open={showModalCancelar}
          onClose={() => {
            setShowModalCancelar(false);
            // Limpa os dados quando o modal de cancelamento fecha
            setTimeout(() => {
              setConsultaSelecionada(null);
              setConsultaNormalizadaSelecionada(null);
            }, 300);
          }}
          consulta={{
            id: consultaNormalizadaSelecionada.id !== undefined ? String(consultaNormalizadaSelecionada.id) : undefined,
            date: consultaNormalizadaSelecionada.date,
            time: consultaNormalizadaSelecionada.time,
            pacienteId: consultaNormalizadaSelecionada.pacienteId !== undefined ? String(consultaNormalizadaSelecionada.pacienteId) : undefined,
            psicologoId: consultaNormalizadaSelecionada.psicologoId !== undefined ? String(consultaNormalizadaSelecionada.psicologoId) : undefined,
            linkDock: undefined, // ajuste se houver campo/link
            status: 'EmAnalise', // sempre envia um valor válido do enum
            tipo: role === "psicologo" ? "Psicologo" : "Paciente", // define o tipo baseado no role
            paciente: consultaNormalizadaSelecionada.paciente ? {
              nome: consultaNormalizadaSelecionada.paciente.nome
            } : undefined
          }}
          onConfirm={async () => {
            setShowModalCancelar(false);
            setSocketStatus("Cancelado");
            // Invalida e refaz as queries relacionadas a consultas para atualizar em tempo real
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.invalidateQueries({ queryKey: ['consultas'] }),
              queryClient.invalidateQueries({ queryKey: ['reservas/consultas-agendadas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasFuturas'] }),
              queryClient.refetchQueries({ queryKey: ['consultasAgendadas'] }),
              queryClient.refetchQueries({ queryKey: ['reservas/consultas-agendadas'] }),
            ]);
          }}
        />
      )}

      {/* Modal de reagendamento */}
      {consultaSelecionada && consultaNormalizadaSelecionada && (
        <ModalReagendar
          isOpen={showModalReagendar}
          onClose={() => {
            setShowModalReagendar(false);
            setConsultaIdReagendar("");
            setConsultaSelecionada(null);
            setConsultaNormalizadaSelecionada(null);
          }}
          consulta={consultaSelecionada}
          consultaIdAtual={consultaIdReagendar}
        />
      )}
    </motion.section>
  );
}