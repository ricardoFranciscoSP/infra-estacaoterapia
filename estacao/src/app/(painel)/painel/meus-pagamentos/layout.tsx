import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meus Pagamentos | Estação Terapia',
  description: 'Acompanhe seus pagamentos',
};

export default function MeusPagamentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
