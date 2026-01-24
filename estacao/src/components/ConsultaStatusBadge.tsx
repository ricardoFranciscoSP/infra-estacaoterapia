'use client';

import React from 'react';
import { useConsultaStatusRealTime } from '@/hooks/useConsultaStatusRealTime';
import { ConsultaApi } from '@/types/consultasTypes';
import { getStatusTagInfo } from '@/utils/statusConsulta.util';

interface ConsultaStatusBadgeProps {
  consulta: ConsultaApi | null;
  className?: string;
  showTimer?: boolean;
  forceStatus?: string;
  showLiveIndicator?: boolean;
  /** Usa o mesmo estilo da tag "Consultas restantes" (bg #CFD6F7, text #444D9D) */
  useConsultasRestantesStyle?: boolean;
}

/**
 * Badge de status que se atualiza em tempo real
 * Mostra "Em Andamento" automaticamente durante o horário da consulta
 * Mostra "Cancelada" se foi cancelada
 */
export function ConsultaStatusBadge({ 
  consulta, 
  className = '',
  showTimer = false,
  forceStatus,
  showLiveIndicator = true,
  useConsultasRestantesStyle = false,
}: ConsultaStatusBadgeProps) {
  const { statusTagInfo, tempoRestante, emAndamento } = useConsultaStatusRealTime(consulta);
  const isForced = Boolean(forceStatus);
  const finalStatusTag = isForced ? getStatusTagInfo(forceStatus as string) : statusTagInfo;
  const tagClasses = useConsultasRestantesStyle
    ? 'px-3 py-1 rounded-full text-xs font-semibold bg-[#CFD6F7] text-[#444D9D] shadow'
    : `px-3 py-1 rounded-full text-xs font-semibold ${finalStatusTag.bg} ${finalStatusTag.text} shadow`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={tagClasses}>
        {finalStatusTag.texto}
      </span>
      
      {/* Timer de duração da consulta */}
      {!isForced && emAndamento && showTimer && tempoRestante && (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 animate-pulse">
          ⏱️ {tempoRestante}
        </span>
      )}

      {/* Indicador pulsante para em andamento */}
      {!isForced && showLiveIndicator && emAndamento && (
        <div className="flex items-center gap-1">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-green-600 font-medium">Ao vivo</span>
        </div>
      )}
    </div>
  );
}

export default ConsultaStatusBadge;
