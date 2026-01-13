import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financeiro | Estação Terapia',
  description: 'Acompanhe seus ganhos e pagamentos',
};

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
