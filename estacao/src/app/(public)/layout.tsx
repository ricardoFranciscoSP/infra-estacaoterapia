import type { Metadata } from 'next';
import ClientPublicHeader from './ClientPublicHeader';

export const metadata: Metadata = {
  title: 'Estação Terapia - Terapia online com Psicólogos especializados',
  description: 'Plataforma de terapia online que conecta você com psicólogos especializados para cuidar da sua saúde mental de forma prática e acessível.',
};

import Footer from '@/components/Footer';
import ClientPublicLayout from './ClientPublicLayout';
import PublicProviders from '@/provider/PublicProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PublicProviders>
      <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden" style={{ margin: 0, padding: 0, gap: 0 }}>
        <ClientPublicHeader />
        <ClientPublicLayout>
          <main className="flex-1 w-full max-w-full overflow-x-hidden" style={{ margin: 0, padding: 0 }} role="main">
            {children}
          </main>
        </ClientPublicLayout>
        <Footer />
      </div>
    </PublicProviders>
  );
}
