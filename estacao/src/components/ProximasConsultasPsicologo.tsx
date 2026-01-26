"use client";
import React, { useState, useEffect, useMemo } from "react";
import ConsultaModalMobile from "./ConsultaModalMobile";
import ConsultaModalDesk from "./ConsultaModalDesk";
import ModalCancelarSessaoDesk from "./ModalCancelarSessaoDesk";
import ModalCancelarSessaoMobile from "./ModalCancelarSessaoMobile";
import ModalReagendar from "./ModalReagendar";
import { useRouter } from "next/navigation";
import { useSessaoConsulta, type ConsultaSessao } from "../hooks/useSessaoConsulta";
import { formatarDataHora } from "../utils/formatarDataHora"; 
import { getContextualAvatar } from "@/utils/avatarUtils";
import { useCheckTokens } from "@/hooks/useCheckTokens";
import { motion } from "framer-motion";
import Image from "next/image";
import { ConsultaApi } from "@/types/consultasTypes";
import type { ProximasConsultas as ProximasConsultaType } from "@/types/psicologoTypes";
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import { extractScheduledAtFromNormalized, scheduledAtToTimestamp } from "@/utils/reservaSessaoUtils";
import { shouldEnableEntrarConsulta, calcularTempoDecorrido50Minutos, isConsultaDentro50MinutosComScheduledAt, isConsultaIniciada } from "@/utils/consultaTempoUtils";
import { useReservaSessaoData } from "@/hooks/useReservaSessaoData";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useContadorGlobal } from "@/hooks/useContadorGlobal";

dayjs.extend(utc);
dayjs.extend(timezone);

 
import {
  onConsultationStarted,
  onConsultationEnded,
  onConsultationStartingSoon,
  onConsultationEndingSoon,
  onConsultationCancelled,
  onConsultationCancelledByPatient,
  onConsultationCancelledByPsychologist,
  onConsultationInactivity,
  offConsultationInactivity,
  onConsultationStatusChanged,
  offConsultationStatusChanged,
  ConsultationEventData,
  getSocket,
  joinConsultation,
} from "../lib/socket";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";

export interface ProximasConsultasProps {
  consultas: ConsultaApi | ProximasConsultaType | null;
  futuras?: ConsultaApi[];
  role?: "paciente" | "psicologo";
  // Oculta botões/links de "Ver perfil"
  hidePerfil?: boolean;
} 

export default function ProximaConsultaPsicologo({ consultas = null, role = "paciente", hidePerfil }: ProximasConsultasProps) {
  const router = useRouter();

  // Garante que consultas seja tratado como objeto
  const next = consultas && typeof consultas === 'object' ? consultas : undefined;
  const normalized = next ? normalizeConsulta(next as unknown as GenericObject) : undefined;

  console.log('DEBUG ProximaConsultaPsicologo consultas cards:', consultas);

  // Prefixo de rota conforme o perfil atual
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const effectiveRole: "paciente" | "psicologo" = role ?? (
    pathname.startsWith('/painel-psicologo') ? 'psicologo' : 'paciente'
  );
  const basePrefix = effectiveRole === "psicologo" ? "/painel-psicologo" : "/painel";

  // Deriva dados de cabeçalho conforme o papel

  // Avatar e nome do paciente (se papel for psicólogo)
  const headerNome = effectiveRole === "psicologo"
    ? obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado"
    : obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado";

  const headerAvatarUrl = getContextualAvatar(
    effectiveRole === "psicologo",
    normalized?.psicologo,
    normalized?.paciente
  );

  const perfilHref = effectiveRole === "psicologo"
    ? (normalized?.pacienteId ? `${basePrefix}/paciente/${normalized.pacienteId}` : undefined)
    : (normalized?.psicologoId ? `${basePrefix}/psicologo/${normalized.psicologoId}` : undefined);

  const shouldShowPerfil = !hidePerfil && Boolean(perfilHref);

  // Usa hook centralizado para acessar ReservaSessao (deve vir antes do useMemo que o usa)
  const { scheduledAt: scheduledAtFromReserva } = useReservaSessaoData({
    normalized,
    consultationId: normalized?.id ? String(normalized.id) : undefined
  });

  // Hook para contador global (atualiza a cada segundo) — deve vir antes dos useMemo que usam timestamp
  const { timestamp } = useContadorGlobal();

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

  // Ajuste: pega os dados da próxima consulta do objeto next
  // Adapta para o type ConsultaApi
  const sessaoConsulta = useSessaoConsulta(consultaSessaoData);

  // Valida se a consulta é futura ou está em andamento usando timezone de Brasília
  // 🎯 REGRA: Card deve ficar visível durante os 50 minutos da consulta
  // Atualiza em tempo real usando timestamp
  const isConsultaFuturaOuEmAndamento = useMemo(() => {
    if (!next || !normalized?.date || !normalized?.time) return false;
    
    try {
      // Extrai apenas a data no formato yyyy-mm-dd
      const dateOnly = normalized.date.split('T')[0].split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
      
      // Usa timezone de Brasília para comparação (atualiza em tempo real com timestamp)
      const agoraBr = dayjs(timestamp).tz('America/Sao_Paulo');
      const dataAtualStr = agoraBr.format('YYYY-MM-DD');
      const horaAtualBr = agoraBr.format('HH:mm');
      const agoraTimestamp = agoraBr.valueOf();
      
      // 🎯 REGRA: Verifica se a consulta está em andamento usando ScheduledAt (50 minutos)
      let inicioConsulta: number | null = null;
      
      // Prioriza ScheduledAt da ReservaSessao
      const scheduledAt = extractScheduledAtFromNormalized(normalized);
      if (scheduledAt) {
        inicioConsulta = scheduledAtToTimestamp(scheduledAt);
      }
      
      // Fallback: usa date/time se ScheduledAt não estiver disponível
      if (!inicioConsulta && normalized.time) {
        const [hh, mm] = normalized.time.split(':').map(Number);
        inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
      }
      
      if (inicioConsulta) {
        const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
        
        // 🎯 Mostra se estiver dentro da janela de 50 minutos
        if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
          return true;
        }
        
        // Se passou dos 50 minutos, não mostra mais
        if (agoraTimestamp > fimConsulta) {
          return false;
        }
      }
      
      // Para consultas não em andamento, aplica a lógica original
      // Compara primeiro a data
      if (dateOnly < dataAtualStr) {
        // Data passada, não é válida (a menos que esteja dentro dos 50 minutos, já verificado acima)
        return false;
      } else if (dateOnly > dataAtualStr) {
        // Data futura, é válida
        return true;
      } else {
        // Se é o mesmo dia, compara o horário
        // Mostra se o horário da consulta ainda não passou OU se está no horário exato ou depois (dentro dos 50 minutos)
        // Permite mostrar no horário exato ou até 50 minutos depois
        return normalized.time >= horaAtualBr;
      }
    } catch {
      // Em caso de erro, confia no backend (se next existe, é válida)
      return true;
    }
  }, [next, normalized, timestamp]);

  // 🎯 Mostra o card se houver próxima consulta e ela for futura OU se estiver dentro dos 50 minutos
  const mostrarCard = next && isConsultaFuturaOuEmAndamento;

  // Hooks e estados
  const {
    contador,
    mostrarSessao,
    sessaoAtiva,
    sessaoEncerrada,
  } = sessaoConsulta;

  const [showModal, setShowModal] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [showModalCancelarMobile, setShowModalCancelarMobile] = useState(false);
  const [showModalReagendar, setShowModalReagendar] = useState(false);

  // Estados para status do socket
  const [socketStatus, setSocketStatus] = useState<ConsultationEventData["status"] | null>(null);
  
  // Hook para verificar/gerar tokens
  const { checkAndGenerateTokens, isLoading: isCheckingTokens } = useCheckTokens();
  const [isProcessingEntry, setIsProcessingEntry] = useState(false);
  
  // Obtém o ID do usuário logado para registrar presença
  const loggedUser = useAuthStore((state) => state.user);
  const loggedUserId = loggedUser?.Id || "";

  // Calcula contador de 50 minutos durante a consulta
  const contador50Minutos = useMemo(() => {
    void timestamp;
    return calcularTempoDecorrido50Minutos(
      scheduledAtFromReserva ?? null,
      normalized?.date ?? null,
      normalized?.time ?? null
    );
  }, [scheduledAtFromReserva, normalized?.date, normalized?.time, timestamp]);

  // Calcula contador regressivo antes da consulta começar (10 minutos antes e 10 minutos depois)
  const contadorInicio = useMemo(() => {
    void timestamp;
    if (!normalized?.date || !normalized?.time) {
      return { mostrar: false, frase: '', tempo: '' };
    }

    try {
      // Prioriza ScheduledAt se disponível
      let dataHoraConsulta: dayjs.Dayjs | null = null;
      
      if (scheduledAtFromReserva) {
        try {
          const [datePart, timePart] = scheduledAtFromReserva.split(' ');
          if (datePart && timePart) {
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second = 0] = timePart.split(':').map(Number);
            dataHoraConsulta = dayjs.tz(
              `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
              'America/Sao_Paulo'
            );
          }
        } catch (error) {
          console.error('Erro ao parsear ScheduledAt:', error);
        }
      }
      
      // Fallback: usa date/time se ScheduledAt não estiver disponível
      if (!dataHoraConsulta || !dataHoraConsulta.isValid()) {
        const dateOnly = normalized.date.split('T')[0].split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
          return { mostrar: false, frase: '', tempo: '' };
        }

        const horarioTrimmed = normalized.time.trim();
        if (!/^\d{1,2}:\d{2}$/.test(horarioTrimmed)) {
          return { mostrar: false, frase: '', tempo: '' };
        }

        const [hora, minuto] = horarioTrimmed.split(':').map(Number);
        if (hora < 0 || hora >= 24 || minuto < 0 || minuto >= 60) {
          return { mostrar: false, frase: '', tempo: '' };
        }

        const horarioNormalizado = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
        dataHoraConsulta = dayjs.tz(
          `${dateOnly} ${horarioNormalizado}`,
          'America/Sao_Paulo'
        );
      }

      if (!dataHoraConsulta || !dataHoraConsulta.isValid()) {
        return { mostrar: false, frase: '', tempo: '' };
      }

      const agora = dayjs().tz('America/Sao_Paulo');
      // Calcula diferença em segundos (positivo = falta tempo, negativo = já começou)
      const diffSegundos = dataHoraConsulta.diff(agora, 'second');

      // 🎯 Contagem regressiva até o início (mostra apenas 10 minutos antes = 600 segundos)
      if (diffSegundos > 0 && diffSegundos <= 600) {
        const minutos = Math.floor(diffSegundos / 60);
        const segundos = diffSegundos % 60;
        const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
        
        return {
          mostrar: true,
          frase: 'Sua sessão inicia em',
          tempo: tempoFormatado,
        };
      }

      // 🎯 Janela logo após iniciar (até 10 minutos depois = -600 segundos) para exibir "Sua sessão iniciou"
      if (diffSegundos <= 0 && diffSegundos >= -600) {
        const segundosPassados = Math.abs(diffSegundos);
        const minutos = Math.floor(segundosPassados / 60);
        const segundosRestantes = segundosPassados % 60;
        const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`;
        return {
          mostrar: true,
          frase: 'Sua sessão iniciou',
          tempo: tempoFormatado,
        };
      }

      return { mostrar: false, frase: '', tempo: '' };
    } catch (error) {
      console.error('Erro ao calcular contador de início:', error);
      return { mostrar: false, frase: '', tempo: '' };
    }
  }, [normalized?.date, normalized?.time, scheduledAtFromReserva, timestamp]);

  // Verifica se a consulta está em andamento (dentro dos 50 minutos)
  const consultaEmAndamento = useMemo(() => {
    void timestamp;
    return isConsultaDentro50MinutosComScheduledAt(
      scheduledAtFromReserva ?? null,
      normalized?.date ?? null,
      normalized?.time ?? null
    );
  }, [scheduledAtFromReserva, normalized?.date, normalized?.time, timestamp]);

  // Verifica se a consulta já iniciou (na hora exata)
  const consultaIniciada = useMemo(() => {
    void timestamp;
    return isConsultaIniciada(
      scheduledAtFromReserva ?? null,
      normalized?.date ?? null,
      normalized?.time ?? null
    );
  }, [scheduledAtFromReserva, normalized?.date, normalized?.time, timestamp]);

  // Atualiza frases e botões conforme status do socket
  useEffect(() => {
    if (!normalized?.id) return;

    // Limpa listeners antigos ao desmontar
    return () => {
      // Não há método off no socket atual, mas se houver, adicione aqui
    };
  }, [normalized?.id]);

  useEffect(() => {
    if (!normalized?.id) return;

    const idStr = normalized?.id ? String(normalized.id) : undefined;
    if (!idStr) return;

    // Função para mapear status do backend para status do frontend
    const mapStatusToFrontend = (status: string): ConsultationEventData["status"] | null => {
      const statusValue = String(status || "").toLowerCase();
      if (statusValue.includes("cancel") || statusValue.includes("naocompareceu") || statusValue === "deferido") {
        return "Cancelado";
      }
      if (statusValue.includes("conclu") || statusValue.includes("realiz")) {
        return "Concluido";
      }
      if (statusValue === "andamento" || statusValue === "emandamento") {
        return "started";
      }
      if (statusValue === "cancelled_by_patient") return "cancelled_by_patient";
      if (statusValue === "cancelled_by_psychologist") return "cancelled_by_psychologist";
      return null;
    };

    onConsultationStartingSoon(() => {
      setSocketStatus("startingSoon");
    }, idStr);

    onConsultationStarted(() => {
      setSocketStatus("started");
    }, idStr);

    onConsultationEndingSoon(() => {
      setSocketStatus("endingSoon");
    }, idStr);

    onConsultationEnded(() => {
      setSocketStatus("Concluido");
    }, idStr);

    onConsultationCancelled(() => {
      setSocketStatus("Cancelado");
    }, idStr);

    onConsultationCancelledByPatient(() => {
      setSocketStatus("cancelled_by_patient");
    }, idStr);

    onConsultationCancelledByPsychologist(() => {
      setSocketStatus("cancelled_by_psychologist");
    }, idStr);

    onConsultationInactivity(() => {
      setSocketStatus("Cancelado");
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-sessao', idStr] });
      queryClient.invalidateQueries({ queryKey: ['consulta', idStr] });
    }, idStr);

    // Listener para mudanças de status gerais (ex: cancelamento automático)
    onConsultationStatusChanged((data) => {
      const mappedStatus = mapStatusToFrontend(data.status);
      if (mappedStatus) {
        setSocketStatus(mappedStatus);
        // Invalida queries para atualizar em tempo real
        queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
        queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
        queryClient.invalidateQueries({ queryKey: ['reserva-sessao', data.consultationId] });
        queryClient.invalidateQueries({ queryKey: ['consulta', data.consultationId] });
      }
    }, idStr);

    return () => {
      const socket = getSocket();
      if (!socket) return;
      socket.off(`consultation:${idStr}`);
      offConsultationStatusChanged(idStr);
      offConsultationInactivity(idStr);
    };
  }, [normalized?.id]);

  // Frase e estado do botão conforme o status do socket
  let fraseSessao = "";
  let mostrarContador = false;
  let contadorSessao = contador;
  let botaoEntrarDesabilitado = true;

  const statusBase =
    socketStatus ||
    (normalized?.raw as { Status?: string; status?: string; ReservaSessao?: { Status?: string; status?: string } })?.Status ||
    (normalized?.raw as { Status?: string; status?: string; ReservaSessao?: { Status?: string; status?: string } })?.status ||
    (normalized?.raw as { ReservaSessao?: { Status?: string; status?: string } })?.ReservaSessao?.Status ||
    (normalized?.raw as { ReservaSessao?: { Status?: string; status?: string } })?.ReservaSessao?.status ||
    normalized?.status ||
    null;

  // 🎯 Verifica se pode entrar na sessão baseado no ScheduledAt e status
  // Desbloqueia o botão assim que a consulta iniciar (consultaIniciada)
  const podeEntrarNaSessao = useMemo(() => {
    // Se a consulta já iniciou (na hora exata), permite entrar
    if (consultaIniciada) {
      // Se está dentro dos 50 minutos, sempre permite entrar
      if (consultaEmAndamento) {
        return true;
      }
    }
    // Se a consulta está em andamento (dentro dos 50 minutos), permite entrar
    if (consultaEmAndamento) {
      return true;
    }
    // Usa a função helper para verificar se pode entrar
    return shouldEnableEntrarConsulta({
      scheduledAt: scheduledAtFromReserva ?? null,
      date: normalized?.date ?? null,
      time: normalized?.time ?? null,
      status: statusBase,
    });
  }, [normalized?.date, normalized?.time, scheduledAtFromReserva, statusBase, consultaEmAndamento, consultaIniciada]);

  // 🎯 Determina o status dinâmico baseado no andamento da consulta e socket em tempo real
  const statusDinamico = useMemo(() => {
    // Prioriza status do socket para atualização em tempo real
    if (socketStatus) {
      // Mapeia status do socket para status de exibição
      if (socketStatus === "started" || socketStatus === "startingSoon") {
        // Se está dentro dos 50 minutos, mostra "Em Andamento"
        if (consultaEmAndamento && contador50Minutos.estaDentroDoPeriodo) {
          return 'EmAndamento';
        }
        // Se socket diz que começou, mostra "Em Andamento" mesmo que não esteja mais nos 50 minutos
        if (socketStatus === "started") {
          return 'EmAndamento';
        }
      }
      // Status finais do socket
      if (socketStatus === "Concluido" || socketStatus === "endingSoon") {
        return 'Concluido';
      }
      if (socketStatus === "Cancelado" || socketStatus === "cancelled_by_patient" || socketStatus === "cancelled_by_psychologist") {
        return socketStatus;
      }
    }
    
    // Se está dentro dos 50 minutos, mostra "Em Andamento"
    if (consultaEmAndamento && contador50Minutos.estaDentroDoPeriodo) {
      return 'EmAndamento';
    }
    
    // Se a consulta já iniciou mas não está mais nos 50 minutos, ainda mostra "Em Andamento" se o status base indicar
    if (consultaIniciada && (statusBase === 'Andamento' || statusBase === 'andamento' || statusBase === 'EmAndamento' || statusBase === 'Em Andamento')) {
      return 'EmAndamento';
    }
    
    // Caso contrário, usa o status base
    return statusBase || 'Reservado';
  }, [consultaEmAndamento, contador50Minutos.estaDentroDoPeriodo, statusBase, socketStatus, consultaIniciada]);

  // 🎯 Calcula estado da sessão - contador apenas 10 min antes e 10 min depois, mas card visível 50 minutos
  const sessionState = useMemo(() => {
    // Prioriza contador de início (10 minutos antes e 10 minutos depois)
    if (contadorInicio.mostrar) {
      return {
        fraseSessao: contadorInicio.frase,
        mostrarContador: true,
        contadorSessao: contadorInicio.tempo,
        botaoEntrarDesabilitado: contadorInicio.frase === 'Sua sessão inicia em', // Desabilita antes de começar
      };
    }

    // Se está no horário da consulta (pode entrar), mostra botão habilitado
    // Mas só mostra contador se estiver dentro dos 10 minutos antes ou depois do início
    // 🎯 Desbloqueia o botão assim que a consulta iniciar (consultaIniciada)
    if (podeEntrarNaSessao || consultaIniciada) {
      // Se está em andamento (dentro dos 50 minutos)
      if (consultaIniciada && consultaEmAndamento) {
        // Verifica se está dentro dos 10 minutos após início para mostrar contador
        let inicioConsulta: number | null = null;
        if (scheduledAtFromReserva) {
          try {
            const [datePart, timePart] = scheduledAtFromReserva.split(' ');
            if (datePart && timePart) {
              const [year, month, day] = datePart.split('-').map(Number);
              const [hour, minute, second = 0] = timePart.split(':').map(Number);
              const inicioConsultaDate = dayjs.tz(
                `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
                'America/Sao_Paulo'
              );
              inicioConsulta = inicioConsultaDate.valueOf();
            }
          } catch (error) {
            console.error('Erro ao parsear ScheduledAt:', error);
          }
        }
        
        if (!inicioConsulta && normalized?.date && normalized?.time) {
          const dateOnly = normalized.date.split('T')[0].split(' ')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            const [hh, mm] = normalized.time.split(':').map(Number);
            inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
          }
        }
        
        if (inicioConsulta) {
          const agoraBr = dayjs().tz('America/Sao_Paulo');
          const agoraTimestamp = agoraBr.valueOf();
          const tempoDecorrido = agoraTimestamp - inicioConsulta;
          const dentro10Minutos = tempoDecorrido >= 0 && tempoDecorrido <= (10 * 60 * 1000);
          
          // Se está dentro dos 10 minutos após início, mostra contador
          if (dentro10Minutos && contador50Minutos.estaDentroDoPeriodo && contador50Minutos.tempoFormatado) {
            return {
              fraseSessao: "Sua sessão já começou há",
              mostrarContador: true,
              contadorSessao: contador50Minutos.tempoFormatado,
              botaoEntrarDesabilitado: false,
            };
          }
        }
        
        // Se passou dos 10 minutos mas ainda está dentro dos 50 minutos, não mostra contador mas mantém botão habilitado
        // 🎯 Card permanece visível durante os 50 minutos mesmo sem contador
        return {
          fraseSessao: "",
          mostrarContador: false,
          contadorSessao: "",
          botaoEntrarDesabilitado: false, // Botão sempre habilitado durante os 50 minutos
        };
      }
      
      // Se a consulta iniciou mas não está mais nos 50 minutos, ainda permite entrar
      if (consultaIniciada) {
        return {
          fraseSessao: "",
          mostrarContador: false,
          contadorSessao: "",
          botaoEntrarDesabilitado: false, // Botão habilitado assim que iniciar
        };
      }
      
      // Caso contrário, usa contador padrão (se estiver dentro dos 10 minutos antes)
      return {
        fraseSessao: socketStatus === "started" ? "Sua sessão já começou há" : "Sua sessão inicia em",
        mostrarContador: contadorInicio.mostrar, // Só mostra se estiver dentro dos 10 minutos antes
        contadorSessao: contadorInicio.mostrar ? contadorInicio.tempo : (contador || ""),
        botaoEntrarDesabilitado: !consultaIniciada, // Desbloqueia assim que iniciar
      };
    }

    // Status do socket tem prioridade
    if (socketStatus === "startingSoon") {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contadorInicio.tempo || contador,
        botaoEntrarDesabilitado: true,
      };
    }

    if (socketStatus === "started") {
      // Usa contador de 50 minutos se estiver dentro do período
      const tempoContador = (consultaEmAndamento && contador50Minutos.estaDentroDoPeriodo && contador50Minutos.tempoFormatado) 
        ? contador50Minutos.tempoFormatado 
        : contador;
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: true,
        contadorSessao: tempoContador,
        botaoEntrarDesabilitado: false,
      };
    }

    if (socketStatus === "endingSoon") {
      return {
        fraseSessao: "Sua sessão está encerrando em breve.",
        mostrarContador: false,
        contadorSessao: "",
        botaoEntrarDesabilitado: false,
      };
    }

    if (["Concluido", "Cancelado", "cancelled_by_patient", "cancelled_by_psychologist"].includes(socketStatus || "")) {
      const frases: Record<string, string> = {
        "Concluido": "Sua sessão foi encerrada.",
        "Cancelado": "Sua sessão foi cancelada.",
        "cancelled_by_patient": "Consulta cancelada por ausência do paciente.",
        "cancelled_by_psychologist": "Psicólogo ausente. Consulta recreditada.",
      };
      return {
        fraseSessao: frases[socketStatus || ""] || "Sua sessão foi encerrada.",
        mostrarContador: false,
        contadorSessao: "",
        botaoEntrarDesabilitado: true,
      };
    }

    // Usa estado do hook useSessaoConsulta
    if (mostrarSessao && !sessaoAtiva && !sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão inicia em",
        mostrarContador: true,
        contadorSessao: contador,
        botaoEntrarDesabilitado: true,
      };
    }

    if (mostrarSessao && sessaoAtiva && !sessaoEncerrada) {
      // Usa contador de 50 minutos se estiver dentro do período
      const tempoContador = (consultaEmAndamento && contador50Minutos.estaDentroDoPeriodo && contador50Minutos.tempoFormatado) 
        ? contador50Minutos.tempoFormatado 
        : contador;
      return {
        fraseSessao: "Sua sessão já começou há",
        mostrarContador: true,
        contadorSessao: tempoContador,
        botaoEntrarDesabilitado: false,
      };
    }

    if (mostrarSessao && sessaoEncerrada) {
      return {
        fraseSessao: "Sua sessão foi encerrada por inatividade.",
        mostrarContador: false,
        contadorSessao: "",
        botaoEntrarDesabilitado: true,
      };
    }

    // Estado padrão (sem sessão ativa)
    return {
      fraseSessao: "",
      mostrarContador: false,
      contadorSessao: "",
      botaoEntrarDesabilitado: true,
    };
  }, [
    contadorInicio,
    podeEntrarNaSessao,
    consultaIniciada,
    consultaEmAndamento,
    contador50Minutos,
    socketStatus,
    mostrarSessao,
    sessaoAtiva,
    sessaoEncerrada,
    contador,
    normalized?.date,
    normalized?.time,
    scheduledAtFromReserva,
  ]);

  // Aplica o estado calculado
  fraseSessao = sessionState.fraseSessao;
  mostrarContador = sessionState.mostrarContador;
  contadorSessao = sessionState.contadorSessao;
  botaoEntrarDesabilitado = sessionState.botaoEntrarDesabilitado;

  const botaoEntrarFinal = botaoEntrarDesabilitado || !podeEntrarNaSessao;

  // Novo: verifica se não há consulta futura
  if (!next) {
    return (
      <motion.section
        className="w-full max-w-full md:max-w-[580px]"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.p
          className="text-gray-500 font-sans text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Você ainda não possui nenhuma consulta.
        </motion.p>
      </motion.section>
    );
  }
  
  async function handleEntrarNaSessao() {
    if (!normalized?.id || isProcessingEntry || isCheckingTokens) return;
    
    setIsProcessingEntry(true);
    
    try {
      const consultaId = String(normalized.id);
      
      // 🎯 REGISTRA PRESENÇA ANTES DE REDIRECIONAR
      // Cada usuário (paciente ou psicólogo) registra sua própria presença
      if (loggedUserId) {
        try {
          console.log('📹 [ProximasConsultasPsicologo] Registrando presença do psicólogo:', {
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Psychologist'
          });
          
          await joinConsultation({
            consultationId: consultaId,
            userId: loggedUserId,
            role: 'Psychologist'
          });
          
          console.log('✅ [ProximasConsultasPsicologo] Presença do psicólogo registrada com sucesso');
        } catch (presencaError) {
          console.error('⚠️ [ProximasConsultasPsicologo] Erro ao registrar presença (não bloqueante):', presencaError);
          // Não bloqueia o fluxo se houver erro ao registrar presença
        }
      } else {
        console.warn('⚠️ [ProximasConsultasPsicologo] loggedUserId não disponível, pulando registro de presença');
      }
      
      // Verifica/gera tokens antes de entrar
      const success = await checkAndGenerateTokens(consultaId);
      
      if (success) {
        // Redireciona para a sala
        const reservaSessao = normalized.raw?.ReservaSessao as { AgoraChannel?: string } | undefined;
        const channel = reservaSessao?.AgoraChannel || `sala_${consultaId}`;
        router.push(`${basePrefix}/room/${consultaId}/${channel}`);
      } else {
        console.error('[ProximasConsultasPsicologo] Falha ao gerar tokens');
      }
    } catch (error) {
      console.error('[ProximasConsultasPsicologo] Erro ao entrar na sessão:', error);
    } finally {
      setIsProcessingEntry(false);
    }
  }

  // Handler para suporte (WhatsApp) - igual ao card do paciente
  const handleSuporte = (): void => {
    const mensagem = encodeURIComponent("Olá, preciso de suporte técnico na Estação Terapia. Tenho dúvidas ou estou com problemas na plataforma.");
    window.open(`https://wa.me/5511960892131?text=${mensagem}`, '_blank');
  };

  return (
    <motion.section
      className="w-full max-w-full md:max-w-[580px]"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Modais */}
      <ConsultaModalMobile
        open={showModal}
        onClose={() => setShowModal(false)}
        consulta={{
          data: normalized?.date ? String(normalized.date) : "",
          horario: normalized?.time ? String(normalized.time) : "",
          id: normalized?.id ? String(normalized.id) : undefined,
          pacienteId: normalized?.pacienteId ? String(normalized.pacienteId) : undefined,
          psicologoId: normalized?.psicologoId ? String(normalized.psicologoId) : undefined,
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
            avatarUrl: normalized?.paciente?.imageUrl,
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
            avatarUrl: normalized?.psicologo?.imageUrl,
          },
  }}
        botaoEntrarDesabilitado={botaoEntrarFinal}
      />
      <ModalCancelarSessaoMobile
        open={showModalCancelarMobile}
        onClose={() => setShowModalCancelarMobile(false)}
        onConfirm={() => {
          setShowModalCancelarMobile(false);
          // Adicione aqui a lógica para confirmar o cancelamento, se necessário
        }}
        consulta={next}
      />
      <ModalReagendar
        isOpen={showModalReagendar}
        onClose={() => setShowModalReagendar(false)}
        consulta={{
          data: normalized?.date ? String(normalized.date) : "",
          horario: normalized?.time ? String(normalized.time) : "",
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
          },
        }}
  consultaIdAtual={normalized?.id ? String(normalized.id) : ""}
      />
      <ConsultaModalDesk
        open={showModal}
        onClose={() => setShowModal(false)}
        onEntrar={handleEntrarNaSessao}
        consulta={{
          data: normalized?.date || "",
          horario: normalized?.time || "",
          id: normalized?.id ? String(normalized.id) : undefined,
          pacienteId: normalized?.pacienteId ? String(normalized.pacienteId) : undefined,
          psicologoId: normalized?.psicologoId ? String(normalized.psicologoId) : undefined,
          paciente: effectiveRole === "psicologo" ? {
            nome: obterPrimeiroUltimoNome(normalized?.paciente?.nome) || "Nome não informado",
            avatarUrl: normalized?.paciente?.imageUrl,
          } : undefined,
          psicologo: {
            nome: obterPrimeiroUltimoNome(normalized?.psicologo?.nome) || "Nome não informado",
            avatarUrl: normalized?.psicologo?.imageUrl,
          },
  }}
        botaoEntrarDesabilitado={botaoEntrarFinal}
      />
      <ModalCancelarSessaoDesk
        open={showModalCancelar}
        onClose={() => setShowModalCancelar(false)}
        onConfirm={() => {
          setShowModalCancelar(false);
        }}
        consulta={next}
      />

      {!mostrarCard ? (
        <motion.p
          className="text-gray-500 text-center font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Você ainda não possui nenhuma consulta.
        </motion.p>
      ) : (
        <motion.div
          className="relative bg-white shadow rounded-xl w-full max-w-full sm:max-w-[540px] sm:w-[540px] sm:h-[180px] mb-6 min-h-[180px] sm:min-h-[180px] border-0 p-4 sm:p-6 sm:flex sm:flex-col sm:justify-between font-fira-sans"
          style={{ opacity: 1, borderRadius: 12 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Tag de status no canto superior direito */}
          {(() => {
            // Obtém o status da consulta - usa status dinâmico se disponível
            const reservaSessaoRaw = normalized?.raw?.ReservaSessao;
            const reservaSessao = reservaSessaoRaw && typeof reservaSessaoRaw === 'object' && !Array.isArray(reservaSessaoRaw)
              ? reservaSessaoRaw as { Status?: string; status?: string }
              : null;
            const statusReservaSessao = reservaSessao?.Status || reservaSessao?.status;
            const statusRaw = statusReservaSessao || normalized?.raw?.Status || normalized?.status || 'Reservado';
            // 🎯 Sempre usa status dinâmico para atualização em tempo real (considera socketStatus e andamento)
            // Se statusDinamico estiver definido e for diferente do status base, usa ele; senão, usa o status base
            const statusConsulta = statusDinamico && statusDinamico !== 'Reservado' && statusDinamico !== statusRaw
              ? statusDinamico 
              : (statusDinamico || (typeof statusRaw === 'string' ? statusRaw : String(statusRaw)));
            
            // Verifica se a consulta é futura (ainda não aconteceu)
            let isConsultaFutura = false;
            if (normalized?.date && normalized?.time) {
              try {
                const dateOnly = normalized.date.split('T')[0].split(' ')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                  const agoraBr = dayjs().tz('America/Sao_Paulo');
                  const agoraTimestamp = agoraBr.valueOf();
                  const [hh, mm] = normalized.time.split(':').map(Number);
                  const inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
                  
                  // Consulta é futura se ainda não começou
                  isConsultaFutura = inicioConsulta > agoraTimestamp;
                }
              } catch {
                // Em caso de erro, assume que não é futura
                isConsultaFutura = false;
              }
            }
            
            // 🎯 REGRA: Verifica se está em andamento usando ScheduledAt da ReservaSessao (50 minutos)
            // Se status for EmAndamento/Andamento e dentro de 50 minutos do ScheduledAt, mostra "Em Andamento"
            if (consultaEmAndamento || (statusConsulta === 'Andamento' || statusConsulta === 'andamento' || statusConsulta === 'EmAndamento' || statusConsulta === 'Em Andamento')) {
              let inicioConsulta: number | null = null;
              
              // Prioriza ScheduledAt da ReservaSessao
              if (reservaSessao && typeof reservaSessao === 'object' && 'ScheduledAt' in reservaSessao) {
                const reservaSessaoComScheduledAt = reservaSessao as { ScheduledAt?: string };
                if (reservaSessaoComScheduledAt.ScheduledAt) {
                  try {
                    // ScheduledAt está no formato 'YYYY-MM-DD HH:mm:ss'
                    const scheduledAtStr = reservaSessaoComScheduledAt.ScheduledAt;
                    const [datePart, timePart] = scheduledAtStr.split(' ');
                    if (datePart && timePart) {
                      const [year, month, day] = datePart.split('-').map(Number);
                      const [hour, minute, second = 0] = timePart.split(':').map(Number);
                      const inicioConsultaDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`, 'America/Sao_Paulo');
                      inicioConsulta = inicioConsultaDate.valueOf();
                    }
                  } catch (error) {
                    console.error('[ProximasConsultasPsicologo] Erro ao parsear ScheduledAt:', error);
                  }
                }
              }
              
              // Fallback: usa date/time se ScheduledAt não estiver disponível
              if (!inicioConsulta && normalized?.date && normalized?.time) {
                const dateOnly = normalized.date.split('T')[0].split(' ')[0];
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
                  const [hh, mm] = normalized.time.split(':').map(Number);
                  inicioConsulta = dayjs.tz(`${dateOnly} ${hh}:${mm}:00`, 'America/Sao_Paulo').valueOf();
                }
              }
              
              if (inicioConsulta) {
                const agoraBr = dayjs().tz('America/Sao_Paulo');
                const agoraTimestamp = agoraBr.valueOf();
                const fimConsulta = inicioConsulta + (50 * 60 * 1000); // 50 minutos
                
                if (agoraTimestamp >= inicioConsulta && agoraTimestamp <= fimConsulta) {
                  // 🎯 Mostra status "Em Andamento" quando consulta está em andamento (dentro dos 50 minutos)
                  const tagInfo = getStatusTagInfo('EmAndamento');
                  return (
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow`}>
                        {tagInfo.texto}
                      </span>
                    </div>
                  );
                }
              }
            }
            
            // Se a consulta é futura, não mostra status de "não compareceu" ou outros status que só fazem sentido após a consulta
            // Para consultas futuras, mostra apenas "Reservado" ou "Agendada"
            if (isConsultaFutura) {
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
              
              const statusLower = statusConsulta.toLowerCase();
              const isStatusInvalido = statusInvalidosParaFuturas.some(invalido => 
                statusLower.includes(invalido.toLowerCase()) || 
                statusConsulta === invalido
              );
              
              if (isStatusInvalido) {
                // Para consultas futuras com status inválido, força "Reservado"
                const tagInfo = getStatusTagInfo('Reservado');
                return (
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
                    {tagInfo.texto}
                  </span>
                );
              }
            }
            
            // 🎯 REGRA: Verifica cancelamento por inatividade (10 minutos após início)
            // Busca informações de cancelamento da tabela CancelamentoSessao
            const cancelamentoSessao = normalized?.raw?.CancelamentoSessao;
            const cancelamento = Array.isArray(cancelamentoSessao) && cancelamentoSessao.length > 0 
              ? cancelamentoSessao[0] 
              : cancelamentoSessao;
            
            // Mapeia tipo de cancelamento para texto
            const tipoCancelamentoMap: Record<string, string> = {
              'PACIENTE': 'Cancelada pelo paciente',
              'Psicologo': 'Cancelada pelo psicólogo',
              'PSICOLOGO': 'Cancelada pelo psicólogo',
              'Sistema': 'Cancelada pelo sistema',
              'SISTEMA': 'Cancelada pelo sistema',
            };
            
            // Mapeia status de cancelamento para texto
            const statusCancelamentoMap: Record<string, string> = {
              'EmAnalise': 'Em análise',
              'Deferido': 'Cancelada',
              'Indeferido': 'Cancelamento indeferido',
              'Cancelado': 'Cancelada',
            };
            
            // Verifica se há cancelamento na tabela CancelamentoSessao
            if (cancelamento && typeof cancelamento === 'object' && 'Status' in cancelamento) {
              const cancelamentoObj = cancelamento as { Status?: string; Tipo?: string };
              const statusCancelamento = cancelamentoObj.Status;
              const tipoCancelamento = cancelamentoObj.Tipo;
              
              // Mostra tag de cancelada se o status for Deferido ou Cancelado
              if (statusCancelamento === 'Deferido' || statusCancelamento === 'Cancelado') {
                // 🎯 Determina o texto baseado no Tipo de cancelamento (Paciente, Psicologo ou Sistema/ambos)
                let textoCancelamento = 'Cancelada';
                
                if (tipoCancelamento === 'Paciente' || tipoCancelamento === 'PACIENTE') {
                  textoCancelamento = 'Paciente não compareceu';
                } else if (tipoCancelamento === 'Psicologo' || tipoCancelamento === 'PSICOLOGO') {
                  textoCancelamento = 'Psicólogo não compareceu';
                } else if (tipoCancelamento === 'Sistema' || tipoCancelamento === 'SISTEMA') {
                  // Sistema = ambos não compareceram
                  textoCancelamento = 'Consulta cancelada';
                } else if (tipoCancelamento && tipoCancelamentoMap[tipoCancelamento]) {
                  textoCancelamento = tipoCancelamentoMap[tipoCancelamento];
                } else {
                  textoCancelamento = statusCancelamentoMap[statusCancelamento] || 'Cancelada';
                }
                
                return (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFE5E5] text-[#C53030] shadow z-10">
                    {textoCancelamento}
                  </span>
                );
              }
              
              // Mostra tag de em análise se o status for EmAnalise
              if (statusCancelamento === 'EmAnalise') {
                return (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E6] text-[#E65100] shadow z-10">
                    Cancelamento em análise
                  </span>
                );
              }
            }
            
            // Usa função centralizada para obter informações do status
            const tagInfo = getStatusTagInfo(statusConsulta);
            
            return (
              <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${tagInfo.bg} ${tagInfo.text} shadow z-10`}>
                {tagInfo.texto}
              </span>
            );
          })()}
          
          {/* Cabeçalho removido - título está acima do card */}

          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex gap-4 items-center min-w-0">
              {/* Avatar - igual ao card do paciente */}
              <div className="relative shrink-0">
                <Image
                  src={headerAvatarUrl || "/assets/avatar-placeholder.svg"}
                  alt={effectiveRole === "psicologo" ? "Avatar Paciente" : "Avatar Psicólogo"}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full object-cover border border-[#E6E9FF]"
                />
              </div>
              {/* Informações: nome, data/hora, link perfil - igual ao card do paciente */}
              <div className="flex flex-col flex-1 gap-1 min-w-0">
                <span className="text-[#232A5C] font-semibold text-base leading-5 truncate flex items-center gap-1.5">
                  <Image src="/icons/avatar.svg" alt="Usuário" width={16} height={16} className="shrink-0" />
                  {headerNome}
                </span>
                <span className="text-[#6B7280] text-sm fira-sans flex items-center gap-1.5">
                  <Image src="/icons/calendar.svg" alt="Calendário" width={16} height={16} className="shrink-0" />
                  {formatarDataHora(normalized?.date, normalized?.time)}
                </span>
                {shouldShowPerfil && (
                  <button
                    onClick={() => {
                      if (perfilHref) router.push(perfilHref);
                    }}
                    className="text-left text-[#6D75C0] hover:underline text-sm font-medium fira-sans cursor-pointer mt-1"
                  >
                    Ver perfil
                  </button>
                )}
              </div>
            </div>

            {/* Contador - igual ao card do paciente */}
            {(fraseSessao || mostrarContador) && (
              <div className="flex items-center gap-2 bg-[#E6E9FF] rounded-lg px-3 py-1.5 ml-auto mt-2">
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
                {mostrarContador && contadorSessao && <span className="text-[#8494E9] text-base font-bold fira-sans">{contadorSessao}</span>}
              </div>
            )}
          </div>

          {/* Botões: Ver detalhes e Entrar na sessão lado a lado - sempre visíveis */}
          <div className="flex flex-row gap-3 w-full mt-4 sm:mt-auto pt-2 justify-end flex-wrap">
            {/* Botão Ver detalhes - sempre visível */}
            <button
              onClick={() => setShowModal(true)}
              className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
            >
              Ver detalhes
            </button>
            
            {/* Botão Entrar na sessão - sempre visível, habilitado quando pode entrar */}
            <button
              disabled={botaoEntrarDesabilitado || isProcessingEntry || isCheckingTokens}
              onClick={handleEntrarNaSessao}
              className={`min-h-[44px] h-11 rounded-[6px] px-4 text-sm font-medium transition whitespace-nowrap ${
                !botaoEntrarDesabilitado && !isProcessingEntry && !isCheckingTokens
                  ? 'bg-[#232A5C] hover:bg-[#232A5C]/90 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessingEntry || isCheckingTokens ? 'Aguarde...' : 'Entrar na sessão'}
            </button>
            
            {/* Botão de suporte do WhatsApp para status especiais após o horário ou sessão encerrada por inatividade */}
            {(() => {
              const status6h = ["cancelled_by_patient", "cancelled_by_psychologist", "cancelled_no_show"];
              let dataObj: Date | null = null;
              const dataStr = String(normalized?.date || '');
              const horarioStr = String(normalized?.time || '');
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
                  <button 
                    onClick={handleSuporte} 
                    className="min-h-[44px] h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold fira-sans text-sm rounded-[6px] px-4 transition cursor-pointer whitespace-nowrap"
                  >
                    Fale com o Suporte
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}