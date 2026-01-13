import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Políticas e Termos | Estação Terapia',
  description: 'Consulte todos os documentos, políticas e termos da plataforma Estação Terapia',
};

interface PoliticasTermosLayoutProps {
  children: React.ReactNode;
}

export default function PoliticasTermosLayout({
  children,
}: PoliticasTermosLayoutProps): React.ReactElement {
  return <>{children}</>;
}

