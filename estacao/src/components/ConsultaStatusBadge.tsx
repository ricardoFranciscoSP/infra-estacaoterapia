'use client';

import React from 'react';
import { useConsultaStatusRealTime } from '@/hooks/useConsultaStatusRealTime';
import { ConsultaApi } from '@/types/consultasTypes';

interface ConsultaStatusBadgeProps {
  consulta: ConsultaApi | null;
  className?: string;
  showTimer?: boolean;
}

/**
 * Badge de status que se atualiza em tempo real
 * Mostra "Em Andamento" automaticamente durante o horário da consulta
 * Mostra "Cancelada" se foi cancelada
 */
export function ConsultaStatusBadge({ 
  consulta, 
  className = '',
  showTimer = false 
}: ConsultaStatusBadgeProps) {
  const { statusTagInfo, tempoRestante, emAndamento } = useConsultaStatusRealTime(consulta);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span 
        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTagInfo.bg} ${statusTagInfo.text} shadow`}
      >
        {statusTagInfo.texto}
      </span>
      
      {/* Timer de duração da consulta */}
      {emAndamento && showTimer && tempoRestante && (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 animate-pulse">
          ⏱️ {tempoRestante}
        </span>
      )}

      {/* Indicador pulsante para em andamento */}
      {emAndamento && (
        <div className="flex items-center gap-1">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-green-600 font-medium">Ao vivo</span>
        </div>
      )}
    </div>
  );
}

export default ConsultaStatusBadge;
