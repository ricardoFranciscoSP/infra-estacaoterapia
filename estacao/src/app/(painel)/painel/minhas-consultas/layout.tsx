import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minhas Consultas | Estação Terapia',
  description: 'Gerencie suas consultas',
};

export default function MinhasConsultasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
