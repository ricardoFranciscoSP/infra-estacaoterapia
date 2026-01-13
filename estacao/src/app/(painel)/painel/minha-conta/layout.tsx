import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minha Conta | Estação Terapia',
  description: 'Gerencie sua conta',
};

export default function MinhaContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
