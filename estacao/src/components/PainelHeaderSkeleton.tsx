"use client";
import React from 'react';

interface PainelHeaderSkeletonProps {
  isPainelPsicologo?: boolean;
}

/**
 * Skeleton do PainelHeader para exibir enquanto o PainelHeader real carrega
 * ⚡ OTIMIZAÇÃO: Dimensões exatas do PainelHeader real para evitar CLS
 * Suporta tanto painel de paciente quanto psicólogo
 */
export default function PainelHeaderSkeleton({ isPainelPsicologo = false }: PainelHeaderSkeletonProps) {
  const bgColor = isPainelPsicologo ? "bg-[#8494E9]" : "bg-white";
  const textColor = isPainelPsicologo ? "text-white" : "";
  const skeletonColor = isPainelPsicologo ? "bg-white/20" : "bg-gray-200";

  return (
    <header 
      className={`w-full shadow-sm sticky top-0 z-50 sticky-header ${bgColor}`}
      aria-label="Carregando header do painel"
    >
      <div className={`${isPainelPsicologo ? "w-full md:max-w-[1200px] md:mx-auto" : "max-w-7xl mx-auto"} ${isPainelPsicologo ? "px-4 md:pl-8 md:pr-6" : "px-4 md:px-6"} flex flex-row flex-nowrap items-center justify-between gap-3 ${isPainelPsicologo ? "py-2.5 md:py-3" : "py-3"} ${textColor}`}>
        {/* Logo e Menu Hambúrguer - ESQUERDA */}
        <div className="flex items-center shrink-0">
          {/* Menu hambúrguer skeleton - Mobile */}
          <div className="md:hidden flex items-center mr-3">
            <div className={`w-10 h-10 ${skeletonColor} rounded animate-pulse`} />
          </div>
          {/* Logo skeleton */}
          <div className={`w-32 h-8 ${skeletonColor} rounded animate-pulse`} style={{ minWidth: 128, minHeight: 32 }} />
        </div>

        {/* Navegação - CENTRO (Desktop) */}
        {isPainelPsicologo && (
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-6 ${skeletonColor} rounded-lg animate-pulse`} style={{ width: i === 1 ? 50 : i === 2 ? 70 : i === 3 ? 100 : 80, minHeight: 24 }} />
            ))}
          </div>
        )}

        {/* Notificações e Avatar - DIREITA */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notificação skeleton */}
          <div className={`w-10 h-10 ${skeletonColor} rounded-full animate-pulse`} />
          {/* Avatar skeleton */}
          <div className={`w-10 h-10 md:w-12 md:h-12 ${skeletonColor} rounded-full animate-pulse`} style={{ minWidth: 40, minHeight: 40 }} />
          {/* Seta skeleton */}
          <div className={`w-4 h-4 ${skeletonColor} rounded animate-pulse ml-2`} style={{ minHeight: 32 }} />
        </div>
      </div>
    </header>
  );
}

