import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Solicitações | Estação Terapia',
  description: 'Gerencie suas solicitações',
};

export default function SolicitacoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
