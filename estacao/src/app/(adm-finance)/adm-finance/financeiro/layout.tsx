import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financeiro | Painel Administrativo | Estação Terapia',
  description: 'Gerencie as finanças da plataforma',
};

export default function FinanceiroAdmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
