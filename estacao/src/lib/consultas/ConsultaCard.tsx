'use client';

import React, { useState } from 'react';
import { ConsultaApi } from '@/types/consultasTypes';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { getAvatarUrl } from '@/utils/avatarUtils';
import { formatDateBR, formatTimeBR } from '@/utils/formatarDataHora';
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
  supportOnly?: boolean;
  statusOverride?: string;
}

const BADGE_VARIANTS = {
  hoje: 'bg-[#E6E9FF] text-[#6D75C0]',
  amanha: 'bg-[#E6E9FF] text-[#6D75C0]',
  info: 'bg-[#E6E9FF] text-[#6D75C0]',
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
          "relative w-full max-w-full rounded-xl shadow-sm border-0",
          "transition-all duration-300 hover:shadow-md mb-6",
          isPsicologoPanel ? "bg-[#fff] sm:max-w-[588px] sm:w-[588px]" : "bg-[#E5E9FA] sm:max-w-[588px] sm:w-[588px]",
          isPsicologoPanel ? "sm:h-[180px]" : "sm:h-[160px]",
          contador?.mostrar 
            ? (isPsicologoPanel ? "min-h-[200px] sm:min-h-[180px]" : "min-h-[200px] sm:min-h-[160px]")
            : (isPsicologoPanel ? "min-h-[180px] sm:min-h-[180px]" : "min-h-[180px] sm:min-h-[160px]")
        )}>
          <CardContent className="p-4 sm:p-5 sm:h-full sm:flex sm:flex-col sm:justify-between">
            {/* Mobile: Tag de status ou Badge (Hoje/Amanhã) - apenas uma tag por vez */}
            {badge ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={cn(
                  "absolute top-4 right-4 sm:hidden z-10",
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
                className="absolute top-4 right-4 sm:hidden z-10"
              >
                <ConsultaStatusBadge
                  consulta={consulta}
                  showTimer={!supportOnly}
                  forceStatus={statusOverride}
                  showLiveIndicator={!supportOnly}
                />
              </motion.div>
            )}

            {/* Mobile Layout */}
            <div className="flex flex-col sm:hidden gap-4 h-full">
              {/* Contador no mobile (se houver) - estilo consultas restantes com ícone de relógio */}
              {contador?.mostrar && !supportOnly && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[#E6E9FF] w-fit mt-2">
                  <ClockIcon className="w-4 h-4 text-[#8494E9] shrink-0" />
                  {contador.frase && (
                    <span className="text-[#232A5C] text-xs font-medium">
                      {contador.frase}
                    </span>
                  )}
                  {contador.tempo && (
                    <span className="text-[#8494E9] text-sm font-bold">
                      {contador.tempo}
                    </span>
                  )}
                </div>
              )}

              {/* Conteúdo do meio - Avatar e informações */}
              <div className="flex gap-4 items-start flex-1">
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
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#6D75C0] shrink-0" />
                    <span className="text-[#232A5C] font-bold text-sm leading-tight">
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
                      className="text-[#6D75C0] hover:underline text-xs font-medium mt-1"
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              </div>

              {/* Botões de ação no mobile */}
              <div className="flex flex-col gap-2 w-full">
                {/* Botões condicionais: Acessar consulta ou Reagendar - aparece primeiro */}
                {showPrimaryActions && actions?.onEntrar ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={actions.onEntrar}
                      disabled={botaoEntrarDesabilitado || isLoadingEntry}
                      className={cn(
                        "flex-1 h-[40px] font-medium text-xs rounded-[6px] px-3 transition whitespace-nowrap",
                        (botaoEntrarDesabilitado || isLoadingEntry)
                          ? "bg-[#D0D0D0] text-[#808080] cursor-not-allowed"
                          : "bg-[#232A5C] text-white hover:bg-[#232A5C]/90 cursor-pointer"
                      )}
                    >
                      {botaoEntrarDesabilitado || isLoadingEntry ? "Entrar na consulta" : "Entrar na consulta"}
                    </button>
                    {/* Botão Cancelar - lado a lado com Entrar na consulta */}
                    {onAbrirCancelar && (
                      <button
                        onClick={() => onAbrirCancelar(consulta.Id)}
                        className="h-[40px] border border-red-400 text-red-500 font-medium text-xs rounded-[6px] px-3 transition hover:bg-red-50 whitespace-nowrap cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ) : (
                  /* Botão Reagendar - aparece primeiro, oculto quando o botão de suporte está visível ou se for painel do psicólogo */
                  showPrimaryActions && !mostrarBotaoSuporte && !isPsicologoPanel && (
                    <button
                      onClick={handleReagendar}
                      className="w-full h-[40px] border border-[#6D75C0] text-[#6D75C0] font-medium text-xs rounded-[6px] px-3 transition hover:bg-[#E6E9FF] whitespace-nowrap cursor-pointer"
                    >
                      Reagendar
                    </button>
                  )
                )}

                {/* Fale com o Suporte aparece abaixo de Reagendar */}
                {mostrarBotaoSuporte && actions?.onSuporte && (
                  <button
                    onClick={actions.onSuporte}
                    className="w-full h-[40px] bg-[#25D366] text-white font-medium text-xs rounded-[6px] px-3 transition hover:bg-[#128C7E] whitespace-nowrap cursor-pointer"
                  >
                    Fale com o Suporte
                  </button>
                )}

                {/* Ver detalhes aparece por último */}
                {showPrimaryActions && (
                  <button
                    onClick={handleVerDetalhes}
                    className="w-full h-[40px] bg-[#8494E9] text-white font-medium text-xs rounded-[6px] px-3 transition hover:bg-[#6D75C0] whitespace-nowrap cursor-pointer"
                  >
                    Ver detalhes
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex gap-6 items-start w-full h-full">
              {/* Lado Esquerdo: Avatar + Informações */}
              <div className="flex items-center gap-4 flex-shrink-0">
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
                      className="text-[#6D75C0] hover:underline text-sm font-medium mt-1"
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              </div>

              {/* Lado Direito: Container flexível para tags no topo, contador no meio e botões na base */}
              <div className="flex flex-col flex-1 h-full justify-between">
                {/* Tags de status - no topo */}
                <div className="flex flex-col items-end gap-2">
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
                    >
                    <ConsultaStatusBadge
                      consulta={consulta}
                      showTimer={!supportOnly}
                      forceStatus={statusOverride}
                      showLiveIndicator={!supportOnly}
                    />
                    </motion.div>
                  )}
                </div>

                {/* Contador - no meio, entre tags e botões - sempre reserva espaço */}
                <div className="flex items-center justify-end min-h-[40px] my-auto">
                  {contador?.mostrar ? (
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
                  ) : null}
                </div>

                {/* Botões de ação - fixos na parte inferior do card, alinhados à direita */}
                <div className="flex flex-row gap-3 justify-end">
                  {/* Botões condicionais: Acessar consulta ou Reagendar */}
                  {showPrimaryActions && actions?.onEntrar ? (
                    <>
                      <button
                        onClick={actions.onEntrar}
                        disabled={botaoEntrarDesabilitado || isLoadingEntry}
                        className={cn(
                          "min-h-[44px] h-11 rounded-[6px] px-4 text-sm font-medium transition whitespace-nowrap",
                          (botaoEntrarDesabilitado || isLoadingEntry)
                            ? "bg-[#D0D0D0] text-[#808080] cursor-not-allowed"
                            : "bg-[#232A5C] hover:bg-[#232A5C]/90 text-white cursor-pointer"
                        )}
                      >
                        {botaoEntrarDesabilitado || isLoadingEntry ? "Entrar na consulta" : "Entrar na consulta"}
                      </button>
                      {/* Botão Cancelar - lado a lado com Entrar na consulta */}
                      {onAbrirCancelar && (
                        <button
                          onClick={() => onAbrirCancelar(consulta.Id)}
                          className="min-h-[44px] h-11 border border-red-400 text-red-500 font-medium text-sm rounded-[6px] px-4 transition hover:bg-red-50 whitespace-nowrap cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </>
                  ) : (
                    /* Botão Reagendar - à esquerda, oculto se for painel do psicólogo */
                    showPrimaryActions && !mostrarBotaoSuporte && !isPsicologoPanel && (
                      <button
                        onClick={handleReagendar}
                        className="min-h-[44px] h-11 border border-[#6D75C0] text-[#6D75C0] font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#E6E9FF] hover:text-[#232A5C] whitespace-nowrap cursor-pointer"
                      >
                        Reagendar
                      </button>
                    )
                  )}

                  {/* Ver detalhes - à direita */}
                  {showPrimaryActions && (
                    <button
                      onClick={handleVerDetalhes}
                      className="min-h-[44px] h-11 bg-[#8494E9] text-white font-medium text-sm rounded-[6px] px-4 transition hover:bg-[#6D75C0] hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      Ver detalhes
                    </button>
                  )}

                  {/* Fale com o Suporte - aparece ao lado se necessário */}
                  {mostrarBotaoSuporte && actions?.onSuporte && (
                    <button
                      onClick={actions.onSuporte}
                      className="min-h-[44px] h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold text-sm rounded-[6px] px-4 transition cursor-pointer whitespace-nowrap"
                    >
                      Fale com o Suporte
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
