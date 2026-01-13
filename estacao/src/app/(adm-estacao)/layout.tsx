import React from 'react';
import type { Metadata } from 'next';
import { CustomToastProvider } from '@/components/CustomToastProvider';

// Desabilita cache em áreas logadas
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Painel Administrativo | Estação Terapia',
  description: 'Plataforma de terapia online',
};

import '@/globals.css';
import PainelLayout from './PainelLayout';
import ThemeClientProvider from './ThemeClientProvider';

const RootDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeClientProvider>
      <PainelLayout>
        {children}
      </PainelLayout>
      <CustomToastProvider />
    </ThemeClientProvider>
  );
};

export default RootDashboardLayout;