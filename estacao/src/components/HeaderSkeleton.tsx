"use client";
import React from 'react';

/**
 * Skeleton do Header para exibir enquanto o Header real carrega
 * ⚡ OTIMIZAÇÃO: Dimensões exatas do Header real para evitar CLS (Cumulative Layout Shift)
 * Garante que o layout não "pule" quando o Header é carregado
 */
export default function HeaderSkeleton() {
  return (
    <header 
      className="bg-[#fcfbf6] w-full sticky top-0 z-50 border-b border-[#E3E6E8] sticky-header"
      style={{ margin: 0, padding: 0 }}
      aria-label="Carregando header"
    >
      <div className="w-full max-w-[1300px] mx-auto flex items-center px-4 lg:flex-row flex-col lg:justify-start justify-between" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
        {/* Mobile Skeleton - Dimensões exatas do Header mobile */}
        <div className="flex w-full items-center justify-between lg:hidden">
          {/* Logo Skeleton - 100x35 como no Header */}
          <div className="w-[100px] h-[35px] bg-[#E6E9FF] rounded animate-pulse" style={{ minWidth: 100, minHeight: 35 }} />
          {/* Botões Skeleton */}
          <div className="flex items-center gap-1.5">
            <div className="w-[80px] h-[32px] bg-[#E6E9FF] rounded-[6px] animate-pulse" style={{ minWidth: 80, minHeight: 32 }} />
            <div className="w-[60px] h-[32px] bg-[#E6E9FF] rounded-[6px] animate-pulse" style={{ minWidth: 60, minHeight: 32 }} />
            <div className="w-6 h-6 bg-[#E6E9FF] rounded animate-pulse" />
          </div>
        </div>
        
        {/* Desktop Skeleton - Dimensões exatas do Header desktop */}
        <div className="hidden lg:flex w-full items-center justify-between">
          {/* Logo Skeleton - 190x64 como no Header */}
          <div className="w-[190px] h-[64px] bg-[#E6E9FF] rounded animate-pulse min-w-[180px]" style={{ minHeight: 64 }} />
          {/* Nav Links Skeleton */}
          <nav className="flex gap-3 xl:gap-5 2xl:gap-6 ml-8 flex-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-6 bg-[#E6E9FF] rounded-md animate-pulse" style={{ width: i === 1 ? 120 : i === 2 ? 110 : i === 3 ? 140 : i === 4 ? 120 : i === 5 ? 70 : 60, minHeight: 24 }} />
            ))}
          </nav>
          {/* Botões Skeleton - 133x40 como no Header */}
          <div className="flex gap-[16px] min-w-[280px] justify-end">
            <div className="w-[133px] h-[40px] bg-[#E6E9FF] rounded-[6px] animate-pulse" style={{ minWidth: 133, minHeight: 40 }} />
            <div className="w-[133px] h-[40px] bg-[#E6E9FF] rounded-[6px] animate-pulse" style={{ minWidth: 133, minHeight: 40 }} />
          </div>
        </div>
      </div>
    </header>
  );
}

