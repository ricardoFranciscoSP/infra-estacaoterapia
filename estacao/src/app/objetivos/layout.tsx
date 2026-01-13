import React from 'react';
import type { Metadata } from 'next';
import { CustomToastProvider } from '@/components/CustomToastProvider';

// Desabilita cache em áreas logadas (onboarding é parte do fluxo logado)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
 
export const metadata: Metadata = {
  title: 'Objetivos | Estação Terapia',
  description: 'Plataforma de terapia online',
};


import '@/globals.css';
const ObjetivosLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          <CustomToastProvider />
        </div>
  );
};

export default ObjetivosLayout;