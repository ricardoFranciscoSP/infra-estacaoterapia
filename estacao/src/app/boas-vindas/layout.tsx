import type { Metadata } from 'next';
import PublicProviders from '@/provider/PublicProviders';

// Desabilita cache em áreas logadas (onboarding é parte do fluxo logado)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Boas-vindas | Estação Terapia',
  description: 'Plataforma de terapia online',
};

export default function BoasVindasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <PublicProviders>{children}</PublicProviders>
  )
}
