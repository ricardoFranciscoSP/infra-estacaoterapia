"use client";
import React, { useEffect } from 'react';

interface ContadorSessaoProps {
  duracao: number; // em segundos (progressivo)
  tempoRestante: number; // em segundos (regressivo)
}

export default function ContadorSessao({ duracao, tempoRestante }: ContadorSessaoProps) {
  // Formatar duração (progressivo)
  const formatDuration = (seconds: number) => {
    // Garante que o valor seja não-negativo
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  
  // Debug: log para verificar valores recebidos (apenas quando mudar significativamente)
  useEffect(() => {
    console.log('[ContadorSessao] ===== TIMER RENDERIZADO =====');
    console.log('  - Duração recebida:', duracao, 'segundos');
    console.log('  - Duração formatada:', formatDuration(duracao));
    console.log('  - Tempo restante:', tempoRestante, 'segundos');
    console.log('==========================================');
  }, [duracao, tempoRestante]);

  // Formatar tempo restante (regressivo)
  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Determinar cor do tempo restante baseado no valor
  const getTimeRemainingColor = () => {
    if (tempoRestante <= 300) { // 5 minutos
      return 'text-red-400';
    } else if (tempoRestante <= 600) { // 10 minutos
      return 'text-orange-400';
    } else if (tempoRestante <= 900) { // 15 minutos
      return 'text-yellow-400';
    }
    return 'text-white';
  };

  const getTimeRemainingBg = () => {
    if (tempoRestante <= 300) {
      return 'bg-red-500/20 border-red-500/50';
    } else if (tempoRestante <= 600) {
      return 'bg-orange-500/20 border-orange-500/50';
    } else if (tempoRestante <= 900) {
      return 'bg-yellow-500/20 border-yellow-500/50';
    }
    return 'bg-white/10 border-white/20';
  };

  return (
    <div className="absolute top-[50px] left-1/2 transform -translate-x-1/2 z-20 flex flex-row gap-1 sm:gap-1.5 md:gap-2 max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] px-1">
      {/* Contador de duração (progressivo) - sempre visível - otimizado para mobile */}
      <div className="bg-black/95 backdrop-blur-md text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg shadow-2xl border border-white/10 flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-[85px] sm:min-w-[100px] md:min-w-[120px] lg:min-w-[140px] flex-shrink-0">
        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-white/10 flex-shrink-0">
          <svg 
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] lg:w-5 lg:h-5 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] sm:text-[9px] md:text-[10px] text-white/70 uppercase tracking-wider font-medium leading-tight">Duração</span>
          <span className="text-xs sm:text-sm md:text-base lg:text-lg font-bold font-mono text-white leading-tight">{formatDuration(duracao)}</span>
        </div>
      </div>

      {/* Contador regressivo (tempo restante) - SEMPRE visível - otimizado para mobile */}
      <div className={`${getTimeRemainingBg()} backdrop-blur-md text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg shadow-2xl border flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-[85px] sm:min-w-[100px] md:min-w-[120px] lg:min-w-[140px] flex-shrink-0 transition-all duration-300 ${
        tempoRestante <= 300 && tempoRestante > 0 ? 'animate-pulse' : ''
      }`}>
        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-white/10 flex-shrink-0">
          <svg 
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] lg:w-5 lg:h-5 ${getTimeRemainingColor()}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" 
            />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] sm:text-[9px] md:text-[10px] text-white/70 uppercase tracking-wider font-medium leading-tight">Restante</span>
          <span className={`text-xs sm:text-sm md:text-base lg:text-lg font-bold font-mono ${getTimeRemainingColor()} leading-tight`}>
            {formatTimeRemaining(Math.max(0, tempoRestante))}
          </span>
        </div>
      </div>
    </div>
  );
}

