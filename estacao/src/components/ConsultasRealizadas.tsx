'use client';
import React, { useEffect, useState } from "react";
import { useConsultasConcluidas } from "@/hooks/consulta";
import { motion, AnimatePresence } from "framer-motion";
import { ConsultaCard } from "@/lib/consultas/ConsultaCard";
import { ConsultaApi } from "@/types/consultasTypes";
import { normalizarStatusExibicao } from "@/utils/statusConsulta.util";

interface RawConsulta {
  Id?: string | number;
  id?: string | number;
  Date?: string;
  date?: string;
  Time?: string;
  time?: string;
  Status?: string;
  status?: string;
  PacienteId?: string | number;
  pacienteId?: string | number;
  AgendaId?: string | number;
  agendaId?: string | number;
  CreatedAt?: string;
  createdAt?: string;
  UpdatedAt?: string;
  updatedAt?: string;
  Agenda?: {
    Data?: string;
    data?: string;
    Horario?: string;
    horario?: string;
    Status?: string;
    status?: string;
  };
  agenda?: {
    Data?: string;
    data?: string;
    Horario?: string;
    horario?: string;
    Status?: string;
    status?: string;
  };
  Psicologo?: {
    Id?: string | number;
    id?: string | number;
    Nome?: string;
    nome?: string;
    Images?: Array<{ Url?: string; url?: string }>;
    images?: Array<{ Url?: string; url?: string }>;
  };
  psicologo?: {
    Id?: string | number;
    id?: string | number;
    Nome?: string;
    nome?: string;
    Images?: Array<{ Url?: string; url?: string }>;
    images?: Array<{ Url?: string; url?: string }>;
  };
  ReservaSessao?: {
    Status?: string;
    status?: string;
    VideoCallLink?: string | null;
    videoCallLink?: string | null;
  };
  reservaSessao?: {
    Status?: string;
    status?: string;
    VideoCallLink?: string | null;
    videoCallLink?: string | null;
  };
  CancelamentoSessao?: {
    Status?: string;
    status?: string;
    Tipo?: string;
    tipo?: string;
  } | Array<{
    Status?: string;
    status?: string;
    Tipo?: string;
    tipo?: string;
  }>;
  cancelamentoSessao?: {
    Status?: string;
    status?: string;
    Tipo?: string;
    tipo?: string;
  } | Array<{
    Status?: string;
    status?: string;
    Tipo?: string;
    tipo?: string;
  }>;
}

/**
 * Converte dados de consulta realizada para ConsultaApi
 */
function converterConsultaRealizadaParaApi(raw: RawConsulta | null | undefined): ConsultaApi | null {
  if (!raw) return null;

  const id = raw.Id ?? raw.id ?? String(Math.random());
  const agendaObj = raw.Agenda ?? raw.agenda ?? null;
  
  let date: string = '';
  let time: string = '';
  let status: string = '';
  
  if (agendaObj) {
    date = agendaObj.Data ?? agendaObj.data ?? '';
    time = agendaObj.Horario ?? agendaObj.horario ?? '';
    status = agendaObj.Status ?? agendaObj.status ?? '';
  }
  
  if (!date) date = raw.Date ?? raw.date ?? '';
  if (!time) time = raw.Time ?? raw.time ?? '';
  if (!status) status = raw.Status ?? raw.status ?? '';

  const psic = raw.Psicologo ?? raw.psicologo ?? null;
  const psImages = psic?.Images ?? psic?.images ?? [];
  
  return {
    Id: String(id),
    Date: date,
    Time: time,
    Status: status,
    PacienteId: raw.PacienteId ? String(raw.PacienteId) : (raw.pacienteId ? String(raw.pacienteId) : ''),
    PsicologoId: psic?.Id ? String(psic.Id) : (psic?.id ? String(psic.id) : ''),
    AgendaId: raw.AgendaId ? String(raw.AgendaId) : (raw.agendaId ? String(raw.agendaId) : ''),
    CreatedAt: raw.CreatedAt ?? raw.createdAt ?? new Date().toISOString(),
    UpdatedAt: raw.UpdatedAt ?? raw.updatedAt ?? new Date().toISOString(),
    Psicologo: psic ? {
      Id: String(psic.Id ?? psic.id ?? ''),
      Nome: psic.Nome ?? psic.nome ?? '',
      Images: Array.isArray(psImages) 
        ? psImages.map((img: { Url?: string; url?: string }) => ({ Url: img?.Url ?? img?.url ?? '' })).filter((img: { Url: string }) => Boolean(img.Url))
        : [],
    } : undefined,
    Agenda: agendaObj ? {
      Data: date,
      Horario: time,
      DiaDaSemana: '',
      Status: status,
    } : undefined,
    ReservaSessao: raw.ReservaSessao ?? raw.reservaSessao ? {
      Status: raw.ReservaSessao?.Status ?? raw.reservaSessao?.Status ?? raw.reservaSessao?.status ?? '',
      VideoCallLink: raw.ReservaSessao?.VideoCallLink ?? raw.reservaSessao?.VideoCallLink ?? null,
    } : undefined,
  };
}

type HistoricoConsultasPayload = {
  completed?: RawConsulta[];
  reserved?: RawConsulta[];
  data?: RawConsulta[];
};

function extrairConsultasNaoReservadas(payload: HistoricoConsultasPayload | HistoricoConsultasPayload[] | null | undefined): RawConsulta[] {
  if (!payload) {
    console.log('[extrairConsultasNaoReservadas] Payload vazio ou null');
    return [];
  }

  // Se for array, processa cada item
  if (Array.isArray(payload)) {
    console.log('[extrairConsultasNaoReservadas] Payload é array com', payload.length, 'itens');
    return payload.flatMap(extrairConsultasNaoReservadas);
  }

  // Tenta extrair de diferentes possíveis formatos
  const colecoesPossiveis: Array<RawConsulta[] | ConsultaApi[] | unknown[] | undefined> = [
    payload.completed as RawConsulta[] | ConsultaApi[] | undefined,
    payload.reserved as RawConsulta[] | ConsultaApi[] | undefined,
    payload.data as RawConsulta[] | ConsultaApi[] | unknown[] | undefined,
    // Tenta também propriedades em camelCase
    Array.isArray((payload as Record<string, unknown>).consultasCompletas) 
      ? (payload as Record<string, unknown>).consultasCompletas as unknown[] 
      : undefined,
    Array.isArray((payload as Record<string, unknown>).consultasRealizadas) 
      ? (payload as Record<string, unknown>).consultasRealizadas as unknown[] 
      : undefined,
    // Tenta também se completed já vier como array de ConsultaApi (do fallback)
    payload.completed as RawConsulta[] | ConsultaApi[] | undefined,
  ];

  const consultas: RawConsulta[] = [];

  colecoesPossiveis.forEach((colecao, index) => {
    if (Array.isArray(colecao) && colecao.length > 0) {
      console.log(`[extrairConsultasNaoReservadas] Encontrada coleção ${index} com ${colecao.length} consultas`);
      // Converte ConsultaApi para RawConsulta se necessário
      const consultasConvertidas = colecao.map((c: unknown): RawConsulta => {
        const consulta = c as ConsultaApi | RawConsulta;
        // Se já for RawConsulta, retorna como está
        if ('Id' in consulta && consulta.Id) {
          return consulta as RawConsulta;
        }
        if ('id' in consulta && consulta.id) {
          return consulta as RawConsulta;
        }
        // Se for ConsultaApi, converte
        const consultaApi = consulta as ConsultaApi;
        return {
          Id: consultaApi.Id || '',
          Date: consultaApi.Date || consultaApi.Agenda?.Data || '',
          Time: consultaApi.Time || consultaApi.Agenda?.Horario || '',
          Status: consultaApi.Status || consultaApi.ReservaSessao?.Status || '',
          Agenda: consultaApi.Agenda || { Data: consultaApi.Date, Horario: consultaApi.Time, Status: consultaApi.Status },
          Psicologo: consultaApi.Psicologo,
          ReservaSessao: consultaApi.ReservaSessao,
        };
      });
      consultas.push(...consultasConvertidas);
    }
  });

  console.log('[extrairConsultasNaoReservadas] Total de consultas encontradas antes do filtro:', consultas.length);

  const statusReservados = new Set(["reservado", "reservada", "reserved"]);
  
  // Para consultas concluídas, podemos ser mais permissivos com o status
  // Se não tiver status claro, ainda pode ser uma consulta concluída
  const consultasFiltradas = consultas.filter((consulta) => {
    const statusReservaSessao = consulta?.ReservaSessao?.Status
      ?? consulta?.reservaSessao?.Status
      ?? consulta?.reservaSessao?.status
      ?? "";

    const statusConsulta = consulta?.Status ?? consulta?.status ?? "";
    const statusAgenda = consulta?.Agenda?.Status ?? consulta?.agenda?.status ?? "";

    const statusBruto = statusReservaSessao || statusConsulta || statusAgenda;
    
    // Se não tiver status, ainda pode ser válida se tiver data e psicólogo
    if (!statusBruto) {
      const temData = consulta?.Date || consulta?.date || consulta?.Agenda?.Data || consulta?.agenda?.data;
      const temPsicologo = consulta?.Psicologo || consulta?.psicologo;
      // Se tiver data e psicólogo, provavelmente é uma consulta válida
      if (temData && temPsicologo) {
        return true;
      }
      return false;
    }

    const statusNormalizado = normalizarStatusExibicao(statusBruto).trim().toLowerCase();
    // Exclui apenas se for status de reservado, mas aceita outros status (incluindo concluídas, canceladas, etc)
    return !statusReservados.has(statusNormalizado);
  });

  console.log('[extrairConsultasNaoReservadas] Total de consultas após filtro:', consultasFiltradas.length);
  
  return consultasFiltradas;
}

// Card deprecated removido - agora usa ConsultaCard da lib

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-[#FCFBF6] to-[#FCFBF6] rounded-full flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-[#8494E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-[#6B7280] text-center font-medium">Você ainda não possui consultas concluídas, reagendadas ou canceladas</p>
      <p className="text-[#9CA3AF] text-sm text-center mt-1">Quando houver histórico, ele aparecerá aqui</p>
    </div>
  );
}

const ConsultasRealizadas: React.FC = () => {
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const { consultasConcluidas, isError } = useConsultasConcluidas();

  // Remove refetch automático - o hook já busca automaticamente e não precisa de refetch manual
  // Isso evita loops e múltiplas chamadas desnecessárias
  
  // Resetar página quando os dados mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [consultasConcluidas]);

  // Log para debug
  React.useEffect(() => {
    console.log('[ConsultasRealizadas] Estado atual:', {
      consultasConcluidas,
      isError,
      temDados: !!consultasConcluidas,
      tipoDados: typeof consultasConcluidas,
      ehArray: Array.isArray(consultasConcluidas),
      keys: consultasConcluidas && typeof consultasConcluidas === 'object' ? Object.keys(consultasConcluidas) : []
    });
  }, [consultasConcluidas, isError]);

  // Extrai consultas elegíveis (não reservadas) dos dados retornados
  const consultasElegiveis = React.useMemo(() => {
    if (!consultasConcluidas) {
      console.log('[ConsultasRealizadas] consultasConcluidas é null/undefined');
      return [];
    }
    
    // Se for um objeto HistoricoConsultas, extrai diretamente
    if (typeof consultasConcluidas === 'object' && ('completed' in consultasConcluidas || 'data' in consultasConcluidas)) {
      const historico = consultasConcluidas as { completed?: unknown[]; reserved?: unknown[]; data?: unknown[] };
      const completed = Array.isArray(historico.completed) ? (historico.completed as RawConsulta[] | ConsultaApi[]) : [];
      const reserved = Array.isArray(historico.reserved) ? (historico.reserved as RawConsulta[] | ConsultaApi[]) : [];
      const data = Array.isArray(historico.data) ? (historico.data as RawConsulta[] | ConsultaApi[]) : [];
      console.log('[ConsultasRealizadas] Extraindo de historico:', {
        completed: completed.length,
        reserved: reserved.length,
        data: data.length
      });
      return extrairConsultasNaoReservadas({ completed, reserved, data });
    }
    
    // Tenta usar a função de extração padrão
    // Extrai todas consultas não reservadas
    const todasNaoReservadas = extrairConsultasNaoReservadas(
      (consultasConcluidas as HistoricoConsultasPayload | HistoricoConsultasPayload[] | null) ?? null,
    );

    // Filtra apenas: Concluídas/Realizadas, Reagendadas e Canceladas
    const apenasCategoriasDesejadas = todasNaoReservadas.filter((c) => {
      const consulta = c as RawConsulta;
      const statusReservaSessao = consulta?.ReservaSessao?.Status
        ?? consulta?.reservaSessao?.Status
        ?? consulta?.reservaSessao?.status
        ?? '';
      const statusConsulta = consulta?.Status ?? consulta?.status ?? '';
      const statusAgenda = consulta?.Agenda?.Status ?? consulta?.agenda?.status ?? '';
      const statusBruto = statusReservaSessao || statusConsulta || statusAgenda;
      const statusNorm = normalizarStatusExibicao(statusBruto).toLowerCase();

      const ehConcluida = statusNorm.includes('concluída') || statusNorm.includes('realizada');
      const ehReagendada = statusNorm.includes('reagendada');
      const ehCancelada = statusNorm.includes('cancelada');
      return ehConcluida || ehReagendada || ehCancelada;
    });

    // Ordena por data/hora desc (mais recentes primeiro)
    const parseDataHora = (item: RawConsulta) => {
      const consultaItem = item as RawConsulta;
      const data = consultaItem?.Date ?? consultaItem?.date ?? consultaItem?.Agenda?.Data ?? consultaItem?.agenda?.data ?? '';
      const hora = consultaItem?.Time ?? consultaItem?.time ?? consultaItem?.Agenda?.Horario ?? consultaItem?.agenda?.horario ?? '';
      const dataOnly = String(data).split('T')[0].split(' ')[0];
      const horaOnly = String(hora).trim();
      const dt = `${dataOnly} ${horaOnly}`.trim();
      return new Date(dt).getTime() || 0;
    };

    return apenasCategoriasDesejadas.sort((a, b) => parseDataHora(b) - parseDataHora(a));
  }, [consultasConcluidas]);

  // Log das consultas elegíveis
  React.useEffect(() => {
    console.log('[ConsultasRealizadas] Consultas elegíveis:', {
      total: consultasElegiveis.length,
      consultas: consultasElegiveis.map(c => ({
        id: c.Id || c.id,
        date: c.Date || c.date || c.Agenda?.Data,
        status: c.Status || c.status
      }))
    });
  }, [consultasElegiveis]);

  const hasConsultas = consultasElegiveis.length > 0;

  // Paginação: mostra 5 itens por página, só ativa se tiver mais de 5 consultas
  const totalPages = Math.ceil(consultasElegiveis.length / ITEMS_PER_PAGE);
  const shouldPaginate = consultasElegiveis.length > ITEMS_PER_PAGE;
  const startIndex = shouldPaginate ? (currentPage - 1) * ITEMS_PER_PAGE : 0;
  const endIndex = shouldPaginate ? startIndex + ITEMS_PER_PAGE : consultasElegiveis.length;
  const consultasVisiveis = consultasElegiveis.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A]">
            Consultas concluídas, reagendadas e canceladas
          </h3>
        </div>
        {hasConsultas && (
          <span className="px-3 py-1 bg-[#E6E9FF] text-[#6D75C0] text-sm font-semibold rounded-full">
            {consultasElegiveis.length} {consultasElegiveis.length === 1 ? 'consulta' : 'consultas'}
          </span>
        )}
      </div>
      {!hasConsultas ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-3 items-center sm:items-start">
            <AnimatePresence mode="wait">
              {consultasVisiveis.map((consultaRaw, index) => {
              const consultaApi = converterConsultaRealizadaParaApi(consultaRaw);
              if (!consultaApi) return null;

              const psicologoId = consultaApi.Psicologo?.Id;
              
              return (
                <motion.div
                  key={consultaApi.Id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ConsultaCard
                    consulta={consultaApi}
                    actions={{
                      onVerPerfil: psicologoId ? () => {
                        // Navega para o perfil do psicólogo
                        if (typeof window !== 'undefined') {
                          window.location.href = `/psicologo/${psicologoId}`;
                        }
                      } : undefined,
                    }}
                  />
                </motion.div>
              );
            }).filter(Boolean)}
            </AnimatePresence>
          </div>
          {/* Paginação - só aparece se tiver mais de 5 consultas */}
          {shouldPaginate && (
            <motion.div 
              className="mt-6 flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                  whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#E6E9FF] text-[#6D75C0] hover:bg-[#8494E9] hover:text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>
                
                <motion.span 
                  className="px-4 py-2 text-[#6D75C0] font-semibold text-sm"
                  key={currentPage}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Página {currentPage} de {totalPages}
                </motion.span>
                
                <motion.button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
                  whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[#E6E9FF] text-[#6D75C0] hover:bg-[#8494E9] hover:text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </div>
              
              <motion.p 
                className="text-[#6B7280] text-xs text-center"
                key={`${startIndex}-${endIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                Mostrando {startIndex + 1}-{Math.min(endIndex, consultasElegiveis.length)} de {consultasElegiveis.length} consultas
              </motion.p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default ConsultasRealizadas;
