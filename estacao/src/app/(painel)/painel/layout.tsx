import React from 'react';
import type { Metadata } from 'next';

// Desabilita cache em áreas logadas
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Painel Paciente | Estação Terapia',
  description: 'Plataforma de terapia online',
};

import ClientPainelLayout from './ClientPainelLayout';  

const PainelLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  return (
    <ClientPainelLayout>{children}</ClientPainelLayout>
  );
};

export default PainelLayout;