import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Consultas | Estação Terapia',
  description: 'Gerencie suas consultas',
};

export default function ConsultasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
