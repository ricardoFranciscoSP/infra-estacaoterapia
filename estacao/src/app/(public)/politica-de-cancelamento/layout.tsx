import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cancelamento | Estação Terapia',
  description: 'Nossa política de cancelamento',
};

export default function PoliticaCancelamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
