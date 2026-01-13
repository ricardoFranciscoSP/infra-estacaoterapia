import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planos | Estação Terapia',
  description: 'Escolha seu plano',
};

export default function PlanosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
