import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Minha Agenda | Estação Terapia',
  description: 'Visualize e configure sua agenda',
};

export default function AgendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
