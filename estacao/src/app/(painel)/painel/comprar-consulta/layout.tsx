import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comprar Consulta | Estação Terapia',
  description: 'Agende sua consulta',
};

export default function ComprarConsultaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
