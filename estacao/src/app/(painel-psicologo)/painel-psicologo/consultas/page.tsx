"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import SidebarPsicologo from "../SidebarPsicologo";
import { montarConsultasParaCard } from "@/utils/consultasUtils";
import { useObterProximasConsultas, useObterHistoricoConsultas, useObterProximaConsultaPsicologo } from "@/hooks/psicologos/consultas.hook";
import { FiFilter, FiCheckCircle, FiXCircle, FiSearch } from "react-icons/fi";
import ConsultaModal from "@/components/ConsultaModal";
import ModalCancelarSessao from "@/components/ModalCancelarSessao";
import ModalCancelarSessaoDentroPrazo from "@/components/ModalCancelarSessaoDentroPrazo";
import { useConsultaById } from "@/hooks/consulta";
import { obterPrimeiroUltimoNome } from "@/utils/nomeUtils";
import { normalizarStatusExibicao, getStatusTagInfo } from "@/utils/statusConsulta.util";
import { isCancelamentoDentroPrazo } from "@/utils/cancelamentoUtils";
import { isConsultaDentro60MinutosComScheduledAt } from "@/utils/consultaTempoUtils";
import ConsultaAtualPsicologo from "@/components/ConsultaAtualPsicologo";
import { joinUserRoom, onProximaConsultaAtualizada, offProximaConsultaAtualizada, onConsultationStatusChanged, offConsultationStatusChanged } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';
import { useUserBasic } from "@/hooks/user/userHook";
import toast from "react-hot-toast";
import type { Reserva } from "@/types/consultasTypes";
import type { ProximasConsultas } from "@/types/psicologoTypes";

// Tipos
type Consulta = {
  id: string;
  paciente: string;
  data: string;
  hora: string;
  status: string;
  duracao?: string;
};

// Tipo para consulta com propriedades em maiúsculas (ConsultaApi)
type ConsultaComMaiusculas = {
  Id?: string;
  Date?: string;
  Time?: string;
  Status?: string;
  Paciente?: {
    Id?: string;
    Nome?: string;
    Images?: { Url?: string }[];
  };
  Psicologo?: {
    Id?: string;
    Nome?: string;
    Images?: { Url?: string }[];
  };
  paciente?: {
    id?: string;
    nome?: string;
  };
  psicologo?: {
    id?: string;
    nome?: string;
  };
  date?: string;
  time?: string;
  status?: string;
  consulta?: {
    Data?: string;
    Horario?: string;
    Status?: string;
  };
};


// Tipo para consulta do histórico
type ConsultaHistorico = {
  Id: string;
  Date: string;
  Time: string;
  Status: string;
  Paciente?: {
    Nome?: string;
  };
};

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(time: string): string {
  // Garante que o horário está no formato HH:mm
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}

// Função para garantir que apenas o nome completo do paciente seja exibido
// Remove qualquer dado sensível que possa vir acidentalmente da API
function getNomePacienteSeguro(paciente: string | undefined | null): string {
  if (!paciente) return "Não informado";
  
  // Remove possíveis dados sensíveis que possam estar concatenados
  // Remove emails, CPFs, telefones, etc.
  let nome = paciente.trim();
  
  // Remove padrões de email
  nome = nome.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '');
  
  // Remove padrões de CPF (XXX.XXX.XXX-XX ou XXXXXXXXXXX)
  nome = nome.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '');
  
  // Remove padrões de telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
  nome = nome.replace(/\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, '');
  
  // Remove múltiplos espaços
  nome = nome.replace(/\s+/g, ' ').trim();
  
  // Se após a limpeza não sobrar nada, retorna "Não informado"
  if (!nome) return "Não informado";
  
  return nome;
}

// Função removida - usando normalizarStatusExibicao do utils

export default function ConsultasPage() {
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "efetuada" | "cancelada">("todos");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [consultaSelecionadaId, setConsultaSelecionadaId] = useState<string | null>(null);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [showModalCancelarDentroPrazo, setShowModalCancelarDentroPrazo] = useState(false);
  const pageSize = 5;

  const { proximasConsultas, refetch: refetchProximasConsultas } = useObterProximasConsultas();
  const { consultaAtual: consultaAtualFromHook, refetch: refetchConsultaAtual } = useObterProximaConsultaPsicologo();
  const userBasic = useUserBasic();

  // Escuta atualizações em tempo real via socket
  useEffect(() => {
    const userId = userBasic.user?.Id;
    if (!userId) return;

    joinUserRoom(userId);

    const handler = () => {
      // Quando recebe atualização via socket, força refetch
      refetchProximasConsultas();
      refetchConsultaAtual();
      
      // Invalida queries relacionadas para atualizar em tempo real
      queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
      queryClient.invalidateQueries({ queryKey: ['reserva-sessao'] });
    };

    onProximaConsultaAtualizada(handler);
    return () => {
      offProximaConsultaAtualizada();
    };
  }, [userBasic.user?.Id, refetchProximasConsultas, refetchConsultaAtual]);

  // Para psicólogo: passar todas as consultas para a função utilitária, que já filtra corretamente
  const consultasParaCard = montarConsultasParaCard(undefined, proximasConsultas);
  
  // Próxima consulta para exibir no card
  // O tipo retornado por montarConsultasParaCard pode ser ProximasConsultas ou Consulta
  type ConsultaCard = ProximasConsultas | {
    Id: string;
    Date?: string;
    Time?: string;
    Status?: string;
    Paciente?: { Nome?: string };
  };
  const proximaConsulta: ConsultaCard | null = consultasParaCard.length > 0 ? (consultasParaCard[0] as ConsultaCard) : null;

  // Escuta mudanças de status de consulta em tempo real
  useEffect(() => {
    const consultaIds = new Set<string>();
    
    if (consultaAtualFromHook?.Id) {
      consultaIds.add(consultaAtualFromHook.Id);
    }
    if (proximaConsulta?.Id) {
      consultaIds.add(proximaConsulta.Id);
    }

    const cleanupFunctions: (() => void)[] = [];

    consultaIds.forEach((consultaId) => {
      const handler = (data: { status: string; consultationId: string }) => {
        if (data.consultationId === consultaId) {
          console.log(`[ConsultasPage] Status da consulta ${consultaId} mudou para ${data.status}`);
          
          // Força refetch de todas as queries relacionadas
          refetchProximasConsultas();
          refetchConsultaAtual();
          
          // Invalida queries para atualizar em tempo real
          queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
          queryClient.invalidateQueries({ queryKey: ['consultas-psicologo'] });
          queryClient.invalidateQueries({ queryKey: ['reserva-sessao', consultaId] });
          queryClient.invalidateQueries({ queryKey: ['consulta', consultaId] });
          queryClient.invalidateQueries({ queryKey: ['historico-consultas'] });
        }
      };

      onConsultationStatusChanged(handler, consultaId);
      cleanupFunctions.push(() => offConsultationStatusChanged(consultaId));
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [consultaAtualFromHook?.Id, proximaConsulta?.Id, refetchProximasConsultas, refetchConsultaAtual]);

  // Monitora quando consulta entra/sai dos 60 minutos e atualiza automaticamente
  useEffect(() => {
    if (!consultaAtualFromHook) return;

    // Verifica a cada 10 segundos se a consulta ainda está dentro dos 60 minutos
    const interval = setInterval(() => {
      const scheduledAt = 'ScheduledAt' in consultaAtualFromHook ? (consultaAtualFromHook as { ScheduledAt?: string }).ScheduledAt : undefined;
      const aindaDentro = isConsultaDentro60MinutosComScheduledAt(
        scheduledAt,
        consultaAtualFromHook.Date,
        consultaAtualFromHook.Time
      );

      // Se saiu dos 60 minutos, força atualização
      if (!aindaDentro) {
        console.log('[ConsultasPage] Consulta saiu dos 60 minutos, atualizando...');
        refetchProximasConsultas();
        refetchConsultaAtual();
        queryClient.invalidateQueries({ queryKey: ['proximaConsultaPsicologo'] });
      }
    }, 10000); // Verifica a cada 10 segundos

    return () => clearInterval(interval);
  }, [consultaAtualFromHook, refetchProximasConsultas, refetchConsultaAtual]);

  // Busca detalhes da consulta selecionada
  const { consulta: consultaDetalhes } = useConsultaById(consultaSelecionadaId || undefined);

  // Busca histórico de consultas com filtros
  const { consultas, totalPages, isLoading, isError } = useObterHistoricoConsultas({
    status: filtro,
    buscaPaciente: busca || undefined,
    dataInicial: dataInicial || undefined,
    dataFinal: dataFinal || undefined,
    page,
    pageSize,
  });

  // Mapeia as consultas da API para o formato esperado pela UI
  const consultasMapeadas: Consulta[] = useMemo(() => {
    return consultas.map((consulta: ConsultaHistorico) => ({
      id: consulta.Id,
      paciente: getNomePacienteSeguro(consulta.Paciente?.Nome),
      data: consulta.Date ? formatDate(consulta.Date) : '',
      hora: formatTime(consulta.Time || ''),
      status: normalizarStatusExibicao(consulta.Status),
      duracao: '50 min', // Valor padrão, pode ser ajustado se houver no backend
    }));
  }, [consultas]);

  // Função para abrir modal de detalhes
  const handleVerDetalhes = (consultaId: string) => {
    setConsultaSelecionadaId(consultaId);
    setModalOpen(true);
  };

  // Função para fechar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setConsultaSelecionadaId(null);
  };

  // Função para abrir modal de cancelamento
  const handleAbrirCancelar = useCallback((consultaId?: string | number) => {
    console.log('[ConsultasPage] handleAbrirCancelar chamado com consultaId:', consultaId);
    
    if (!consultaDetalhes) {
      console.error('[ConsultasPage] consultaDetalhes não disponível');
      return;
    }
    
    // Extrai data e horário da consulta
    const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
    let consultaDate: string | undefined;
    let consultaTime: string | undefined;
    
    if (isReserva) {
      const reserva = consultaDetalhes as Reserva;
      consultaDate = reserva.date || reserva.consulta?.Data;
      consultaTime = reserva.time || reserva.consulta?.Horario;
    } else {
      const consulta = consultaDetalhes as ConsultaComMaiusculas;
      consultaDate = consulta.Date || consulta.date || consulta.consulta?.Data;
      consultaTime = consulta.Time || consulta.time || consulta.consulta?.Horario;
    }
    
    if (!consultaDate || !consultaTime) {
      console.error('[ConsultasPage] Data ou horário da consulta não disponíveis');
      toast.error('Erro: dados da consulta não encontrados. Por favor, tente novamente.');
      return;
    }
    
    // Verifica se está dentro ou fora do prazo de 24h
    const dentroPrazo = isCancelamentoDentroPrazo(consultaDate, consultaTime);
    
    console.log('[ConsultasPage] Verificação de prazo', {
      dentroPrazo,
      consultaDate,
      consultaTime
    });
    
    // Fecha o modal de detalhes primeiro
    setModalOpen(false);
    
    // Aguarda um pouco antes de abrir o modal de cancelamento
    setTimeout(() => {
      if (dentroPrazo) {
        // Dentro do prazo (>=24h): usa modal simples sem motivo
        console.log('[ConsultasPage] Abrindo modal de cancelamento dentro do prazo (>=24h)');
        setShowModalCancelarDentroPrazo(true);
      } else {
        // Fora do prazo (<24h): usa modal com motivo obrigatório e upload
        console.log('[ConsultasPage] Abrindo modal de cancelamento fora do prazo (<24h)');
        setShowModalCancelar(true);
      }
    }, 300);
  }, [consultaDetalhes]);

  // Função para fechar modal de cancelamento
  const handleFecharCancelar = () => {
    setShowModalCancelar(false);
    setShowModalCancelarDentroPrazo(false);
  };


  // Prepara dados da consulta para o modal
  const consultaModalData = useMemo(() => {
    if (!consultaDetalhes) return null;
    
    // O tipo Reserva pode ter propriedades em minúsculas ou maiúsculas
    // Verifica se é do tipo Reserva (tem propriedades em minúsculas)
    const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
    
    let pacienteNome = 'Paciente não informado';
    let psicologoNome = 'Psicólogo não informado';
    let consultaDate: string | undefined;
    let consultaTime: string | undefined;
    let pacienteImages: { Url?: string }[] | undefined;
    let psicologoImages: { Url?: string }[] | undefined;
    
    if (isReserva) {
      // Tipo Reserva (minúsculas)
      const reserva = consultaDetalhes as Reserva;
      pacienteNome = getNomePacienteSeguro(reserva.paciente?.nome);
      psicologoNome = reserva.psicologo?.nome || 'Psicólogo não informado';
      consultaDate = reserva.date || reserva.consulta?.Data;
      consultaTime = reserva.time || reserva.consulta?.Horario;
    } else {
      // Tipo ConsultaApi ou outro formato (maiúsculas)
      const consulta = consultaDetalhes as ConsultaComMaiusculas;
      pacienteNome = getNomePacienteSeguro(consulta.Paciente?.Nome || consulta.paciente?.nome);
      psicologoNome = consulta.Psicologo?.Nome || consulta.psicologo?.nome || 'Psicólogo não informado';
      consultaDate = consulta.Date || consulta.date || consulta.consulta?.Data;
      consultaTime = consulta.Time || consulta.time || consulta.consulta?.Horario;
      pacienteImages = consulta.Paciente?.Images;
      psicologoImages = consulta.Psicologo?.Images;
    }
    
    return {
      data: consultaDate ? formatDate(consultaDate) : '',
      dataOriginal: consultaDate, // Data original para uso nos modais de cancelamento
      horario: formatTime(consultaTime || ''),
      horarioOriginal: consultaTime, // Horário original para uso nos modais de cancelamento
      paciente: {
        nome: pacienteNome,
        avatarUrl: pacienteImages?.[0]?.Url || '/icons/avatar.svg',
      },
      psicologo: {
        nome: psicologoNome,
        avatarUrl: psicologoImages?.[0]?.Url || '/icons/avatar.svg',
      },
    };
  }, [consultaDetalhes]);

  return (
    <div className="min-h-screen font-fira-sans bg-[#F6F7FB]">
      <div className="max-w-[1200px] mx-auto w-full flex">
        {/* Sidebar - coluna esquerda */}
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        {/* Conteúdo principal - coluna direita */}
        <main className="flex-1 py-4 sm:py-8 px-4 sm:px-6 font-fira-sans w-full">
          <div className="max-w-[1000px] mx-auto">
            {/* Consulta atual - aparece acima de "Consultas programadas" durante os 60 minutos */}
            {consultaAtualFromHook && isConsultaDentro60MinutosComScheduledAt(
              'ScheduledAt' in consultaAtualFromHook ? (consultaAtualFromHook as { ScheduledAt?: string }).ScheduledAt : undefined,
              consultaAtualFromHook.Date,
              consultaAtualFromHook.Time
            ) && (
              <section className="mb-6 sm:mb-8">
                <h2 className="text-lg font-semibold mb-4 font-fira-sans">Consulta atual</h2>
                <ConsultaAtualPsicologo consulta={consultaAtualFromHook} hidePerfil />
              </section>
            )}
            
            {/* Lista de hoje */}
            <section className="mb-6 sm:mb-8">
              <h2 className="text-lg font-semibold mb-4 font-fira-sans">Consultas programadas</h2>
              {proximaConsulta ? (
                <motion.div
                  className="bg-white shadow rounded-xl p-4 flex flex-col font-fira-sans"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <p className="font-medium text-gray-900 font-fira-sans">
                        {obterPrimeiroUltimoNome(getNomePacienteSeguro(proximaConsulta.Paciente?.Nome)) || 'Paciente'}
                      </p>
                      <p className="text-sm text-gray-500 font-fira-sans">
                        {proximaConsulta.Date ? formatDate(proximaConsulta.Date) : ''} às {formatTime(proximaConsulta.Time || '')}
                      </p>
                      <p className="text-xs text-gray-400 font-fira-sans">Duração: 50 min</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {(() => {
                      const statusInfo = getStatusTagInfo(proximaConsulta.Status);
                      return (
                        <span className={`text-xs font-semibold px-2 py-1 rounded font-fira-sans ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.texto}
                        </span>
                      );
                    })()}
                    <button
                      onClick={() => handleVerDetalhes(proximaConsulta.Id)}
                      className="text-xs text-[#6D75C0] underline font-semibold font-fira-sans hover:text-[#4B51A6] transition cursor-pointer text-right sm:text-left"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white shadow rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 font-fira-sans">Nenhuma consulta agendada para hoje.</p>
                </div>
              )}
            </section>

            {/* Filtros e busca */}
            <div className="w-full flex flex-col gap-3 mb-6">
              <div className="flex gap-2 w-full flex-wrap">
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded font-fira-sans text-xs transition ${
                    filtro === "todos"
                      ? "bg-[#6D75C0] text-white"
                      : "bg-white text-[#6D75C0] border border-[#6D75C0] hover:bg-[#F0F1FA]"
                  }`}
                  onClick={() => { setFiltro("todos"); setPage(1); }}
                  disabled={isLoading}
                >
                  <FiFilter size={14} />
                  Todos
                </button>
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded font-fira-sans text-xs transition ${
                    filtro === "efetuada"
                      ? "bg-[#6D75C0] text-white"
                      : "bg-white text-[#6D75C0] border border-[#6D75C0] hover:bg-[#F0F1FA]"
                  }`}
                  onClick={() => { setFiltro("efetuada"); setPage(1); }}
                  disabled={isLoading}
                >
                  <FiCheckCircle size={14} />
                  Efetuada
                </button>
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded font-fira-sans text-xs transition ${
                    filtro === "cancelada"
                      ? "bg-[#6D75C0] text-white"
                      : "bg-white text-[#6D75C0] border border-[#6D75C0] hover:bg-[#F0F1FA]"
                  }`}
                  onClick={() => { setFiltro("cancelada"); setPage(1); }}
                  disabled={isLoading}
                >
                  <FiXCircle size={14} />
                  Cancelada
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full items-stretch sm:items-center">
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                    <FiSearch size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setPage(1); }}
                    className="pl-8 border border-gray-300 rounded px-3 py-1.5 text-sm font-fira-sans w-full focus:outline-[#6D75C0] transition"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2 items-center w-full sm:w-auto">
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={e => { setDataInicial(e.target.value); setPage(1); }}
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm font-fira-sans flex-1 sm:w-40 focus:outline-[#6D75C0] transition"
                    placeholder="Data inicial"
                    disabled={isLoading}
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">até</span>
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={e => { setDataFinal(e.target.value); setPage(1); }}
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm font-fira-sans flex-1 sm:w-40 focus:outline-[#6D75C0] transition"
                    placeholder="Data final"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Histórico */}
            <section className="mb-24 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold mb-4 font-fira-sans">Histórico de Consultas</h2>
              {isLoading && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 font-fira-sans">Carregando consultas...</p>
                </div>
              )}
              {isError && (
                <div className="text-center py-8">
                  <p className="text-sm text-red-500 font-fira-sans">Erro ao carregar consultas. Tente novamente.</p>
                </div>
              )}
              {!isLoading && !isError && (
                <>
                  <ul className="space-y-3">
                    {consultasMapeadas.length === 0 && (
                      <li className="text-sm text-gray-500 font-fira-sans">Nenhuma consulta encontrada.</li>
                    )}
                    {consultasMapeadas.map((c) => (
                      <motion.li
                        key={c.id}
                        className="bg-white shadow rounded-xl p-4 flex flex-col font-fira-sans"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div>
                            <p className="font-medium text-gray-900 font-fira-sans">{c.paciente}</p>
                            <p className="text-sm text-gray-500 font-fira-sans">
                              {c.data} às {c.hora}
                            </p>
                            <p className="text-xs text-gray-400 font-fira-sans">Duração: {c.duracao}</p>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          {(() => {
                            const statusInfo = getStatusTagInfo(c.status);
                            const isEfetuada = c.status === "Efetuada" || c.status?.toLowerCase().includes("realizada") || c.status?.toLowerCase().includes("concluida");
                            return (
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded font-fira-sans ${
                                  isEfetuada
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {statusInfo.texto}
                              </span>
                            );
                          })()}
                          {/* Link ver detalhes */}
                          <button
                            onClick={() => handleVerDetalhes(c.id)}
                            className="text-xs text-[#6D75C0] underline font-semibold font-fira-sans hover:text-[#4B51A6] transition cursor-pointer text-right sm:text-left"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  {/* Paginação */}
                  {totalPages > 0 && (
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-6 font-fira-sans">
                      <button
                        className="px-3 py-1.5 rounded bg-gray-200 text-xs sm:text-sm disabled:opacity-50 font-fira-sans disabled:cursor-not-allowed w-full sm:w-auto"
                        disabled={page === 1 || isLoading}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Anterior
                      </button>
                      <span className="text-xs sm:text-sm font-fira-sans">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        className="px-3 py-1.5 rounded bg-gray-200 text-xs sm:text-sm disabled:opacity-50 font-fira-sans disabled:cursor-not-allowed w-full sm:w-auto"
                        disabled={page === totalPages || isLoading}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Modal de detalhes da consulta */}
      {consultaModalData && (
        <>
          <ConsultaModal
            open={modalOpen}
            onClose={handleCloseModal}
            consulta={consultaModalData}
            botaoEntrarDesabilitado={true}
            consultaId={consultaSelecionadaId || undefined}
            sessaoAtiva={false}
            statusCancelamento={(() => {
              if (!consultaDetalhes) return null;
              const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
              if (isReserva) {
                const reserva = consultaDetalhes as Reserva;
                return reserva.status || reserva.consulta?.Status || null;
              } else {
                const consulta = consultaDetalhes as ConsultaComMaiusculas;
                return consulta.Status || consulta.status || consulta.consulta?.Status || null;
              }
            })()}
            onAbrirCancelar={handleAbrirCancelar}
          />

          {/* Modal de cancelamento dentro do prazo (>=24h) */}
          {showModalCancelarDentroPrazo && consultaDetalhes && consultaModalData && (
            <ModalCancelarSessaoDentroPrazo
              open={showModalCancelarDentroPrazo}
              onClose={handleFecharCancelar}
              onConfirm={async () => {
                // A lógica de cancelamento é feita dentro do modal
                handleFecharCancelar();
                handleCloseModal();
                // Recarrega a página para atualizar os dados
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }}
              consulta={{
                id: consultaSelecionadaId || undefined,
                date: consultaModalData.dataOriginal,
                time: consultaModalData.horarioOriginal,
                pacienteId: (() => {
                  const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
                  if (isReserva) {
                    const reserva = consultaDetalhes as Reserva;
                    return reserva.paciente?.id || reserva.pacienteId;
                  } else {
                    const consulta = consultaDetalhes as ConsultaComMaiusculas;
                    return consulta.Paciente?.Id || consulta.paciente?.id;
                  }
                })(),
                psicologoId: (() => {
                  const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
                  if (isReserva) {
                    const reserva = consultaDetalhes as Reserva;
                    return reserva.psicologo?.id || reserva.psicologoId;
                  } else {
                    const consulta = consultaDetalhes as ConsultaComMaiusculas;
                    return consulta.Psicologo?.Id || consulta.psicologo?.id;
                  }
                })(),
                tipo: "Psicologo"
              }}
            />
          )}

          {/* Modal de cancelamento fora do prazo (<24h) */}
          {showModalCancelar && consultaDetalhes && consultaModalData && (
            <ModalCancelarSessao
              open={showModalCancelar}
              onClose={handleFecharCancelar}
              onConfirm={async () => {
                // A lógica de cancelamento é feita dentro do modal
                handleFecharCancelar();
                handleCloseModal();
                // Recarrega a página para atualizar os dados
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }}
              consulta={{
                id: consultaSelecionadaId || undefined,
                date: consultaModalData.dataOriginal || consultaModalData.data,
                time: consultaModalData.horarioOriginal || consultaModalData.horario,
                pacienteId: (() => {
                  const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
                  if (isReserva) {
                    const reserva = consultaDetalhes as Reserva;
                    return reserva.paciente?.id || reserva.pacienteId;
                  } else {
                    const consulta = consultaDetalhes as ConsultaComMaiusculas;
                    return consulta.Paciente?.Id || consulta.paciente?.id;
                  }
                })(),
                psicologoId: (() => {
                  const isReserva = 'paciente' in consultaDetalhes && typeof consultaDetalhes.paciente === 'object' && consultaDetalhes.paciente !== null && 'nome' in consultaDetalhes.paciente;
                  if (isReserva) {
                    const reserva = consultaDetalhes as Reserva;
                    return reserva.psicologo?.id || reserva.psicologoId;
                  } else {
                    const consulta = consultaDetalhes as ConsultaComMaiusculas;
                    return consulta.Psicologo?.Id || consulta.psicologo?.id;
                  }
                })(),
                tipo: "Psicologo",
                paciente: {
                  nome: consultaModalData.paciente.nome
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}