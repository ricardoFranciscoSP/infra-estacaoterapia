import React from 'react';
import type { Metadata } from 'next';
import ReactQueryProvider from '@/app/ReactQueryProvider';

export const metadata: Metadata = {
  title: 'Sem Permissão | Estação Terapia',
  description: 'Acesso negado',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}