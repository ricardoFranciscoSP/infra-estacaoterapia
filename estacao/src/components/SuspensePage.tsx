"use client";
import React, { Suspense, ReactNode } from 'react';
import { PainelLoadingSkeleton } from './PainelLoadingSkeleton';

interface SuspensePageProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeletonType?: 'default' | 'list' | 'form' | 'detail' | 'psicologo';
}

/**
 * ⚡ OTIMIZAÇÃO: Wrapper para aplicar Suspense com skeleton otimizado
 * Usa automaticamente o skeleton apropriado baseado no tipo de página
 */
export default function SuspensePage({ 
  children, 
  fallback,
  skeletonType = 'default' 
}: SuspensePageProps) {
  const getSkeleton = () => {
    if (fallback) return fallback;
    
    switch (skeletonType) {
      case 'list':
        return <PainelLoadingSkeleton />;
      case 'form':
        return <PainelLoadingSkeleton />;
      case 'detail':
        return <PainelLoadingSkeleton />;
      case 'psicologo':
        return <PainelLoadingSkeleton />;
      default:
        return <PainelLoadingSkeleton />;
    }
  };

  return (
    <Suspense fallback={getSkeleton()}>
      {children}
    </Suspense>
  );
}

