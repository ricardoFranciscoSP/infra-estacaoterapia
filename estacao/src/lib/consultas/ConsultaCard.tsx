'use client';

import React, { useState } from 'react';
import { ConsultaApi } from '@/types/consultasTypes';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { getAvatarUrl } from '@/utils/avatarUtils';
import { formatDateBR, formatTimeBR } from '@/utils/formatarDataHora';
import { useContadorGlobal } from '@/hooks/useContadorGlobal';
import ConsultaModal from '@/components/ConsultaModal';
import ModalReagendar from '@/components/ModalReagendar';
import { obterPrimeiroUltimoNome } from '@/utils/nomeUtils';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ClockIcon, UserIcon, CalendarIcon } from '@/components/icons/ConsultaIcons';
import { ConsultaStatusBadge } from '@/components/ConsultaStatusBadge';

interface ConsultaCardProps {
  consulta: ConsultaApi;
  badge?: {
    text: string;
    variant: 'hoje' | 'amanha' | 'info';
  };
  actions?: {
    onEntrar?: () => void;
    onVerDetalhes?: () => void;
    onReagendar?: () => void;
    onVerPerfil?: () => void;
    onSuporte?: () => void;
  };
  showEntrarButton?: boolean;
  // Suporte para contador (consulta atual)
  contador?: {
    frase: string;
    tempo: string;
    mostrar: boolean;
  };
  mostrarBotaoSuporte?: boolean;
  botaoEntrarDesabilitado?: boolean;
  isLoadingEntry?: boolean;
  onAbrirCancelar?: (consultaId?: string | number) => void;
  // Prop para indicar se é painel do psicólogo (ajusta estilo e remove Reagendar)
  isPsicologoPanel?: boolean;
  /** Painel do paciente: mesmo bg do card Consultas Avulsas, tag estilo "consultas restantes", botões à esquerda */
  isPacientePanel?: boolean;
  supportOnly?: boolean;
  statusOverride?: string;
}

const BADGE_VARIANTS = {
  hoje: 'bg-[#E6E9FF] text-[#6D75C0]',
  amanha: 'bg-[#E6E9FF] text-[#6D75C0]',
  info: 'bg-[#E6E9FF] text-[#6D75C0]',
  reservado: 'bg-[#B7AFFF] text-[#5B3DF6] shadow-md', // lilás destaque para reservado
};

export function ConsultaCard({
  consulta,
  badge,
  actions,
  contador,
  mostrarBotaoSuporte = false,
  botaoEntrarDesabilitado = false,
  isLoadingEntry = false,
  onAbrirCancelar,
  isPsicologoPanel = false,
  isPacientePanel = false,
  supportOnly = false,
  statusOverride,
}: ConsultaCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [showModalReagendar, setShowModalReagendar] = useState(false);

  const data = formatDateBR(consulta.Agenda?.Data || consulta.Date || '') || "--/--/----";
  const horario = formatTimeBR(consulta.Agenda?.Horario || consulta.Time);
  const nomePsicologoCompleto = consulta.Psicologo?.Nome || 'Psicólogo';
  const nomePsicologo = obterPrimeiroUltimoNome(nomePsicologoCompleto) || nomePsicologoCompleto;
  const fotoPsicologo = getAvatarUrl(consulta.Psicologo?.Images?.[0]);
  const psicologoId = consulta.Psicologo?.Id;

  // Sincronização do contador usando timestamp do backend
  // startTime deve vir da API (ex: consulta.startTime ou consulta.Agenda?.startTime)
  // Se não vier, fallback para Date.now()
  // Usa a data da consulta como referência de início
  let startTime: number;
  if (consulta.Agenda && 'Data' in consulta.Agenda && consulta.Agenda.Data) {
    startTime = new Date(consulta.Agenda.Data).getTime();
  } else if (consulta.Date) {
    startTime = new Date(consulta.Date).getTime();
  } else {
    startTime = Date.now();
  }
  const { timestamp } = useContadorGlobal();
  // Calcula tempo decorrido desde o início da consulta
  const tempoDecorridoSegundos = Math.floor((timestamp - startTime) / 1000);
  // Exemplo de formatação: HH:mm:ss
  function formatarTempo(segundos: number) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  // Atualiza contador. Se já existir, sobrescreve tempo; se não, cria novo objeto.
  const contadorSincronizado = contador ? {
    ...contador,
    tempo: formatarTempo(tempoDecorridoSegundos),
  } : {
    frase: 'Tempo de consulta',
    tempo: formatarTempo(tempoDecorridoSegundos),
    mostrar: true,
  };

  const handleCloseModal = () => setShowModal(false);
  const handleCloseReagendar = () => setShowModalReagendar(false);

  const handleVerDetalhes = () => {
    if (actions?.onVerDetalhes) {
      actions.onVerDetalhes();
    } else {
      setShowModal(true);
    }
  };

  const handleReagendar = () => {
    if (actions?.onReagendar) {
      actions.onReagendar();
    } else {
      setShowModalReagendar(true);
    }
  };

  const showPrimaryActions = !supportOnly;

  return (
    <>
      {/* Modal de detalhes da consulta */}
      <ConsultaModal
        open={showModal}
        onClose={handleCloseModal}
        consulta={{
          data: consulta.Agenda?.Data || consulta.Date || "",
          horario: consulta.Agenda?.Horario || consulta.Time || "",
          psicologo: {
            nome: nomePsicologo,
            avatarUrl: fotoPsicologo,
          },
        }}
        botaoEntrarDesabilitado={true}
        consultaId={consulta.Id ? String(consulta.Id) : undefined}
        onAbrirCancelar={(consultaId) => {
          // Fecha o modal de detalhes com animação de saída
          setShowModal(false);
          // Aguarda a animação de saída do modal (300ms) antes de abrir o de cancelamento
          setTimeout(() => {
            if (onAbrirCancelar) {
              onAbrirCancelar(consultaId);
            }
          }, 300); // Tempo para a animação de saída do modal
        }}
      />

      {/* Modal de reagendamento */}
      <ModalReagendar
        isOpen={showModalReagendar}
        onClose={handleCloseReagendar}
        consulta={{
          data: consulta.Agenda?.Data || consulta.Date || "",
          horario: consulta.Agenda?.Horario || consulta.Time || "",
          psicologo: {
            nome: nomePsicologo,
            id: psicologoId ? String(psicologoId) : undefined,
            Image: consulta.Psicologo?.Images,
          },
        }}
        consultaIdAtual={consulta.Id?.toString() || ""}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className={cn(
          "relative w-full max-w-full rounded-2xl shadow-md border-0",
          "transition-all duration-300 hover:shadow-lg mb-6",
          isPacientePanel 
            ? "bg-[#F8F6FC] overflow-visible sm:max-w-full sm:w-full md:max-w-[650px] md:w-[650px]" 
            : isPsicologoPanel
              ? "bg-white overflow-visible sm:max-w-full sm:w-full md:max-w-[588px] md:w-[588px]" // 🎯 Fundo branco para psicólogo
              : "bg-[#F4F6FD] overflow-visible sm:max-w-full sm:w-full md:max-w-[588px] md:w-[588px]",
          "sm:h-[180px] min-h-[200px] sm:min-h-[180px]",
        )}>
          <CardContent className="p-4 sm:p-4 md:p-5 sm:h-full sm:flex sm:flex-col sm:justify-between overflow-visible min-w-0 max-w-full">
            {/* Mobile: Tag de status ou Badge (Hoje/Amanhã) - apenas uma tag por vez */}
            {badge ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={cn(
                  "absolute top-3 right-3 sm:hidden z-10",
                  BADGE_VARIANTS[badge.variant]
                )}
              >
                {badge.text}
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="absolute top-3 right-3 sm:hidden z-10"
              >
                <ConsultaStatusBadge
                  consulta={consulta}
                  showTimer={!supportOnly && !isPsicologoPanel} // 🎯 Remove timer/tag de contagem para psicólogo
                  forceStatus={statusOverride}
                  showLiveIndicator={!supportOnly && !isPsicologoPanel} // 🎯 Remove indicador ao vivo para psicólogo
                  useConsultasRestantesStyle={isPacientePanel}
                />
              </motion.div>
            )}

            {/* Mobile Layout */}
            <div className="flex flex-col sm:hidden gap-3 h-full overflow-visible pt-8">
              {/* Contador no mobile (se houver) - estilo consultas restantes com ícone de relógio */}
              {contadorSincronizado.mostrar && !supportOnly && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#E6E9FF] w-fit">
                  <ClockIcon className="w-4 h-4 text-[#8494E9] shrink-0" />
                  {contadorSincronizado.frase && (
                    <span className="text-[#232A5C] text-xs font-medium">
                      {contadorSincronizado.frase}
                    </span>
                  )}
                  {contadorSincronizado.tempo && (
                    <span className="text-[#8494E9] text-sm font-bold">
                      {contadorSincronizado.tempo}
                    </span>
                  )}
                </div>
              )}

              {/* Conteúdo do meio - Avatar e informações */}
              <div className="flex gap-3 sm:gap-4 items-start flex-1">
                {/* Avatar do psicólogo */}
                <div className="relative shrink-0 flex flex-col items-center gap-2">
                  <Image
                    src={fotoPsicologo}
                    alt={nomePsicologo || 'Psicólogo'}
                    className="w-14 h-14 rounded-full object-cover"
                    width={56}
                    height={56}
                    unoptimized={fotoPsicologo?.startsWith('http') || fotoPsicologo?.startsWith('data:')}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== '/assets/avatar-placeholder.svg') {
                        target.src = '/assets/avatar-placeholder.svg';
                      }
                    }}
                  />
                </div>

                {/* Informações */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0 pr-12">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                    <span className="text-[#232A5C] font-bold text-sm leading-tight break-words">
                      {nomePsicologo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                    <span className="text-[#49525A] text-xs">
                      {data} às {horario}
                    </span>
                  </div>
                  {/* Link Ver perfil */}
                  {psicologoId && (
                    <Link
                      href={`/painel/psicologo/${psicologoId}`}
                      className={cn(
                        "hover:underline text-xs font-medium mt-1",
                        isPacientePanel ? "text-[#7F75D3]" : "text-[#6D75C0]"
                      )}
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              </div>

              {/* Botões de ação no mobile: Ver detalhes à esquerda, Entrar à direita (lado a lado) */}
              <div className="flex flex-col gap-2 w-full overflow-visible mt-auto pb-0">
                {showPrimaryActions && actions?.onEntrar ? (
                  <div className="flex gap-2 w-full flex-wrap">
                    {/* Ver detalhes à esquerda (estilo ghost quando isPacientePanel) */}
                    <button
                      onClick={handleVerDetalhes}
                      className={cn(
                        "flex-1 min-w-0 h-[40px] font-medium text-xs rounded-lg px-3 transition whitespace-nowrap",
                        isPacientePanel
                          ? "bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0] cursor-pointer"
                          : "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer"
                      )}
                    >
                      Ver detalhes
                    </button>
                    <button
                      onClick={actions.onEntrar}
                      disabled={botaoEntrarDesabilitado || isLoadingEntry}
                      className={cn(
                        "flex-1 min-w-0 h-[40px] font-medium text-xs rounded-lg px-3 transition whitespace-nowrap",
                        isPacientePanel
                          ? (botaoEntrarDesabilitado || isLoadingEntry)
                            ? "bg-[#E0DEF7] text-[#A09EC7] cursor-not-allowed"
                            : "bg-[#7F75D3] text-white hover:bg-[#6B62B8] cursor-pointer"
                          : (botaoEntrarDesabilitado || isLoadingEntry)
                            ? "bg-[#D0D0D0] text-[#808080] cursor-not-allowed"
                            : "bg-[#232A5C] text-white hover:bg-[#232A5C]/90 cursor-pointer"
                      )}
                    >
                      {botaoEntrarDesabilitado || isLoadingEntry ? "Entrar na consulta" : "Entrar na consulta"}
                    </button>
                    {onAbrirCancelar && (
                      <button
                        onClick={() => onAbrirCancelar(consulta.Id)}
                        className="h-[40px] border border-red-400 text-red-500 font-medium text-xs rounded-lg px-3 transition hover:bg-red-50 whitespace-nowrap cursor-pointer shrink-0"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  showPrimaryActions && !mostrarBotaoSuporte && !isPsicologoPanel && (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleVerDetalhes}
                        className={cn(
                          "flex-1 min-w-0 h-[40px] font-medium text-xs rounded-lg px-3 transition whitespace-nowrap",
                          isPacientePanel
                            ? "bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0] cursor-pointer"
                            : "bg-[#8494E9] text-white hover:bg-[#6D75C0] cursor-pointer"
                        )}
                      >
                        Ver detalhes
                      </button>
                      <button
                        onClick={handleReagendar}
                        className={cn(
                          "flex-1 min-w-0 h-[40px] font-medium text-xs rounded-lg px-3 transition whitespace-nowrap cursor-pointer",
                          isPacientePanel
                            ? "bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0]"
                            : "border border-[#6D75C0] text-[#6D75C0] hover:bg-[#E6E9FF]"
                        )}
                      >
                        Reagendar
                      </button>
                    </div>
                  )
                )}

                {mostrarBotaoSuporte && actions?.onSuporte && (
                  <button
                    onClick={actions.onSuporte}
                    className="w-full h-[40px] bg-[#25D366] text-white font-medium text-xs rounded-lg px-3 transition hover:bg-[#128C7E] whitespace-nowrap cursor-pointer"
                  >
                    Fale com o Suporte
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Layout */}
            {isPacientePanel ? (
              /* Layout específico para painel do paciente - alinhamento horizontal */
              <div className="hidden sm:flex items-start justify-between w-full h-full gap-3 md:gap-4 overflow-visible">
                {/* Lado Esquerdo: Avatar + Informações */}
                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 min-w-0">
                  {/* Avatar do psicólogo */}
                  <div className="relative flex-shrink-0">
                    <Image
                      src={fotoPsicologo}
                      alt={nomePsicologo || 'Psicólogo'}
                      className="w-16 h-16 rounded-full object-cover"
                      width={64}
                      height={64}
                      unoptimized={fotoPsicologo?.startsWith('http') || fotoPsicologo?.startsWith('data:')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/assets/avatar-placeholder.svg') {
                          target.src = '/assets/avatar-placeholder.svg';
                        }
                      }}
                    />
                  </div>
                  
                  {/* Informações do psicólogo */}
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                      <span className="text-[#232A5C] font-bold text-base leading-tight">
                        {nomePsicologo}
                      </span>
                    </div>
                    {/* Data e hora lado a lado no formato "15/12/2025 às 16:40" */}
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                      <span className="text-[#49525A] text-sm">
                        {data} às {horario}
                      </span>
                    </div>
                    {/* Link Ver perfil */}
                    {psicologoId && (
                      <Link
                        href={`/painel/psicologo/${psicologoId}`}
                        className="hover:underline text-sm font-medium mt-1 text-[#7F75D3]"
                      >
                        Ver perfil
                      </Link>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Tag de status, contador e botões alinhados verticalmente */}
                <div className="flex flex-col flex-shrink-0 h-full justify-between items-end gap-2 overflow-visible pr-8 md:pr-[50px]">
                  {/* Tag de status - no topo */}
                  <div className="flex justify-end">
                    {badge ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold shadow",
                          BADGE_VARIANTS[badge.variant]
                        )}
                      >
                        {badge.text}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="flex justify-end w-full"
                      >
                        <ConsultaStatusBadge
                          consulta={consulta}
                          showTimer={!supportOnly}
                          forceStatus={statusOverride}
                          showLiveIndicator={!supportOnly}
                          useConsultasRestantesStyle={isPacientePanel}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Contador - no meio */}
                  {contador?.mostrar && (
                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-2 bg-[#E6E9FF] rounded-lg px-3 py-1.5 whitespace-nowrap">
                        <ClockIcon className="w-4 h-4 text-[#8494E9] shrink-0" />
                        {contador.frase && (
                          <span className="text-[#232A5C] text-sm font-medium">
                            {contador.frase}
                          </span>
                        )}
                        {contador.tempo && (
                          <span className="text-[#8494E9] text-base font-bold">
                            {contador.tempo}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botões - na parte inferior */}
                  <div className="flex items-center gap-2 flex-shrink-0 mt-auto">
                    {/* Ver detalhes primeiro */}
                    {showPrimaryActions && (
                      <button
                        onClick={handleVerDetalhes}
                        className="min-h-[44px] h-11 rounded-lg px-4 text-sm font-medium transition whitespace-nowrap bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0] cursor-pointer"
                      >
                        Ver detalhes
                      </button>
                    )}

                    {/* Entrar na consulta ou Reagendar */}
                    {showPrimaryActions && actions?.onEntrar ? (
                      <>
                        <button
                          onClick={actions.onEntrar}
                          disabled={botaoEntrarDesabilitado || isLoadingEntry}
                          className={cn(
                            "min-h-[44px] h-11 rounded-lg px-4 text-sm font-medium transition whitespace-nowrap",
                            (botaoEntrarDesabilitado || isLoadingEntry)
                              ? "bg-[#E0DEF7] text-[#A09EC7] cursor-not-allowed"
                              : "bg-[#7F75D3] text-white hover:bg-[#6B62B8] cursor-pointer"
                          )}
                        >
                          {botaoEntrarDesabilitado || isLoadingEntry ? "Entrar na consulta" : "Entrar na consulta"}
                        </button>
                        {onAbrirCancelar && (
                          <button
                            onClick={() => onAbrirCancelar(consulta.Id)}
                            className="min-h-[44px] h-11 border border-red-400 text-red-500 font-medium text-sm rounded-lg px-4 transition hover:bg-red-50 whitespace-nowrap cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </>
                    ) : (
                      showPrimaryActions && !mostrarBotaoSuporte && !isPsicologoPanel && (
                        <button
                          onClick={handleReagendar}
                          className="min-h-[40px] sm:min-h-[44px] h-10 sm:h-11 rounded-lg px-3 sm:px-4 text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0]"
                        >
                          Reagendar
                        </button>
                      )
                    )}

                    {mostrarBotaoSuporte && actions?.onSuporte && (
                      <button
                        onClick={actions.onSuporte}
                        className="min-h-[40px] sm:min-h-[44px] h-10 sm:h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium text-xs sm:text-sm rounded-lg px-3 transition cursor-pointer whitespace-nowrap"
                      >
                        Fale com o Suporte
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Layout padrão para outros painéis */
              <div className="hidden sm:flex gap-4 md:gap-6 items-start w-full h-full overflow-visible min-w-0">
                {/* Lado Esquerdo: Avatar + Informações */}
                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 min-w-0">
                  {/* Avatar do psicólogo */}
                  <div className="relative">
                    <Image
                      src={fotoPsicologo}
                      alt={nomePsicologo || 'Psicólogo'}
                      className="w-16 h-16 rounded-full object-cover"
                      width={64}
                      height={64}
                      unoptimized={fotoPsicologo?.startsWith('http') || fotoPsicologo?.startsWith('data:')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/assets/avatar-placeholder.svg') {
                          target.src = '/assets/avatar-placeholder.svg';
                        }
                      }}
                    />
                  </div>
                  
                  {/* Nome do psicólogo */}
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                      <span className="text-[#232A5C] font-bold text-base leading-tight">
                        {nomePsicologo}
                      </span>
                    </div>
                    {/* Data e hora lado a lado no formato "15/12/2025 às 16:40" */}
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                      <span className="text-[#49525A] text-sm">
                        {data} às {horario}
                      </span>
                    </div>
                    {/* Link Ver perfil */}
                    {psicologoId && (
                      <Link
                        href={`/painel/psicologo/${psicologoId}`}
                        className={cn(
                          "hover:underline text-sm font-medium mt-1",
                          isPacientePanel ? "text-[#7F75D3]" : "text-[#6D75C0]"
                        )}
                      >
                        Ver perfil
                      </Link>
                    )}
                  </div>
                </div>

                {/* Lado Direito: tags, contador e botões alinhados à direita */}
                <div className="flex flex-col flex-shrink-0 h-full justify-between overflow-visible items-end min-w-0 max-w-[45%]">
                  {/* Tags de status - alinhada à direita mas com margem à esquerda */}
                  <div className="flex flex-col items-end gap-1 w-full flex-shrink-0 pr-2">
                    {badge ? (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold shadow whitespace-nowrap",
                          BADGE_VARIANTS[badge.variant]
                        )}
                      >
                        {badge.text}
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="flex justify-end w-full flex-shrink-0"
                      >
                        <ConsultaStatusBadge
                          consulta={consulta}
                          showTimer={!supportOnly}
                          forceStatus={statusOverride}
                          showLiveIndicator={!supportOnly}
                          useConsultasRestantesStyle={isPacientePanel}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Contador - entre tags e botões */}
                  <div className="flex items-center justify-end min-h-[40px] my-auto w-full flex-shrink-0">
                    {contador?.mostrar ? (
                      <div className="flex items-center gap-2 bg-[#E6E9FF] rounded-lg px-2 md:px-3 py-1.5 whitespace-nowrap flex-shrink-0">
                        <ClockIcon className="w-4 h-4 text-[#8494E9] shrink-0" />
                        {contador.frase && (
                          <span className="text-[#232A5C] text-xs md:text-sm font-medium">
                            {contador.frase}
                          </span>
                        )}
                        {contador.tempo && (
                          <span className="text-[#8494E9] text-sm md:text-base font-bold">
                            {contador.tempo}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Botões: Ver detalhes à esquerda, Entrar à direita - alinhados à direita do card com margem */}
                  <div className="flex flex-row gap-2 md:gap-3 justify-end items-center flex-nowrap mt-auto w-full flex-shrink-0 pr-2 md:pr-3">
                    {/* Ver detalhes primeiro (esquerda) */}
                    {showPrimaryActions && (
                      <button
                        onClick={handleVerDetalhes}
                        className={cn(
                          "min-h-[44px] h-11 rounded-lg px-3 md:px-4 text-sm font-medium transition whitespace-nowrap flex-shrink-0",
                          isPacientePanel
                            ? "bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0] cursor-pointer"
                            : "bg-[#B7AFFF] text-[#5B3DF6] font-semibold hover:bg-[#7C5CFA] hover:text-white cursor-pointer shadow-md"
                        )}
                      >
                        Ver detalhes
                      </button>
                    )}

                    {/* Entrar na consulta (direita) ou Reagendar */}
                    {showPrimaryActions && actions?.onEntrar ? (
                      <>
                        <button
                          onClick={actions.onEntrar}
                          disabled={botaoEntrarDesabilitado || isLoadingEntry}
                          className={cn(
                            "min-h-[44px] h-11 rounded-lg px-3 md:px-4 text-sm font-medium transition whitespace-nowrap flex-shrink-0",
                            isPacientePanel
                              ? (botaoEntrarDesabilitado || isLoadingEntry)
                                ? "bg-[#E0DEF7] text-[#A09EC7] cursor-not-allowed"
                                : "bg-[#7F75D3] text-white hover:bg-[#6B62B8] cursor-pointer"
                              : (botaoEntrarDesabilitado || isLoadingEntry)
                                ? "bg-[#E0DEF7] text-[#A09EC7] cursor-not-allowed"
                                : "bg-[#7C5CFA] hover:bg-[#5B3DF6] text-white cursor-pointer shadow-md"
                          )}
                        >
                          {botaoEntrarDesabilitado || isLoadingEntry ? "Entrar na consulta" : "Entrar na consulta"}
                        </button>
                        {onAbrirCancelar && (
                          <button
                            onClick={() => onAbrirCancelar(consulta.Id)}
                            className="min-h-[44px] h-11 border border-red-400 text-red-500 font-medium text-sm rounded-lg px-3 md:px-4 transition hover:bg-red-50 whitespace-nowrap cursor-pointer flex-shrink-0"
                          >
                            Cancelar
                          </button>
                        )}
                      </>
                    ) : (
                      showPrimaryActions && !mostrarBotaoSuporte && !isPsicologoPanel && (
                        <button
                          onClick={handleReagendar}
                          className={cn(
                            "min-h-[44px] h-11 rounded-lg px-3 md:px-4 text-sm font-medium transition whitespace-nowrap cursor-pointer flex-shrink-0",
                            isPacientePanel
                              ? "bg-[#E8E7F8] text-[#7F75D3] border border-[#C4C0E5] hover:bg-[#DDDCF0]"
                              : "border border-[#6D75C0] text-[#6D75C0] rounded-[6px] hover:bg-[#E6E9FF] hover:text-[#232A5C]"
                          )}
                        >
                          Reagendar
                        </button>
                      )
                    )}

                    {mostrarBotaoSuporte && actions?.onSuporte && (
                      <button
                        onClick={actions.onSuporte}
                        className="min-h-[44px] h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium text-sm rounded-lg px-4 transition cursor-pointer whitespace-nowrap"
                      >
                        Fale com o Suporte
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
