import React from 'react';
import type { Metadata, Viewport } from 'next';
import { CustomToastProvider } from '@/components/CustomToastProvider';
import '@/globals.css';
import PainelLayout from './PainelLayout';
import ThemeClientProvider from './ThemeClientProvider';

// Desabilita cache em áreas logadas
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Painel Financeiro | Estação Terapia',
  description: 'Plataforma de terapia online',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

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
