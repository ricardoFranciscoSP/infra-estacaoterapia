import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Estação Terapia',
  description: 'Plataforma de terapia online',
};

import '@/globals.css';
import HeaderSkeleton from '@/components/HeaderSkeleton';
import Footer from '@/components/Footer';
import ClientPublicLayout from './ClientPublicLayout';

// ⚡ OTIMIZAÇÃO: Dynamic import do Header com loading skeleton
// Isso garante que o Header não bloqueie a renderização inicial
const Header = dynamic(() => import('@/components/Header'), {
  loading: () => <HeaderSkeleton />,
  ssr: true, // Mantém SSR para SEO e primeira renderização
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden" style={{ margin: 0, padding: 0, gap: 0 }}>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <ClientPublicLayout>
        <main className="flex-1 w-full max-w-full overflow-x-hidden" style={{ margin: 0, padding: 0 }} role="main">
          {children}
        </main>
      </ClientPublicLayout>
      <Footer />
    </div>
  );
}
